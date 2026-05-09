import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_MAX_RESULTS,
  fetchDatasetItems,
  getRunProgress,
  getRunStatus,
  mapApifyItemToLead,
} from "@/lib/apify";
import { categoryMatchesSlug, normalizeCategory } from "@/lib/categories";
import type { Lead, Search } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: search, error } = await supabase
    .from("searches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !search) {
    return NextResponse.json(
      { error: error?.message ?? "not found" },
      { status: 404 },
    );
  }

  let current = search as Search;
  let progress: { found: number; target: number } | null = null;

  // If still running, ask Apify and finalize when done
  if (current.status === "running" && current.apify_run_id) {
    const { status: runStatus, itemCount } = await getRunProgress(
      current.apify_run_id,
    );
    if (
      runStatus === "SUCCEEDED" ||
      runStatus === "FAILED" ||
      runStatus === "ABORTED" ||
      runStatus === "TIMED-OUT"
    ) {
      const finalized = await maybeFinalize(current);
      if (finalized) current = finalized;
    } else {
      progress = { found: itemCount, target: DEFAULT_MAX_RESULTS };
    }
  }

  const { data: linkRows } = await supabase
    .from("search_leads")
    .select("place_id")
    .eq("search_id", id);

  const placeIds = (linkRows ?? []).map((r) => r.place_id);
  let leads: Lead[] = [];
  if (placeIds.length > 0) {
    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .in("place_id", placeIds);
    leads = (leadData ?? []) as Lead[];
  }

  return NextResponse.json({ search: current, leads, progress });
}

async function maybeFinalize(search: Search): Promise<Search | null> {
  if (!search.apify_run_id) return null;
  const admin = createSupabaseAdminClient();

  try {
    const { status, defaultDatasetId } = await getRunStatus(
      search.apify_run_id,
    );

    if (
      status === "FAILED" ||
      status === "ABORTED" ||
      status === "TIMED-OUT"
    ) {
      await admin
        .from("searches")
        .update({
          status: "failed",
          error_message: `Apify run ${status}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", search.id);
      return { ...search, status: "failed", error_message: `Apify run ${status}` };
    }

    if (status !== "SUCCEEDED" || !defaultDatasetId) {
      return null; // still running
    }

    // Fetch items, upsert leads, link via search_leads
    const rawItems = await fetchDatasetItems(defaultDatasetId);

    // Google Maps mixes unrelated places into search results (e.g. supermarkets
    // when searching for restaurants). If the user's category maps to a known
    // slug, drop items whose categories don't match. Free-form categories that
    // don't normalize to any slug are left unfiltered.
    const targetSlug = normalizeCategory(search.category);
    const filteredItems = targetSlug
      ? rawItems.filter((raw) => {
          const it = raw as { categoryName?: string; categories?: string[] };
          const cats = [it.categoryName, ...(it.categories ?? [])];
          return categoryMatchesSlug(cats, targetSlug);
        })
      : rawItems;

    console.log(
      `[searches/${search.id}] category="${search.category}" slug=${targetSlug ?? "(none)"} ` +
        `apify=${rawItems.length} kept=${filteredItems.length} dropped=${rawItems.length - filteredItems.length}`,
    );

    const leads = filteredItems
      .map((it) => mapApifyItemToLead(it, search.city, search.province))
      .filter((l): l is Lead => l != null);

    if (leads.length > 0) {
      const { error: upsertErr } = await admin
        .from("leads")
        .upsert(leads, { onConflict: "place_id" });
      if (upsertErr) throw upsertErr;

      await admin
        .from("search_leads")
        .upsert(
          leads.map((l) => ({ search_id: search.id, place_id: l.place_id })),
          { onConflict: "search_id,place_id" },
        );
    }

    const { data: updated } = await admin
      .from("searches")
      .update({
        status: "completed",
        total_results: leads.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", search.id)
      .select()
      .single();

    return (updated as Search) ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "polling error";
    await admin
      .from("searches")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", search.id);
    return { ...search, status: "failed", error_message: message };
  }
}

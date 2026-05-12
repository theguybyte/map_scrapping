import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Lead, LeadSearchSource, LeadWithSources } from "@/lib/types";

interface RawLeadWithRelations extends Lead {
  search_leads: Array<{
    searches: {
      id: string;
      city: string;
      category: string;
      created_at: string;
    } | null;
  }> | null;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const province = url.searchParams.get("province");
  const category = url.searchParams.get("category");
  const minRating = url.searchParams.get("minRating");
  const q = url.searchParams.get("q");
  const city = url.searchParams.get("city");
  const origins = url.searchParams
    .getAll("origins")
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Resolve origins → place_ids via the search_leads join. We pre-fetch the
  // matching place_ids so the main /select keeps returning the full
  // search_leads list (used to build `sources`) instead of being filtered
  // down by an !inner join.
  let originPlaceIds: string[] | null = null;
  if (origins.length > 0) {
    const { data: matches, error: matchErr } = await supabase
      .from("search_leads")
      .select("place_id, searches!inner(category)")
      .in("searches.category", origins);
    if (matchErr) {
      return NextResponse.json({ error: matchErr.message }, { status: 500 });
    }
    const ids = new Set<string>();
    for (const row of (matches ?? []) as Array<{ place_id: string }>) {
      if (row.place_id) ids.add(row.place_id);
    }
    originPlaceIds = Array.from(ids);
    if (originPlaceIds.length === 0) {
      return NextResponse.json({
        leads: [],
        filteredTotal: 0,
        stats: {
          total: 0,
          withWebsite: 0,
          withPhone: 0,
          totalSearches: 0,
        },
      });
    }
  }

  let mainQuery = supabase
    .from("leads")
    .select(
      "*, search_leads(searches(id, city, category, created_at))",
    )
    .order("last_scraped_at", { ascending: false });
  if (province) mainQuery = mainQuery.eq("province", province);
  if (category) mainQuery = mainQuery.eq("category_id", category);
  if (minRating) mainQuery = mainQuery.gte("rating", Number(minRating));
  if (q) mainQuery = mainQuery.ilike("name", `%${q}%`);
  if (city) mainQuery = mainQuery.ilike("city", `%${city}%`);
  if (originPlaceIds) mainQuery = mainQuery.in("place_id", originPlaceIds);

  let countQuery = supabase
    .from("leads")
    .select("place_id", { count: "exact", head: true });
  if (province) countQuery = countQuery.eq("province", province);
  if (category) countQuery = countQuery.eq("category_id", category);
  if (minRating) countQuery = countQuery.gte("rating", Number(minRating));
  if (q) countQuery = countQuery.ilike("name", `%${q}%`);
  if (city) countQuery = countQuery.ilike("city", `%${city}%`);
  if (originPlaceIds) countQuery = countQuery.in("place_id", originPlaceIds);

  const [{ data, error }, { count: filteredCount }, totalCount, withWebsite, withPhone, totalSearches] =
    await Promise.all([
      mainQuery.range(from, to),
      countQuery,
      supabase.from("leads").select("place_id", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("place_id", { count: "exact", head: true })
        .not("website", "is", null)
        .neq("website", ""),
      supabase
        .from("leads")
        .select("place_id", { count: "exact", head: true })
        .not("phone", "is", null)
        .neq("phone", ""),
      supabase.from("searches").select("id", { count: "exact", head: true }),
    ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as RawLeadWithRelations[];
  const leads: LeadWithSources[] = rows.map((row) => {
    const seen = new Map<string, LeadSearchSource>();
    for (const sl of row.search_leads ?? []) {
      const s = sl.searches;
      if (!s) continue;
      if (!seen.has(s.id)) {
        seen.set(s.id, {
          id: s.id,
          city: s.city,
          category: s.category,
          created_at: s.created_at,
        });
      }
    }
    const sources = Array.from(seen.values()).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    const { search_leads: _ignored, ...lead } = row;
    return { ...(lead as Lead), sources };
  });

  return NextResponse.json({
    leads,
    filteredTotal: filteredCount ?? 0,
    stats: {
      total: totalCount.count ?? 0,
      withWebsite: withWebsite.count ?? 0,
      withPhone: withPhone.count ?? 0,
      totalSearches: totalSearches.count ?? 0,
    },
  });
}

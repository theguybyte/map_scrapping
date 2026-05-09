import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveCityCoords } from "@/lib/geocode";
import { startScrapeRun } from "@/lib/apify";
import { ApifyTokenMissingError } from "@/lib/settings";
import type { ScrapeRequestBody } from "@/lib/types";

export async function POST(request: Request) {
  // Auth gate
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ScrapeRequestBody;
  try {
    body = (await request.json()) as ScrapeRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { province, city, category, radiusKm, scrapeContacts } = body;
  if (!province || !city || !category || !radiusKm) {
    return NextResponse.json(
      { error: "province, city, category, radiusKm are required" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  let coords;
  try {
    coords = await resolveCityCoords(city, province);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "geocoding failed" },
      { status: 400 },
    );
  }

  // Insert pending search row
  const { data: search, error: insertErr } = await admin
    .from("searches")
    .insert({
      province,
      city,
      category,
      radius_km: radiusKm,
      center_lat: coords.lat,
      center_lng: coords.lng,
      status: "pending",
    })
    .select()
    .single();

  if (insertErr || !search) {
    return NextResponse.json(
      { error: insertErr?.message ?? "could not create search" },
      { status: 500 },
    );
  }

  // Start Apify run
  try {
    const runId = await startScrapeRun({
      city,
      province,
      category,
      radiusKm,
      centerLat: coords.lat,
      centerLng: coords.lng,
      scrapeContacts,
    });
    await admin
      .from("searches")
      .update({ status: "running", apify_run_id: runId })
      .eq("id", search.id);

    return NextResponse.json({
      search_id: search.id,
      apify_run_id: runId,
      center: coords,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "apify error";
    await admin
      .from("searches")
      .update({ status: "failed", error_message: message })
      .eq("id", search.id);
    if (err instanceof ApifyTokenMissingError) {
      return NextResponse.json(
        { error: "apify_token_not_configured" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

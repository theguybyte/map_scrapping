import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const city = url.searchParams.get("city");
  const category = url.searchParams.get("category");
  const radiusKm = Number(url.searchParams.get("radiusKm") ?? 0);

  if (!city || !category) {
    return NextResponse.json({ search: null });
  }

  const cacheDays = Number(process.env.SCRAPE_CACHE_DAYS ?? 30);
  const cutoff = new Date(
    Date.now() - cacheDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("searches")
    .select("*")
    .ilike("city", city)
    .ilike("category", category)
    .eq("status", "completed")
    .gte("completed_at", cutoff)
    .gte("radius_km", radiusKm)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ search: data ?? null });
}

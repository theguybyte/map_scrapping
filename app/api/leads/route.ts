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
  const province = url.searchParams.get("province");
  const category = url.searchParams.get("category");
  const minRating = url.searchParams.get("minRating");
  const q = url.searchParams.get("q");

  let query = supabase
    .from("leads")
    .select("*")
    .order("last_scraped_at", { ascending: false });

  if (province) query = query.eq("province", province);
  if (category) query = query.eq("category_id", category);
  if (minRating) query = query.gte("rating", Number(minRating));
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Stats
  const [totalCount, withWebsite, withPhone, totalSearches] = await Promise.all([
    supabase.from("leads").select("place_id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("place_id", { count: "exact", head: true })
      .not("website", "is", null),
    supabase
      .from("leads")
      .select("place_id", { count: "exact", head: true })
      .not("phone", "is", null),
    supabase.from("searches").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    leads: data ?? [],
    stats: {
      total: totalCount.count ?? 0,
      withWebsite: withWebsite.count ?? 0,
      withPhone: withPhone.count ?? 0,
      totalSearches: totalSearches.count ?? 0,
    },
  });
}

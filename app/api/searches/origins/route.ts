import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("searches")
    .select("category")
    .not("category", "is", null)
    .order("category");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const origins: string[] = [];
  for (const row of data ?? []) {
    const value = (row as { category: string | null }).category?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    origins.push(value);
  }
  origins.sort((a, b) => a.localeCompare(b, "es"));

  return NextResponse.json({ origins });
}

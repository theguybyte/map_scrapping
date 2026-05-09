import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCityCoords } from "@/lib/geocode";

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
  const province = url.searchParams.get("province");
  if (!city || !province) {
    return NextResponse.json(
      { error: "city and province are required" },
      { status: 400 },
    );
  }

  try {
    const coords = await resolveCityCoords(city, province);
    return NextResponse.json(coords);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "geocode error" },
      { status: 400 },
    );
  }
}

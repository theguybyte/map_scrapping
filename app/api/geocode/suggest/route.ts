import { NextRequest, NextResponse } from "next/server";
import { suggestCities } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const province = req.nextUrl.searchParams.get("province") ?? "";

  if (q.length < 2 || !province) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await suggestCities(q.trim(), province.trim());
  return NextResponse.json({ suggestions });
}

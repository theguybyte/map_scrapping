import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";
import { getProvince } from "./argentina";
import { haversineKm } from "./utils";

export interface GeocodeResult {
  lat: number;
  lng: number;
  radiusKm?: number;
  source: "argentina.ts" | "cache" | "nominatim";
}

function radiusFromBoundingBox(
  bbox: [string, string, string, string],
): number | undefined {
  const south = parseFloat(bbox[0]);
  const north = parseFloat(bbox[1]);
  const west = parseFloat(bbox[2]);
  const east = parseFloat(bbox[3]);
  if ([south, north, west, east].some((n) => Number.isNaN(n))) return undefined;
  const midLat = (south + north) / 2;
  const halfHeightKm =
    haversineKm({ lat: north, lng: 0 }, { lat: south, lng: 0 }) / 2;
  const halfWidthKm =
    haversineKm({ lat: midLat, lng: east }, { lat: midLat, lng: west }) / 2;
  const suggested = Math.ceil(Math.max(halfHeightKm, halfWidthKm));
  return Math.min(50, Math.max(1, suggested));
}

let lastNominatimCall = 0;
async function throttleNominatim() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastNominatimCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();
}

async function nominatimSearch(
  city: string,
  province: string,
): Promise<{ lat: number; lng: number; radiusKm?: number } | null> {
  await throttleNominatim();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("city", city);
  url.searchParams.set("state", province);
  url.searchParams.set("country", "Argentina");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        process.env.NOMINATIM_USER_AGENT ??
        "LeadMap/1.0 (joseimaz1@gmail.com)",
      "Accept-Language": "es",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    class?: string;
    type?: string;
    place_rank?: number;
    osm_type?: string;
    boundingbox?: [string, string, string, string];
  }>;
  if (!data.length) return null;
  console.log(`[nominatim] ${city}, ${province} →`, data[0]);
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  const radiusKm = data[0].boundingbox
    ? radiusFromBoundingBox(data[0].boundingbox)
    : undefined;
  return { lat, lng, radiusKm };
}

export async function resolveCityCoords(
  city: string,
  province: string,
): Promise<GeocodeResult> {
  const trimmedCity = city.trim();
  const trimmedProv = province.trim();

  // 1. argentina.ts hardcoded province capitals
  const prov = getProvince(trimmedProv);
  if (
    prov &&
    prov.capital.toLowerCase() === trimmedCity.toLowerCase()
  ) {
    return {
      lat: prov.lat,
      lng: prov.lng,
      radiusKm: prov.defaultRadius,
      source: "argentina.ts",
    };
  }

  // 2. cities cache
  const supabase = createSupabaseAdminClient();
  const { data: cached } = await supabase
    .from("cities")
    .select("lat,lng,radius_km")
    .ilike("province", trimmedProv)
    .ilike("name", trimmedCity)
    .maybeSingle();
  if (cached) {
    return {
      lat: Number(cached.lat),
      lng: Number(cached.lng),
      radiusKm:
        cached.radius_km != null ? Number(cached.radius_km) : undefined,
      source: "cache",
    };
  }

  // 3. Nominatim
  const result = await nominatimSearch(trimmedCity, trimmedProv);
  if (!result) {
    if (prov) {
      return {
        lat: prov.lat,
        lng: prov.lng,
        radiusKm: prov.defaultRadius,
        source: "argentina.ts",
      };
    }
    throw new Error(
      `No se encontraron coordenadas para "${trimmedCity}, ${trimmedProv}"`,
    );
  }

  await supabase.from("cities").insert({
    province: trimmedProv,
    name: trimmedCity,
    lat: result.lat,
    lng: result.lng,
    radius_km: result.radiusKm ?? null,
    source: "nominatim",
  });

  return { ...result, source: "nominatim" };
}

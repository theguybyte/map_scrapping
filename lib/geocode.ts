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

export interface CitySuggestion {
  name: string;
  lat: number;
  lng: number;
  radiusKm?: number;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export async function suggestCities(
  query: string,
  province: string,
): Promise<CitySuggestion[]> {
  // 1. Supabase cache — instant, has radiusKm, but may contain stale partial names
  const supabase = createSupabaseAdminClient();
  const { data: cached } = await supabase
    .from("cities")
    .select("name,lat,lng,radius_km")
    .ilike("province", province)
    .ilike("name", `${query}%`)
    .limit(10);

  // Deduplicate cache by coords, keeping the longest name per coord pair
  const coordMap = new Map<string, CitySuggestion>();
  for (const r of cached ?? []) {
    const key = `${Number(r.lat)},${Number(r.lng)}`;
    const entry: CitySuggestion = {
      name: r.name,
      lat: Number(r.lat),
      lng: Number(r.lng),
      radiusKm: r.radius_km != null ? Number(r.radius_km) : undefined,
    };
    const existing = coordMap.get(key);
    if (!existing || entry.name.length > existing.name.length) coordMap.set(key, entry);
  }
  const cacheResults = Array.from(coordMap.values());

  // 2. Argentine government geolocation API — canonical names, true prefix search, no key needed
  let apiResults: CitySuggestion[] = [];
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 4000);
  try {
    const url = new URL("https://apis.datos.gob.ar/georef/api/localidades");
    url.searchParams.set("nombre", query);
    url.searchParams.set("provincia", province);
    url.searchParams.set("max", "8");
    url.searchParams.set("campos", "id,nombre,centroide");
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "LeadMap/1.0 (joseimaz1@gmail.com)" },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        localidades?: Array<{ nombre: string; centroide: { lat: number; lon: number } }>;
      };
      apiResults = (data.localidades ?? []).map((loc) => ({
        name: loc.nombre,
        lat: loc.centroide.lat,
        lng: loc.centroide.lon,
      }));
    }
  } catch {
    // Government API unavailable — fall back to cache only
  } finally {
    clearTimeout(timer);
  }

  // 3. Merge: API results are authoritative; cache enriches with radiusKm.
  //    Cache entries whose name is a word-boundary prefix of any API result are
  //    stale partial names (e.g. "Santa rosa" vs "Santa Rosa del Conlara") — drop them.
  const apiNormalized = apiResults.map((r) => stripAccents(r.name));

  const merged: CitySuggestion[] = [];
  const seenName = new Set<string>();
  const seenCoords = new Set<string>();

  for (const api of apiResults) {
    const norm = stripAccents(api.name);
    const coordKey = `${api.lat},${api.lng}`;
    if (seenName.has(norm) || seenCoords.has(coordKey)) continue;
    // Enrich with radiusKm from cache if an entry with the same normalized name exists
    const cached = cacheResults.find((c) => stripAccents(c.name) === norm);
    merged.push({ ...api, radiusKm: cached?.radiusKm });
    seenName.add(norm);
    seenCoords.add(coordKey);
    if (merged.length >= 5) break;
  }

  for (const c of cacheResults) {
    if (merged.length >= 5) break;
    const norm = stripAccents(c.name);
    const coordKey = `${c.lat},${c.lng}`;
    if (seenName.has(norm) || seenCoords.has(coordKey)) continue;
    // Drop stale partial names: if this name is a word-boundary prefix of any API result,
    // the API already returned the real city with the full name.
    if (apiNormalized.some((n) => n.startsWith(norm + " "))) continue;
    merged.push(c);
    seenName.add(norm);
    seenCoords.add(coordKey);
  }

  return merged;
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

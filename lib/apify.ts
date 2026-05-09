import "server-only";
import { ApifyClient } from "apify-client";
import type { Lead } from "./types";
import { normalizeCategory } from "./categories";

const ACTOR_ID = "nwua9Gu5YrADL7ZDj"; // Apify Google Maps Scraper (compass/crawler-google-places)

let cached: ApifyClient | null = null;
function getClient() {
  if (cached) return cached;
  cached = new ApifyClient({ token: process.env.APIFY_API_TOKEN! });
  return cached;
}

export interface RunScrapeInput {
  city: string;
  province: string;
  category: string;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  maxResults?: number;
}

export async function startScrapeRun(input: RunScrapeInput): Promise<string> {
  const client = getClient();
  const searchString = `${input.category} en ${input.city}, ${input.province}, Argentina`;
  const run = await client.actor(ACTOR_ID).start({
    searchStringsArray: [searchString],
    locationQuery: `${input.city}, ${input.province}, Argentina`,
    maxCrawledPlacesPerSearch: input.maxResults ?? 200,
    language: "es",
    countryCode: "ar",
    customGeolocation: {
      type: "Point",
      coordinates: [input.centerLng, input.centerLat],
      radiusKm: input.radiusKm,
    },
    scrapePlaceDetailPage: true,
    skipClosedPlaces: false,
  });
  return run.id;
}

export type RunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMING-OUT"
  | "TIMED-OUT"
  | "ABORTING"
  | "ABORTED";

export async function getRunStatus(
  runId: string,
): Promise<{ status: RunStatus; defaultDatasetId: string | null }> {
  const client = getClient();
  const run = await client.run(runId).get();
  return {
    status: (run?.status ?? "RUNNING") as RunStatus,
    defaultDatasetId: run?.defaultDatasetId ?? null,
  };
}

export async function fetchDatasetItems(datasetId: string): Promise<unknown[]> {
  const client = getClient();
  const { items } = await client.dataset(datasetId).listItems({ clean: true });
  return items;
}

interface ApifyPlace {
  placeId?: string;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  emails?: string[];
  instagrams?: string[];
  facebooks?: string[];
  totalScore?: number;
  reviewsCount?: number;
  categoryName?: string;
  categories?: string[];
  location?: { lat?: number; lng?: number };
  url?: string;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  imageUrl?: string;
}

export function mapApifyItemToLead(
  raw: unknown,
  fallbackCity: string,
  fallbackProvince: string,
): Lead | null {
  const it = raw as ApifyPlace;
  if (!it.placeId || !it.title) return null;

  const businessStatus = it.permanentlyClosed
    ? "permanently_closed"
    : it.temporarilyClosed
      ? "temporarily_closed"
      : "operational";

  return {
    place_id: it.placeId,
    name: it.title,
    address: it.address ?? null,
    city: it.city ?? fallbackCity,
    province: it.state ?? fallbackProvince,
    phone: it.phone ?? it.phoneUnformatted ?? null,
    website: it.website ?? null,
    email: it.emails?.[0] ?? null,
    instagram: it.instagrams?.[0] ?? null,
    facebook: it.facebooks?.[0] ?? null,
    rating: typeof it.totalScore === "number" ? it.totalScore : null,
    review_count: typeof it.reviewsCount === "number" ? it.reviewsCount : null,
    category: it.categoryName ?? it.categories?.[0] ?? null,
    category_id: normalizeCategory(it.categoryName ?? it.categories?.[0]),
    latitude: it.location?.lat ?? null,
    longitude: it.location?.lng ?? null,
    google_maps_url: it.url ?? null,
    business_status: businessStatus,
    last_scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

import "server-only";
import { ApifyClient } from "apify-client";
import type { User, MonthlyUsage, AccountAndUsageLimits } from "apify-client";
import type { Lead } from "./types";
import { getApifyFilterWords, normalizeCategory } from "./categories";
import { ApifyTokenMissingError, getApifyToken } from "./settings";

const ACTOR_ID = "nwua9Gu5YrADL7ZDj"; // Apify Google Maps Scraper (compass/crawler-google-places)

// Default ceiling sent as maxCrawledPlacesPerSearch. Exposed so the UI can show
// progress as "found / target" while a run is in flight.
export const DEFAULT_MAX_RESULTS = 200;

async function getClient(): Promise<ApifyClient> {
  const entry = await getApifyToken();
  if (!entry) throw new ApifyTokenMissingError();
  return new ApifyClient({ token: entry.token });
}

export interface RunScrapeInput {
  city: string;
  province: string;
  category: string;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  maxResults?: number;
  scrapeContacts?: boolean;
}

export async function startScrapeRun(input: RunScrapeInput): Promise<string> {
  const client = await getClient();
  const searchString = `${input.category} en ${input.city}, ${input.province}, Argentina`;

  // If the user's category maps to a known slug, pre-filter places inside
  // Apify so credits aren't spent on unrelated categories that Google mixes
  // in (e.g. supermarkets when searching restaurants). Free-form inputs that
  // don't match any slug skip the filter.
  const categoryFilterWords = getApifyFilterWords(input.category);
  console.log(
    `[apify] start search="${searchString}" filter=${
      categoryFilterWords ? `[${categoryFilterWords.length} words]` : "(none)"
    }`,
  );

  const actorInput: Record<string, unknown> = {
    searchStringsArray: [searchString],
    locationQuery: `${input.city}, ${input.province}, Argentina`,
    maxCrawledPlacesPerSearch: input.maxResults ?? DEFAULT_MAX_RESULTS,
    language: "es",
    countryCode: "ar",
    customGeolocation: {
      type: "Point",
      coordinates: [input.centerLng, input.centerLat],
      radiusKm: input.radiusKm,
    },
    scrapePlaceDetailPage: true,
    scrapeContacts: input.scrapeContacts ?? false,
    skipClosedPlaces: false,
  };
  if (categoryFilterWords) {
    actorInput.categoryFilterWords = categoryFilterWords;
  }

  const run = await client.actor(ACTOR_ID).start(actorInput);
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
  const client = await getClient();
  const run = await client.run(runId).get();
  return {
    status: (run?.status ?? "RUNNING") as RunStatus,
    defaultDatasetId: run?.defaultDatasetId ?? null,
  };
}

// Mid-run progress: how many items the scraper has produced so far. Used by
// the search page to render a progress bar while the run is RUNNING.
export async function getRunProgress(
  runId: string,
): Promise<{
  status: RunStatus;
  defaultDatasetId: string | null;
  itemCount: number;
}> {
  const client = await getClient();
  const run = await client.run(runId).get();
  const status = (run?.status ?? "RUNNING") as RunStatus;
  const defaultDatasetId = run?.defaultDatasetId ?? null;
  let itemCount = 0;
  if (defaultDatasetId) {
    try {
      const ds = await client.dataset(defaultDatasetId).get();
      itemCount = ds?.itemCount ?? ds?.cleanItemCount ?? 0;
    } catch {
      // dataset may not exist yet on the very first poll
    }
  }
  return { status, defaultDatasetId, itemCount };
}

export async function fetchDatasetItems(datasetId: string): Promise<unknown[]> {
  const client = await getClient();
  const { items } = await client.dataset(datasetId).listItems({ clean: true });
  return items;
}

export async function getApifyUserInfo(): Promise<User> {
  const client = await getClient();
  return client.user("me").get();
}

export async function getApifyMonthlyUsage(): Promise<MonthlyUsage | undefined> {
  const client = await getClient();
  return client.user("me").monthlyUsage();
}

export async function getApifyAccountLimits(): Promise<AccountAndUsageLimits | undefined> {
  const client = await getClient();
  return client.user("me").limits();
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

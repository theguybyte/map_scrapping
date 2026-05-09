# LeadMap — Lead Generation Web App

## Context
Greenfield **Next.js 16** (App Router) app for scraping Argentine business leads from Google Maps via Apify, deduplicating them in Supabase, and browsing/exporting them through a Leaflet-based UI. The working directory `D:\projects\CODERWEB\apps\map_scrapping` is empty — this is a from-scratch scaffold.

> **Next.js version note:** User's original brief said "Next.js 15 (latest)", but as of 2026-05-08 the latest stable is **16.2.2** (verified via context7). We'll scaffold with `npx create-next-app@latest` (resolves to 16.x). Migration notes from 15 → 16 are mainly around the async `cookies()`/`headers()`/`params` APIs, which we'll follow throughout.

The central design constraint is **no wasted Apify calls**: re-searching the same `(city, category)` within 30 days returns cached leads instead of triggering a new run.

## Decisions confirmed with user
1. **Auth** — Fixed admin-provisioned users, no signup. Single shared workspace (all users see the same `leads` and `searches`). Login page only.
2. **Scrape execution** — Async pattern. `POST /api/scrape` kicks off the Apify run and returns immediately with a `search_id`; client polls `GET /api/searches/[id]` every ~3s until status is `completed` or `failed`.
3. **Radius** — Pass `customGeolocation` (circle with center + radiusKm) to the Apify actor for precise geo-bounded scraping.
4. **Geocoding** — Use Nominatim (OpenStreetMap) for non-capital cities, cached in a `cities` table to respect their 1 req/sec usage policy.

## Stack
Next.js 16.x (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Supabase (Postgres + Auth, via `@supabase/ssr`) · `@apify/client` · Leaflet (`react-leaflet`, dynamically imported) · `papaparse` for CSV export.

## Database schema (Supabase migrations)

```sql
-- searches: one row per scraping job
create table searches (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  city text not null,
  category text not null,
  radius_km integer not null,
  center_lat numeric(9,6) not null,
  center_lng numeric(9,6) not null,
  status text not null default 'pending',  -- pending | running | completed | failed
  total_results integer,
  apify_run_id text,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index searches_city_category_idx on searches (lower(city), lower(category), created_at desc);

-- leads: deduplicated by Google place_id
create table leads (
  place_id text primary key,
  name text not null,
  address text, city text, province text,
  phone text, website text, email text, instagram text, facebook text,
  rating numeric(2,1), review_count integer,
  category text,
  latitude numeric(9,6), longitude numeric(9,6),
  google_maps_url text, business_status text,
  last_scraped_at timestamptz default now(),
  created_at timestamptz default now()
);
create index leads_province_idx on leads (province);
create index leads_category_idx on leads (lower(category));

-- search_leads: which leads came from which search (many-to-many)
create table search_leads (
  search_id uuid references searches(id) on delete cascade,
  place_id text references leads(place_id) on delete cascade,
  primary key (search_id, place_id)
);

-- cities: Nominatim geocoding cache
create table cities (
  id bigserial primary key,
  province text not null,
  name text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  source text not null,  -- 'argentina.ts' | 'nominatim'
  created_at timestamptz default now(),
  unique (lower(province), lower(name))
);
```

RLS: enabled on all tables, policy `auth.role() = 'authenticated'` allows full read/write (shared workspace model). Service role key used server-side bypasses RLS for system writes.

## Project structure

```
/app
  layout.tsx                       # global shell (no navbar)
  page.tsx                         # redirects → /search
  /(app)/layout.tsx                # navbar + auth-gated layout
  /(app)/search/page.tsx           # "Nueva búsqueda" screen
  /(app)/leads/page.tsx            # "Mis leads" screen
  /login/page.tsx                  # email + password form (Supabase Auth)
  /setup/page.tsx                  # onboarding when env vars missing
  /auth/signout/route.ts
  /api/scrape/route.ts             # POST: create search row, trigger Apify, return search_id
  /api/searches/route.ts           # GET ?city=&category=  → recent matching search
  /api/searches/[id]/route.ts      # GET status + results for polling
  /api/leads/route.ts               # GET with filters; stats counts
  /api/geocode/route.ts             # GET ?city=&province= → cached or Nominatim lookup
/components
  /map/LeafletMap.tsx               # dynamic import wrapper
  /map/LeafletMapInner.tsx          # actual react-leaflet (ssr:false)
  /search/SearchSidebar.tsx
  /search/ResultsPreview.tsx
  /leads/LeadsTable.tsx
  /leads/StatsBar.tsx
  /leads/ExportButtons.tsx
  /shared/Navbar.tsx
  /ui/*                             # shadcn-style primitives (handcrafted)
/lib
  /supabase/server.ts               # createServerClient (cookies)
  /supabase/client.ts               # createBrowserClient
  /supabase/admin.ts                # service role client (server-only)
  /supabase/database.types.ts       # hand-written DB types
  /apify.ts                         # startScrapeRun(), getRunStatus(), mapApifyItemToLead()
  /argentina.ts                     # 23 provinces with capital coords + defaultRadius
  /geocode.ts                       # Nominatim wrapper with cities-table cache
  /csv.ts                           # leads → CSV / TSV
  /types.ts                         # Lead, Search, Province types
  /utils.ts                         # cn, haversineKm
/proxy.ts                           # auth gate (Next 16 convention; was middleware.ts)
```

## Key flows

### Scrape flow (async + polling)
1. User clicks "Iniciar scraping" → browser POSTs `/api/scrape` with `{province, city, category, radiusKm}`.
2. Server resolves city coords (`/lib/geocode.ts`: argentina.ts → cities cache → Nominatim).
3. Server inserts row in `searches` (status=`pending`), calls `apifyClient.actor('nwua9Gu5YrADL7ZDj').start({ customGeolocation: { type: 'Point', coordinates: [lng, lat], radiusKm }, searchStringsArray: [`${category} en ${city}, ${province}, Argentina`], maxCrawledPlacesPerSearch: 200 })`, stores `apify_run_id`, sets status=`running`. Returns `{ search_id }`.
4. Client polls `GET /api/searches/[id]` every ~3.5s.
5. Polling endpoint checks Apify run status; on `SUCCEEDED`, fetches dataset items, upserts into `leads` (on `place_id`), inserts `search_leads` rows, sets `searches.status='completed'` and `total_results`. On failure: status=`failed` with `error_message`.
6. Client renders results in `ResultsPreview` and drops markers on the map.

### Cache check (before scraping)
On every change to city/category in the sidebar, debounced call to `GET /api/searches?city=X&category=Y` returns the most recent `completed` search within 30 days, if any. UI shows the "Last scraped X days ago — N leads" box.

### Leads page filters
`GET /api/leads?province=&category=&minRating=&q=` builds a Supabase query with `.ilike('name', '%q%')`, `.eq('province', ...)`, `.gte('rating', ...)`. Stats bar uses 4 parallel `count` queries.

## Critical files & libraries
- **Apify actor ID**: `nwua9Gu5YrADL7ZDj` (Google Maps Scraper).
- **`@supabase/ssr`** (not `auth-helpers-nextjs`, which is deprecated) for cookie-based session in App Router.
- **`react-leaflet`** + `leaflet` — must be dynamically imported with `ssr: false`. Default marker icons need to be re-imported manually (known Leaflet+webpack issue).
- **Nominatim**: `User-Agent` header is mandatory (`User-Agent: LeadMap/1.0 (joseimaz1@gmail.com)`). Throttle to 1 req/sec server-side.

## Environment variables (`.env.local`)
```
APIFY_API_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NOMINATIM_USER_AGENT=LeadMap/1.0 (joseimaz1@gmail.com)
SCRAPE_CACHE_DAYS=30
```

## Build order
1. **Scaffold** — `create-next-app`, install deps, init Tailwind + shadcn-style primitives, add `.env.local.example`, set up Supabase clients (`server.ts` / `client.ts` / `admin.ts`).
2. **DB & types** — write SQL migrations, run on Supabase, hand-write TS types in `database.types.ts`, populate `argentina.ts` with all 23 provinces.
3. **Auth** — `proxy.ts` redirect to `/login`, login page, navbar with sign-out. Provision users via Supabase dashboard (document in README).
4. **Map + sidebar** — `LeafletMap` with circle + center crosshair, `SearchSidebar` with province/city/category/radius, live circle update.
5. **Apify lib + scrape API** — `startScrapeRun`, `getRunStatus`, `mapApifyItemToLead`. Wire `/api/scrape`, `/api/searches`, `/api/searches/[id]`, `/api/geocode`.
6. **Search page integration** — async polling UI with progress hint, results preview, cache-hit info box.
7. **Leads page** — stats bar, filters, table with relative-time, CSV export. Google Sheets export = "Copy as TSV" button.
8. **Polish** — loading skeletons, error states, province pill colors, README, end-to-end verification.

## Verification (end-to-end)
- Sign in with a seeded user → redirected to `/search`.
- Pick "San Luis" province, type "agencias de marketing", radius 20km → circle redraws live; cache box hidden (no prior search).
- Click scrape → spinner with "Estimated 1–3 min". Progress updates as Apify run advances. Markers appear on completion.
- Re-search same city+category → cache box appears with "Hace 0 días — N leads". No new Apify call unless user forces re-scrape.
- Open `/leads` → all leads visible. Filter by province=San Luis → narrows. Export CSV → file downloads with all columns.
- Re-scrape same area → existing leads' `last_scraped_at` updates, no duplicates (verify via Supabase row count).
- Sign out → redirected to `/login`, protected routes inaccessible.

---

## Build status (2026-05-08)
All eight build steps complete. `npx tsc --noEmit` clean, `npx next build` clean (no warnings), dev server boots and serves `/setup` correctly when env vars are unset. Awaiting user to fill `.env.local`, run the SQL migration, and provision Supabase users.

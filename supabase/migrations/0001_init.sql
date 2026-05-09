-- LeadMap initial schema

create extension if not exists "pgcrypto";

-- searches: one row per scraping job
create table if not exists public.searches (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  city text not null,
  category text not null,
  radius_km integer not null,
  center_lat numeric(9,6) not null,
  center_lng numeric(9,6) not null,
  status text not null default 'pending',
  total_results integer,
  apify_run_id text,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists searches_city_category_idx
  on public.searches (lower(city), lower(category), created_at desc);

-- leads: deduplicated by Google place_id
create table if not exists public.leads (
  place_id text primary key,
  name text not null,
  address text,
  city text,
  province text,
  phone text,
  website text,
  email text,
  instagram text,
  facebook text,
  rating numeric(2,1),
  review_count integer,
  category text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  google_maps_url text,
  business_status text,
  last_scraped_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists leads_province_idx on public.leads (province);
create index if not exists leads_category_idx on public.leads (lower(category));

-- search_leads: which leads came from which search
create table if not exists public.search_leads (
  search_id uuid references public.searches(id) on delete cascade,
  place_id text references public.leads(place_id) on delete cascade,
  primary key (search_id, place_id)
);

-- cities: Nominatim geocoding cache
create table if not exists public.cities (
  id bigserial primary key,
  province text not null,
  name text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  source text not null,
  created_at timestamptz default now()
);

create unique index if not exists cities_unique_idx
  on public.cities (lower(province), lower(name));

-- RLS: shared workspace — any authenticated user can read/write
alter table public.searches enable row level security;
alter table public.leads enable row level security;
alter table public.search_leads enable row level security;
alter table public.cities enable row level security;

drop policy if exists "auth read searches" on public.searches;
create policy "auth read searches" on public.searches
  for select using (auth.role() = 'authenticated');
drop policy if exists "auth write searches" on public.searches;
create policy "auth write searches" on public.searches
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "auth read leads" on public.leads;
create policy "auth read leads" on public.leads
  for select using (auth.role() = 'authenticated');
drop policy if exists "auth write leads" on public.leads;
create policy "auth write leads" on public.leads
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "auth read search_leads" on public.search_leads;
create policy "auth read search_leads" on public.search_leads
  for select using (auth.role() = 'authenticated');
drop policy if exists "auth write search_leads" on public.search_leads;
create policy "auth write search_leads" on public.search_leads
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "auth read cities" on public.cities;
create policy "auth read cities" on public.cities
  for select using (auth.role() = 'authenticated');
drop policy if exists "auth write cities" on public.cities;
create policy "auth write cities" on public.cities
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

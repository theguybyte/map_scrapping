-- Cache the suggested search radius (km) per city, derived from the Nominatim
-- bounding box. Nullable so existing rows remain valid; new lookups populate it
-- and subsequent cache hits can return it without re-querying Nominatim.

alter table public.cities
  add column if not exists radius_km integer;

-- Singleton table for app-level secrets / settings (Apify API token, etc.).
-- Locked to the service role: RLS is enabled with no policies so anon and
-- authenticated roles cannot read or write the column directly.

create table if not exists public.app_settings (
  id boolean primary key default true,
  apify_api_token text,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = true)
);

alter table public.app_settings enable row level security;

-- Seed the singleton row.
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

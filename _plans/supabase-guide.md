# Supabase Setup Guide

A practical reference for setting up Supabase in a Next.js (App Router) project — covering database, auth, migrations, dev tooling, and known limitations.

---

## 1. What is Supabase?

Supabase is an open-source Firebase alternative built on top of Postgres. It bundles:

| Service | What it gives you |
|---|---|
| **Database** | Hosted Postgres with auto-generated REST + GraphQL APIs |
| **Auth** | JWT-based auth, 20+ OAuth providers, magic links, OTP |
| **Storage** | S3-compatible file storage with RLS policies |
| **Edge Functions** | Deno-based serverless functions (deploy via CLI) |
| **Realtime** | Postgres change subscriptions over WebSocket |
| **Studio** | Web-based Postgres GUI (also runs locally) |

It can also be self-hosted. The managed cloud has a generous free tier.

---

## 2. Creating a Cloud Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose an organization, name, database password, and region
3. Wait ~2 min for provisioning
4. Navigate to **Project Settings → API** and copy:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # safe to expose in browser
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # server-only, never expose
```

> **Key usage at a glance:**
> - `ANON_KEY` — used by the browser and SSR clients. Respects RLS policies.
> - `SERVICE_ROLE_KEY` — bypasses RLS entirely. Use only in trusted server code.

---

## 3. Installing Packages (JS / Next.js)

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js` — core client (queries, auth, storage, realtime)
- `@supabase/ssr` — cookie-aware wrappers for Next.js App Router

### Three client factories

#### Browser client — `lib/supabase/client.ts`
Used in Client Components (`"use client"`).

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

#### Server client — `lib/supabase/server.ts`
Used in Server Components, API Route Handlers, and Server Actions.
Reads/writes session from cookies so the user stays logged in across requests.

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — ignore. Middleware refreshes the session.
          }
        },
      },
    },
  );
}
```

#### Admin client — `lib/supabase/admin.ts`
Uses the service role key — **bypasses RLS**. Import `server-only` to prevent
accidental inclusion in client bundles. Cache the singleton to avoid re-creating
it on every request.

```ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cached: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;
  cached = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}
```

---

## 4. Authentication Setup

### Email / Password

```ts
// Sign up
const { error } = await supabase.auth.signUp({ email, password });

// Sign in
const { error } = await supabase.auth.signInWithPassword({ email, password });
```

Enable **Email confirmations** (or disable for dev) in Dashboard → **Authentication → Providers → Email**.

### OAuth Providers (GitHub, Google, etc.)

1. Dashboard → **Authentication → Providers** → enable the provider
2. Create OAuth app credentials in the provider's developer console
3. Paste the **Client ID** and **Secret** into the Supabase dashboard
4. Register the redirect URI: `https://<project>.supabase.co/auth/v1/callback`

```ts
// Trigger OAuth login (client-side)
await supabase.auth.signInWithOAuth({
  provider: "github",
  options: { redirectTo: `${window.location.origin}/auth/callback` },
});
```

Add an auth callback route at `app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
```

### Sign Out

```ts
// app/auth/signout/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
```

### Protecting Routes — Proxy / Middleware

In Next.js 16 the file is `proxy.ts` (not `middleware.ts`). It runs on every
request that matches `config.matcher` and refreshes the session cookie.

```ts
// proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/setup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guard: redirect to /setup if env vars are missing
  if (!url || !anon) {
    if (pathname === "/setup" || pathname.startsWith("/_next")) {
      return NextResponse.next({ request });
    }
    const setup = request.nextUrl.clone();
    setup.pathname = "/setup";
    setup.search = "";
    return NextResponse.redirect(setup);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Always call getUser() immediately after createServerClient — no code between them
  const { data: { user } } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("from", pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && pathname === "/login") {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response; // must return this exact response to preserve session cookies
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
```

> **Critical rule:** never put any code between `createServerClient` and
> `supabase.auth.getUser()`. Even a harmless log can cause hard-to-debug
> session invalidations. Always return the original `response` object — replacing
> it with a new `NextResponse.next()` drops the session cookies.

### Protecting API Routes

```ts
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // ...
}
```

---

## 5. Row Level Security (RLS)

The anon key is **public** — anyone who reads your frontend JS can use it to
query your database directly. RLS is the only thing preventing them from reading
or writing data they shouldn't.

**Rule: always enable RLS on every table. Ship no table without policies.**

```sql
-- Enable RLS on a table
alter table public.my_table enable row level security;
```

### Common Policy Patterns

#### Shared workspace — any authenticated user can read/write

```sql
create policy "auth read" on public.my_table
  for select using (auth.role() = 'authenticated');

create policy "auth write" on public.my_table
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```

#### Per-user isolation — each user sees only their own rows

```sql
create policy "owner read" on public.my_table
  for select using (auth.uid() = user_id);

create policy "owner write" on public.my_table
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

#### Admin / service role bypasses RLS automatically
The service role key sets `role = 'service_role'` which skips all RLS checks.
No extra policy needed — just never expose the service role key to clients.

> **Performance note:** add an index on any column used in `using()` or
> `with check()` (e.g. `user_id`). Unindexed RLS filters run a sequential
> scan on every row read.

---

## 6. Database & Migrations

### The `supabase/migrations/` folder

Each migration is a timestamped SQL file applied in order:

```
supabase/
  migrations/
    20240101000000_init.sql
    20240215123456_add_users_table.sql
  config.toml
  seed.sql          # optional: loaded on db reset
```

Migrations are **append-only** — never edit an already-applied file. Create a
new migration to alter an existing schema.

### Example migration

```sql
-- supabase/migrations/20240101000000_init.sql

create extension if not exists "pgcrypto";

create table if not exists public.searches (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  category text not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);

create index if not exists searches_city_idx
  on public.searches (lower(city), created_at desc);

alter table public.searches enable row level security;

create policy "auth read searches" on public.searches
  for select using (auth.role() = 'authenticated');

create policy "auth write searches" on public.searches
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```

---

## 7. Supabase CLI — Local Development

The CLI runs a full Supabase stack locally via Docker (Postgres, Auth, Storage,
Studio, Edge Runtime). Changes are made as migration files and pushed to remote
with a single command.

### Install

```bash
# Via npx (no global install needed)
npx supabase <command>

# Or install globally
npm install -g supabase
```

Requires **Docker Desktop** running.

### First-time setup for a new project

```bash
supabase init                        # creates supabase/config.toml
supabase login                       # authenticate to supabase.com
supabase link --project-ref <id>     # link to your cloud project
                                     # project-ref is in the dashboard URL
supabase db pull                     # pull existing remote schema as a migration file
supabase start                       # start local stack
```

### First-time setup for an existing repo

```bash
supabase login
supabase link --project-ref <id>
supabase start                       # local stack mirrors remote schema via migration files
```

### Daily dev loop

```bash
# Create a new migration
supabase migration new add_email_to_leads

# Edit the generated file in supabase/migrations/
# Then apply it locally
supabase migration up

# Or wipe and rebuild from scratch (runs all migrations + seed.sql)
supabase db reset

# Preview what would change on remote before pushing
supabase db push --dry-run

# Push migrations to remote (production/staging)
supabase db push
```

### CLI Commands Reference

| Command | What it does |
|---|---|
| `supabase init` | Create `supabase/` folder and `config.toml` |
| `supabase login` | Authenticate to supabase.com |
| `supabase link --project-ref <id>` | Link local folder to a cloud project |
| `supabase start` | Start all local services (requires Docker) |
| `supabase stop` | Stop local services |
| `supabase status` | Show local service URLs and API keys |
| `supabase db pull` | Pull remote schema → new migration file |
| `supabase db push` | Apply local migrations to remote |
| `supabase db push --dry-run` | Preview what `db push` would do |
| `supabase db push --include-all` | Ignore remote history, push everything |
| `supabase db reset` | Wipe local DB + reapply all migrations + seed |
| `supabase migration new <name>` | Create a new empty migration file |
| `supabase migration up` | Apply pending migrations to local DB |
| `supabase migration list` | Show migration history |
| `supabase gen types --local > types.ts` | Generate TypeScript types from local DB |
| `supabase gen types --linked > types.ts` | Generate TypeScript types from remote DB |
| `supabase inspect db` | Various DB health/usage reports |
| `supabase functions serve` | Run Edge Functions locally |
| `supabase functions deploy <name>` | Deploy an Edge Function to remote |

---

## 8. Generating TypeScript Types

Supabase can introspect your Postgres schema and emit fully-typed TypeScript
definitions for every table, view, and function.

```bash
# From the local stack (most up-to-date during development)
supabase gen types --local > lib/supabase/database.types.ts

# From the linked remote project
supabase gen types --linked > lib/supabase/database.types.ts

# Only the public schema
supabase gen types --local -s public > lib/supabase/database.types.ts
```

Add a script to `package.json` so it's one command:

```json
{
  "scripts": {
    "gen:types": "supabase gen types --linked > lib/supabase/database.types.ts"
  }
}
```

Then pass `Database` as the generic to every client:

```ts
createBrowserClient<Database>(url, key)
createServerClient<Database>(url, key, { cookies: ... })
createClient<Database>(url, key)
```

This gives you full autocompletion and compile-time errors on typos in table/column names.

> **Tip:** run `npm run gen:types` after every migration push so your types stay
> in sync with the schema.

---

## 9. Supabase Studio (local)

When `supabase start` is running, Studio is available at:

```
http://localhost:54323
```

It includes:
- **Table Editor** — spreadsheet-style row editing
- **SQL Editor** — run arbitrary queries against the local DB
- **Auth** — manage local users, view sessions
- **Storage** — browse/upload files
- **API Docs** — auto-generated docs for your schema
- **Logs** — view request/auth/function logs

The local API URL and anon key are printed by `supabase status`:

```
API URL: http://localhost:54321
anon key: eyJ...
```

---

## 10. Limitations

### Free Tier ("Free Plan")

| Resource | Limit |
|---|---|
| Active projects | 2 |
| Database storage | 500 MB |
| Bandwidth | 5 GB / month |
| Auth MAUs | 50,000 / month |
| File storage | 500 MB |
| Edge Function invocations | 500K / month |
| Custom domains | Not available (Pro+) |
| **Project inactivity pause** | **Paused after 7 days of no API traffic** |

The inactivity pause is the most common free-tier gotcha. The project goes to
sleep and takes ~30 s to wake on the next request. You can avoid it by:
- Upgrading to Pro ($25/mo)
- Sending a dummy request on a cron job every few days
- Using the Supabase "No pause" setting (dashboard → Project Settings → General)
  — this is now available on free tier for one project

### Postgres / Database Limits

- **Direct connections:** 60 on free (limited by `max_connections`). Use the
  connection pooler (port 6543, pgbouncer) for up to 200 pooled connections.
- **No DDL transactions:** each SQL statement in a migration runs independently.
  If a migration half-fails, the applied statements stay. Design migrations so
  each statement is safe to re-run (`if not exists`, `if exists`, `create or replace`).
- `supabase db push` is **not atomic** — a failing migration leaves the remote
  in a partial state. Always test migrations locally with `db reset` first.
- No support for Postgres extensions that require superuser (e.g. `pg_cron`
  requires enabling via the Dashboard, not raw SQL).

### Auth Limits

- **Free tier SMTP:** email delivery uses Supabase's shared SMTP, rate-limited
  to a few emails per hour. For production volume, configure a custom SMTP
  provider (Dashboard → Auth → SMTP Settings) — available on all tiers.
- OAuth redirect URIs must be pre-registered in the provider's app settings
  and in the Supabase Dashboard (Auth → URL Configuration).
- JWT expiry defaults to **1 hour**. Refresh tokens are valid for 60 days.
  Both are configurable in Dashboard → Auth → JWT Settings.
- Magic links and OTP emails expire in 1 hour by default (configurable).
- The anon key never expires — rotate it if compromised (Dashboard → Settings → API → Regenerate).

### RLS Performance

- Every RLS policy runs as a SQL predicate on every row accessed.
- `auth.uid()` and `auth.role()` are efficient (read from JWT), but joins or
  subqueries inside policies can be slow at scale.
- Always create an index on columns referenced in `using()` predicates (e.g.
  `user_id`, `owner_id`).

### Realtime

- Eventually consistent — not suitable for financial transactions or
  strict ordering requirements.
- Free tier: 200 concurrent connections, 2M messages/month.
- Realtime uses Postgres logical replication under the hood; enabling it on
  large, write-heavy tables can add replication lag.

### Edge Functions

- Cold start ~200 ms (Deno isolate spin-up).
- No persistent in-memory state between invocations.
- Maximum execution time: 400 ms on free, configurable on Pro.
- Deployed globally, but no region pinning on free tier.

### Local CLI

- Requires **Docker Desktop** to be running before `supabase start`.
- Local stack consumes ~1 GB RAM (Postgres + Auth + Storage + Studio).
- `supabase db push` does **not** roll back if a statement fails partway through.
- Types generated via `gen types` reflect the schema at generation time —
  re-run after every migration.
- `config.toml` settings (auth, storage, JWT secret) apply only to the local
  stack. Production settings live in the cloud dashboard.

---

## Quick-Start Checklist

```
[ ] Create project on supabase.com
[ ] Copy URL + anon key + service role key → .env.local
[ ] npm install @supabase/supabase-js @supabase/ssr
[ ] Create lib/supabase/{client,server,admin}.ts
[ ] Add proxy.ts with session refresh + route protection
[ ] Create app/auth/callback/route.ts
[ ] Create app/auth/signout/route.ts
[ ] supabase init && supabase login && supabase link
[ ] Write first migration in supabase/migrations/
[ ] supabase start → verify in Studio at localhost:54323
[ ] supabase db reset → confirm schema applied
[ ] supabase gen types --local > lib/supabase/database.types.ts
[ ] supabase db push → deploy to remote
```

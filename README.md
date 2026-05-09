# LeadMap

App de generación de leads para empresas argentinas. Escrapea Google Maps vía Apify, deduplica los resultados en Supabase, y los muestra en un mapa Leaflet con filtros y exportación.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth) · Apify (`@apify/client`) · Leaflet + OpenStreetMap.

## Concepto clave

Cada búsqueda queda cacheada por 30 días. Si volvés a buscar la misma `(ciudad, categoría)` antes del vencimiento, mostramos los leads guardados sin llamar a Apify de nuevo.

---

## Setup

### 1. Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá:

```
APIFY_API_TOKEN=                  # token de Apify (apify.com → Settings → Integrations)
NEXT_PUBLIC_SUPABASE_URL=         # https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # anon public key
SUPABASE_SERVICE_ROLE_KEY=        # service_role key (¡secret, nunca al cliente!)
NOMINATIM_USER_AGENT=LeadMap/1.0 (tu-email@ejemplo.com)
SCRAPE_CACHE_DAYS=30
```

### 2. Base de datos

Aplicá la migración en Supabase:

- **Opción A — SQL Editor del dashboard:** pegá el contenido de `supabase/migrations/0001_init.sql`.
- **Opción B — supabase CLI:** `supabase db push`.

Esto crea las tablas `searches`, `leads`, `search_leads`, `cities` con RLS activado para usuarios autenticados.

### 3. Provisionar usuarios

No hay registro público. Creá los usuarios manualmente:

- Supabase Dashboard → Authentication → Users → Add user → "Create user with password".
- Confirmá el email (o desactivá "Confirm email" en Auth → Providers → Email para usuarios fijos internos).

### 4. Instalar y correr

```bash
npm install
npm run dev          # http://localhost:3000
```

### 5. Build de producción

```bash
npm run build
npm start
```

---

## Estructura

```
app/
  (app)/                   # rutas autenticadas
    layout.tsx             # navbar + lead count
    search/page.tsx        # "Nueva búsqueda"
    leads/page.tsx         # "Mis leads"
  api/
    scrape/                # POST: arranca scrape, devuelve search_id
    searches/              # GET: cache check + status polling
    leads/                 # GET: leads con filtros + stats
    geocode/               # GET: coords vía argentina.ts/cache/Nominatim
  login/page.tsx           # login email + password
  auth/signout/route.ts
components/
  map/LeafletMap*          # Leaflet (dynamic, no SSR)
  search/                  # Sidebar + ResultsPreview
  leads/                   # Stats + Table + Export
  shared/Navbar.tsx
  ui/                      # primitivas estilo shadcn
lib/
  supabase/                # server / client / admin / database.types
  apify.ts                 # actor nwua9Gu5YrADL7ZDj + mapToLead
  argentina.ts             # 23 provincias con coords y radio sugerido
  geocode.ts               # Nominatim con cache en tabla `cities`
  csv.ts                   # exportar CSV / TSV
  types.ts
proxy.ts                   # auth proxy (Next.js 16 — antes "middleware.ts")
supabase/migrations/       # 0001_init.sql
```

---

## Flujo de scrape

1. Cliente: POST `/api/scrape` con `{province, city, category, radiusKm}`.
2. Servidor: resuelve coordenadas (argentina.ts → cache `cities` → Nominatim), inserta fila en `searches` (status=`running`), llama a `apifyClient.actor('nwua9Gu5YrADL7ZDj').start({ customGeolocation: { type:'Point', coordinates:[lng,lat], radiusKm } })`, devuelve `{ search_id, apify_run_id }`.
3. Cliente: polling cada ~3.5s a `/api/searches/[id]`.
4. Endpoint de polling: si Apify terminó, hace `upsert` en `leads` por `place_id`, conecta vía `search_leads`, marca `searches.status='completed'`.
5. UI: muestra resultados en `ResultsPreview` y pone pins numerados en el mapa.

## Notas

- **Leaflet** se importa con `dynamic(..., { ssr: false })` para evitar errores de SSR.
- **Nominatim** tiene una política de uso de 1 req/seg — el cliente respeta el throttle.
- **Tipos de Supabase** están en `lib/supabase/database.types.ts` (escritos a mano). Para regenerar desde un proyecto real: `npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts`.
- **Convención de Next.js 16**: el archivo se llama `proxy.ts` en la raíz (antes era `middleware.ts`).

## Verificación end-to-end

1. Iniciá sesión con un usuario sembrado → te redirige a `/search`.
2. Elegí "San Luis", escribí "agencias de marketing", radio 20 km → el círculo se redibuja en vivo; sin caja de cache (no hay búsqueda previa).
3. Click en "Iniciar scraping" → spinner con "Tiempo estimado 1–3 min". El polling actualiza el estado. Al completarse, los pines aparecen en el mapa.
4. Volvé a buscar la misma ciudad+categoría → aparece la caja "Hace 0 días — N leads". Sin nueva llamada a Apify a menos que pulses "Re-scrapear".
5. Andá a `/leads` → todos los leads visibles. Filtrá por provincia=San Luis → se acotan. Exportá CSV → archivo descargado con todas las columnas.
6. Re-scrapear la misma zona → el `last_scraped_at` se actualiza, sin duplicados (verificable por count en Supabase).
7. Salir → te redirige a `/login`, las rutas protegidas son inaccesibles.

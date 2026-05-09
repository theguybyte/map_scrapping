import { MapPin } from "lucide-react";

export default function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-600 text-white">
            <MapPin className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">LeadMap</span>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Setup pendiente
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Completá las variables de entorno para empezar.
          </p>
        </div>

        <ol className="space-y-4 text-sm text-zinc-700 list-decimal list-inside">
          <li>
            Creá un proyecto en{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-purple-600 underline"
            >
              Supabase
            </a>{" "}
            y copiá la URL y las API keys.
          </li>
          <li>
            Conseguí un token en{" "}
            <a
              href="https://apify.com"
              target="_blank"
              rel="noreferrer"
              className="text-purple-600 underline"
            >
              Apify
            </a>
            .
          </li>
          <li>
            Editá <code className="bg-zinc-100 px-1.5 py-0.5 rounded">.env.local</code>{" "}
            con las siguientes variables:
          </li>
        </ol>

        <pre className="bg-zinc-900 text-zinc-100 text-xs p-4 rounded-md overflow-x-auto">
{`APIFY_API_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NOMINATIM_USER_AGENT=LeadMap/1.0 (tu-email@ejemplo.com)
SCRAPE_CACHE_DAYS=30`}
        </pre>

        <ol
          start={4}
          className="space-y-2 text-sm text-zinc-700 list-decimal list-inside"
        >
          <li>
            Aplicá la migración SQL en{" "}
            <code className="bg-zinc-100 px-1.5 py-0.5 rounded">
              supabase/migrations/0001_init.sql
            </code>{" "}
            desde el SQL Editor del dashboard.
          </li>
          <li>
            Creá un usuario manualmente en Authentication → Users → Add user.
          </li>
          <li>Reiniciá el servidor de desarrollo.</li>
        </ol>

        <p className="text-xs text-zinc-500 border-t border-zinc-100 pt-4">
          Más detalles en el{" "}
          <code className="bg-zinc-100 px-1.5 py-0.5 rounded">README.md</code>.
        </p>
      </div>
    </div>
  );
}

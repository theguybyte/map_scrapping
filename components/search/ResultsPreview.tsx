"use client";

import { Star, ExternalLink } from "lucide-react";
import type { Lead } from "@/lib/types";

interface ResultsPreviewProps {
  leads: Lead[];
  status: "idle" | "running" | "completed" | "failed";
  errorMessage?: string | null;
}

export function ResultsPreview({
  leads,
  status,
  errorMessage,
}: ResultsPreviewProps) {
  if (status === "idle") {
    return (
      <div className="h-full flex items-center justify-center text-sm text-zinc-500">
        Iniciá una búsqueda para ver resultados aquí.
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-zinc-500">
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-purple-500" />
        </div>
        <p>Apify está procesando tu búsqueda…</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="h-full flex items-center justify-center text-sm text-red-600">
        {errorMessage ?? "Falló el scraping."}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-zinc-500">
        No se encontraron leads para esa búsqueda.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 text-left w-10">#</th>
            <th className="px-3 py-2 text-left">Nombre</th>
            <th className="px-3 py-2 text-left">Teléfono</th>
            <th className="px-3 py-2 text-left">Sitio web</th>
            <th className="px-3 py-2 text-left w-24">Rating</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr
              key={lead.place_id}
              className="border-t border-zinc-100 hover:bg-zinc-50"
            >
              <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-zinc-900">
                {lead.name}
              </td>
              <td className="px-3 py-2 text-zinc-700">{lead.phone ?? "—"}</td>
              <td className="px-3 py-2">
                {lead.website ? (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                  >
                    <span className="truncate max-w-[200px]">
                      {lead.website.replace(/^https?:\/\//, "")}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                {lead.rating != null ? (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-amber-500 stroke-amber-500" />
                    {lead.rating}
                    {lead.review_count != null && (
                      <span className="text-zinc-400 text-xs">
                        ({lead.review_count})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

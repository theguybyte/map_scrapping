"use client";

import { Star, ExternalLink, MapPin, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { LeadWithSources } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { getProvincePillColor } from "@/lib/argentina";
import { getCategoryLabel } from "@/lib/categories";

interface LeadsTableProps {
  leads: LeadWithSources[];
}

function isPresent(v: string | null | undefined): v is string {
  return !!v && v.trim() !== "";
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.43.37 1.06.42 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.17-1.06.37-2.23.42-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.43-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.62c-3.15 0-3.52 0-4.76.07-.99.05-1.53.21-1.89.35-.47.18-.81.4-1.17.76-.36.36-.58.7-.76 1.17-.14.36-.3.9-.35 1.89C3 8.48 3 8.85 3 12s0 3.52.07 4.76c.05.99.21 1.53.35 1.89.18.47.4.81.76 1.17.36.36.7.58 1.17.76.36.14.9.3 1.89.35 1.24.07 1.61.07 4.76.07s3.52 0 4.76-.07c.99-.05 1.53-.21 1.89-.35.47-.18.81-.4 1.17-.76.36-.36.58-.7.76-1.17.14-.36.3-.9.35-1.89.07-1.24.07-1.61.07-4.76s0-3.52-.07-4.76c-.05-.99-.21-1.53-.35-1.89a3.18 3.18 0 0 0-.76-1.17 3.18 3.18 0 0 0-1.17-.76c-.36-.14-.9-.3-1.89-.35-1.24-.07-1.61-.07-4.76-.07zm0 2.76a5.42 5.42 0 1 1 0 10.84 5.42 5.42 0 0 1 0-10.84zm0 8.94a3.52 3.52 0 1 0 0-7.04 3.52 3.52 0 0 0 0 7.04zm5.63-9.13a1.27 1.27 0 1 1 0 2.54 1.27 1.27 0 0 1 0-2.54z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.92 3.78-3.92 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.79 8.43-4.94 8.43-9.94z" />
    </svg>
  );
}

export function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
        No hay leads que coincidan con los filtros.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div
        className="overflow-auto max-h-[calc(100dvh-280px)] min-h-[320px] rounded-lg"
        style={{ scrollbarGutter: "stable" }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 shadow-[inset_0_-1px_0_0_rgb(228_228_231)]">
            <tr className="text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Provincia</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Sitio web</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Redes</th>
              <th className="px-4 py-3 text-left">Origen</th>
              <th className="px-4 py-3 text-left">Rating</th>
              <th className="px-4 py-3 text-left">Última actualización</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.place_id}
                className="border-t border-zinc-100 hover:bg-zinc-50/60"
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-zinc-900">
                    {lead.google_maps_url ? (
                      <a
                        href={lead.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-purple-700"
                      >
                        {lead.name}
                        <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                      </a>
                    ) : (
                      lead.name
                    )}
                  </div>
                  {lead.address && (
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {lead.address}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {lead.province ? (
                    <Badge className={getProvincePillColor(lead.province)}>
                      {lead.province}
                    </Badge>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-zinc-700">
                  {getCategoryLabel(lead.category_id)}
                </td>
                <td className="px-4 py-3 align-top text-zinc-700">
                  {isPresent(lead.phone) ? lead.phone : <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3 align-top">
                  {isPresent(lead.website) ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                    >
                      <span className="truncate max-w-50">
                        {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {isPresent(lead.email) ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                      title={lead.email}
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-44">{lead.email}</span>
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    {isPresent(lead.instagram) && (
                      <a
                        href={lead.instagram}
                        target="_blank"
                        rel="noreferrer"
                        title={lead.instagram}
                        className="text-zinc-400 hover:text-pink-600"
                      >
                        <InstagramIcon className="h-4 w-4" />
                      </a>
                    )}
                    {isPresent(lead.facebook) && (
                      <a
                        href={lead.facebook}
                        target="_blank"
                        rel="noreferrer"
                        title={lead.facebook}
                        className="text-zinc-400 hover:text-blue-600"
                      >
                        <FacebookIcon className="h-4 w-4" />
                      </a>
                    )}
                    {!isPresent(lead.instagram) && !isPresent(lead.facebook) && (
                      <span className="text-zinc-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  {lead.sources.length === 0 ? (
                    <span className="text-zinc-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-64">
                      {lead.sources.map((s) => {
                        const text = `${s.category} en ${s.city}`;
                        return (
                          <Badge
                            key={s.id}
                            className="bg-zinc-100 text-zinc-700 max-w-56"
                            title={text}
                          >
                            <span className="truncate">{text}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
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
                <td className="px-4 py-3 align-top text-zinc-500 text-xs">
                  {formatDistanceToNow(new Date(lead.last_scraped_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

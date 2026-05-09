"use client";

import { Star, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Lead } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { getProvincePillColor } from "@/lib/argentina";
import { getCategoryLabel } from "@/lib/categories";

interface LeadsTableProps {
  leads: Lead[];
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
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Provincia</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Sitio web</th>
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
                  <div className="font-medium text-zinc-900">{lead.name}</div>
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
                  {lead.phone ?? "—"}
                </td>
                <td className="px-4 py-3 align-top">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                    >
                      <span className="truncate max-w-[200px]">
                        {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
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

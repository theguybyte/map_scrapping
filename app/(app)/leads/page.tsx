"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatsBar } from "@/components/leads/StatsBar";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { ExportButtons } from "@/components/leads/ExportButtons";
import { PROVINCES } from "@/lib/argentina";
import { CATEGORIES, getCategoryLabel } from "@/lib/categories";
import type { Lead } from "@/lib/types";

interface Stats {
  total: number;
  withWebsite: number;
  withPhone: number;
  totalSearches: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    withWebsite: 0,
    withPhone: 0,
    totalSearches: 0,
  });
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [category, setCategory] = useState("");
  const [minRating, setMinRating] = useState("");

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (province) params.set("province", province);
      if (category) params.set("category", category);
      if (minRating) params.set("minRating", minRating);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { leads: Lead[]; stats: Stats };
        setLeads(data.leads);
        setStats(data.stats);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [q, province, category, minRating]);

  const categories = useMemo(() => {
    const slugs = new Set<string>();
    leads.forEach((l) => l.category_id && slugs.add(l.category_id));
    return CATEGORIES.filter((c) => slugs.has(c.slug)).sort((a, b) =>
      a.label_es.localeCompare(b.label_es, "es"),
    );
  }, [leads]);

  return (
    <div className="px-6 py-6 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Mis leads</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Todos los leads scrapeados, deduplicados por place_id.
        </p>
      </div>

      <StatsBar {...stats} />

      <div className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[180px]">
          <Label htmlFor="q">Buscar</Label>
          <Input
            id="q"
            placeholder="Nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="space-y-1 min-w-[180px]">
          <Label>Provincia</Label>
          <Select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            <option value="">Todas</option>
            {PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1 min-w-[200px]">
          <Label>Categoría</Label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label_es}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1 min-w-[140px]">
          <Label>Rating</Label>
          <Select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
          >
            <option value="">Cualquiera</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="4.5">4.5+</option>
          </Select>
        </div>
        <div className="ml-auto">
          <ExportButtons leads={leads} />
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Cargando leads…
        </div>
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}

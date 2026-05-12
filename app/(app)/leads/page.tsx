"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatsBar } from "@/components/leads/StatsBar";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { ExportButtons } from "@/components/leads/ExportButtons";
import { CityAutocomplete } from "@/components/search/CityAutocomplete";
import { MultiSelectAutocomplete } from "@/components/ui/multi-select-autocomplete";
import { PROVINCES } from "@/lib/argentina";
import { CATEGORIES } from "@/lib/categories";
import type { LeadWithSources } from "@/lib/types";

const PAGE_SIZE = 50;

interface Stats {
  total: number;
  withWebsite: number;
  withPhone: number;
  totalSearches: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithSources[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    withWebsite: 0,
    withPhone: 0,
    totalSearches: 0,
  });
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [minRating, setMinRating] = useState("");
  const [origins, setOrigins] = useState<string[]>([]);
  const [originOptions, setOriginOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Origins key — stable string for dependency tracking
  const originsKey = origins.join("|");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/searches/origins");
      if (!res.ok) return;
      const data = (await res.json()) as { origins: string[] };
      if (!cancelled) setOriginOptions(data.origins ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [q, province, city, category, minRating, originsKey]);

  useEffect(() => {
    tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (province) params.set("province", province);
      if (city) params.set("city", city);
      if (category) params.set("category", category);
      if (minRating) params.set("minRating", minRating);
      for (const o of origins) params.append("origins", o);
      params.set("page", String(page));

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as {
          leads: LeadWithSources[];
          stats: Stats;
          filteredTotal: number;
        };
        setLeads(data.leads);
        setStats(data.stats);
        setFilteredTotal(data.filteredTotal);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [q, province, city, category, minRating, originsKey, page]);

  const categories = useMemo(() => {
    const slugs = new Set<string>();
    leads.forEach((l) => l.category_id && slugs.add(l.category_id));
    return CATEGORIES.filter((c) => slugs.has(c.slug)).sort((a, b) =>
      a.label_es.localeCompare(b.label_es, "es"),
    );
  }, [leads]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));

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
        <div className="space-y-1 flex-1 basis-[220px] min-w-[180px]">
          <Label htmlFor="q">Buscar</Label>
          <Input
            id="q"
            placeholder="Nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="space-y-1 w-[180px] shrink-0">
          <Label>Provincia</Label>
          <Select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full"
          >
            <option value="">Todas</option>
            {PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1 w-[180px] shrink-0">
          <Label htmlFor="city">Ciudad</Label>
          <CityAutocomplete
            id="city"
            province={province}
            value={city}
            confirmed={false}
            onChange={(next) => setCity(next)}
          />
        </div>
        <div className="space-y-1 w-[200px] shrink-0">
          <Label>Categoría</Label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label_es}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1 w-[140px] shrink-0">
          <Label>Rating</Label>
          <Select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="w-full"
          >
            <option value="">Cualquiera</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="4.5">4.5+</option>
          </Select>
        </div>
        <div className="space-y-1 flex-1 basis-[260px] min-w-[220px]">
          <Label htmlFor="origins">Origen</Label>
          <MultiSelectAutocomplete
            id="origins"
            options={originOptions}
            value={origins}
            onChange={setOrigins}
            placeholder="Todos los orígenes"
            emptyMessage="Sin orígenes"
          />
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
        <LeadsTable leads={leads} scrollContainerRef={tableScrollRef} />
      )}

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1 || loading}
            className="px-2 py-1.5 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Primera página"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-3 py-1.5 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
        </div>
        <span>
          Página {page} de {totalPages}
          {filteredTotal > 0 && (
            <span className="ml-2 text-zinc-400">({filteredTotal} resultados)</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1.5 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages || loading}
            className="px-2 py-1.5 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Última página"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}

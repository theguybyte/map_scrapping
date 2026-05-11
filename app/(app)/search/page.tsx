"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LeafletMap } from "@/components/map/LeafletMap";
import {
  SearchSidebar,
  type SearchFormState,
} from "@/components/search/SearchSidebar";
import { ResultsPreview } from "@/components/search/ResultsPreview";
import { ConfirmDialog } from "@/components/ui/dialog";
import { PROVINCES, getProvince } from "@/lib/argentina";
import type { Lead, Search } from "@/lib/types";

const DEFAULT_PROVINCE = "San Luis";

export default function SearchPage() {
  const router = useRouter();
  const defaultProv = getProvince(DEFAULT_PROVINCE) ?? PROVINCES[0];

  const [form, setForm] = useState<SearchFormState>({
    province: defaultProv.name,
    city: defaultProv.capital,
    cityConfirmed: true,
    category: "",
    radiusKm: defaultProv.defaultRadius,
    scrapeContacts: false,
  });
  const [center, setCenter] = useState({
    lat: defaultProv.lat,
    lng: defaultProv.lng,
  });

  const [search, setSearch] = useState<Search | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] =
    useState<"idle" | "running" | "completed" | "failed">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    found: number;
    target: number;
  } | null>(null);

  const [cacheHit, setCacheHit] = useState<{
    searchId: string;
    daysAgo: number;
    totalResults: number;
    cachedRadiusKm: number;
  } | null>(null);
  const [showRescrapeModal, setShowRescrapeModal] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recenter synchronously with form changes so center + radiusKm land in the
  // same render — otherwise MapRecenter fires fitBounds twice (stale center +
  // new radius, then new center) and Leaflet's animated pan can strand the
  // viewport on the previous province.
  function handleFormChange(next: SearchFormState) {
    if (next.province !== form.province || next.city !== form.city) {
      const prov = getProvince(next.province);
      if (prov && next.city.toLowerCase() === prov.capital.toLowerCase()) {
        setCenter({ lat: prov.lat, lng: prov.lng });
      }
    }
    setForm(next);
  }

  // Cache check (debounced)
  useEffect(() => {
    if (cacheTimer.current) clearTimeout(cacheTimer.current);
    if (!form.city.trim() || !form.category.trim()) {
      setCacheHit(null);
      return;
    }
    cacheTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/searches?city=${encodeURIComponent(form.city)}&category=${encodeURIComponent(form.category)}&radiusKm=${form.radiusKm}`,
        );
        const data = (await res.json()) as { search: Search | null };
        if (!data.search) {
          setCacheHit(null);
          return;
        }
        const completedAt = new Date(
          data.search.completed_at ?? data.search.created_at,
        );
        const daysAgo = Math.floor(
          (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        setCacheHit({
          searchId: data.search.id,
          daysAgo,
          totalResults: data.search.total_results ?? 0,
          cachedRadiusKm: data.search.radius_km,
        });
      } catch {
        setCacheHit(null);
      }
    }, 500);
    return () => {
      if (cacheTimer.current) clearTimeout(cacheTimer.current);
    };
  }, [form.city, form.category]);

  function pollSearch(id: string) {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    const tick = async () => {
      try {
        const res = await fetch(`/api/searches/${id}`);
        if (!res.ok) {
          setStatus("failed");
          setErrorMsg("No se pudo consultar el estado.");
          return;
        }
        const data = (await res.json()) as {
          search: Search;
          leads: Lead[];
          progress: { found: number; target: number } | null;
        };
        setSearch(data.search);
        setLeads(data.leads);
        setProgress(data.progress);

        if (data.search.status === "completed") {
          setStatus("completed");
          setProgress(null);
          router.refresh();
          const completedAt = new Date(
            data.search.completed_at ?? data.search.created_at,
          );
          setCacheHit({
            searchId: data.search.id,
            daysAgo: Math.floor(
              (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24),
            ),
            totalResults: data.search.total_results ?? 0,
            cachedRadiusKm: data.search.radius_km,
          });
          return;
        }
        if (data.search.status === "failed") {
          setStatus("failed");
          setErrorMsg(data.search.error_message);
          setProgress(null);
          return;
        }
        pollTimer.current = setTimeout(tick, 3500);
      } catch {
        pollTimer.current = setTimeout(tick, 5000);
      }
    };
    tick();
  }

  useEffect(() => () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
  }, []);

  async function startScrape(force: boolean) {
    setStatus("running");
    setErrorMsg(null);
    setLeads([]);
    setSearch(null);
    setProgress(null);

    // If we have a cache hit and user didn't explicitly force re-scrape, just load it
    if (cacheHit && !force) {
      try {
        const res = await fetch(`/api/searches/${cacheHit.searchId}`);
        const data = (await res.json()) as { search: Search; leads: Lead[] };
        setSearch(data.search);
        setLeads(data.leads);
        setStatus("completed");
        return;
      } catch {
        // fall through to fresh scrape
      }
    }

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          province: form.province,
          city: form.city,
          category: form.category,
          radiusKm: form.radiusKm,
          scrapeContacts: form.scrapeContacts,
        }),
      });
      const data = (await res.json()) as {
        search_id?: string;
        center?: { lat: number; lng: number };
        error?: string;
      };
      if (!res.ok || !data.search_id) {
        setStatus("failed");
        setErrorMsg(data.error ?? "No se pudo iniciar el scraping.");
        return;
      }
      if (data.center) setCenter(data.center);
      pollSearch(data.search_id);
    } catch (err) {
      setStatus("failed");
      setErrorMsg(err instanceof Error ? err.message : "Error de red");
    }
  }

  function handleStart(force: boolean) {
    if (force) {
      setShowRescrapeModal(true);
    } else {
      startScrape(false);
    }
  }

  const isRunning = status === "running";

  const headerSummary = useMemo(() => {
    if (!search) return null;
    return `${search.category} en ${search.city}, ${search.province} • ${search.total_results ?? 0} leads`;
  }, [search]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <SearchSidebar
        state={form}
        onChange={handleFormChange}
        onStart={handleStart}
        onCityCoords={(lat, lng, radiusKm) => {
          setCenter({ lat, lng });
          if (typeof radiusKm === "number") {
            setForm((prev) => ({ ...prev, radiusKm }));
          }
        }}
        isRunning={isRunning}
        cacheHit={cacheHit}
      />
      {showRescrapeModal && (
        <ConfirmDialog
          title="¿Re-scrapear?"
          description="Esto iniciará un nuevo scraping y consumirá créditos de Apify. Los resultados anteriores serán reemplazados. ¿Confirmás?"
          confirmLabel="Sí, re-scrapear"
          cancelLabel="Cancelar"
          onConfirm={() => {
            setShowRescrapeModal(false);
            startScrape(true);
          }}
          onCancel={() => setShowRescrapeModal(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 min-h-0 relative">
          <LeafletMap
            center={center}
            radiusKm={form.radiusKm}
            leads={status === "completed" ? leads : []}
          />
          {headerSummary && (
            <div className="absolute top-3 left-3 right-3 z-20 rounded-md bg-white/95 backdrop-blur border border-zinc-200 px-3 py-2 text-sm text-zinc-700 shadow-sm">
              {headerSummary}
            </div>
          )}
        </div>

        <div className="h-[200px] shrink-0 border-t border-zinc-200 bg-white">
          <ResultsPreview
            leads={leads}
            status={status}
            errorMessage={errorMsg}
            progress={progress}
          />
        </div>
      </div>
    </div>
  );
}

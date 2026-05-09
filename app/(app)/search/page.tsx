"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const defaultProv = getProvince(DEFAULT_PROVINCE) ?? PROVINCES[0];

  const [form, setForm] = useState<SearchFormState>({
    province: defaultProv.name,
    city: defaultProv.capital,
    category: "",
    radiusKm: defaultProv.defaultRadius,
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

  const [cacheHit, setCacheHit] = useState<{
    searchId: string;
    daysAgo: number;
    totalResults: number;
    cachedRadiusKm: number;
  } | null>(null);
  const [showRescrapeModal, setShowRescrapeModal] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always-current form ref so async callbacks can detect stale state
  const formRef = useRef(form);
  formRef.current = form;

  // Recenter map when province changes (use hardcoded coords)
  useEffect(() => {
    const prov = getProvince(form.province);
    if (prov && form.city.toLowerCase() === prov.capital.toLowerCase()) {
      setCenter({ lat: prov.lat, lng: prov.lng });
    }
  }, [form.province, form.city]);

  // Geocode non-capital city (debounced)
  useEffect(() => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (!form.province || !form.city.trim()) return;

    const prov = getProvince(form.province);
    if (prov && form.city.toLowerCase() === prov.capital.toLowerCase()) {
      return; // already handled
    }

    const ac = new AbortController();
    const reqCity = form.city;
    const reqProvince = form.province;
    geocodeTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?city=${encodeURIComponent(reqCity)}&province=${encodeURIComponent(reqProvince)}`,
          { signal: ac.signal },
        );
        if (!res.ok) {
          console.log("[geocode] response not ok", res.status);
          return;
        }
        const data = (await res.json()) as {
          lat: number;
          lng: number;
          radiusKm?: number;
        };
        const current = formRef.current;
        if (
          ac.signal.aborted ||
          current.city !== reqCity ||
          current.province !== reqProvince
        ) {
          console.log(
            `[geocode] discarding stale response for ${reqCity}, ${reqProvince} (current: ${current.city}, ${current.province})`,
            data,
          );
          return;
        }
        console.log("[geocode] response", data);
        setCenter({ lat: data.lat, lng: data.lng });
        if (typeof data.radiusKm === "number") {
          console.log("[geocode] applying radiusKm =", data.radiusKm);
          setForm((prev) => ({ ...prev, radiusKm: data.radiusKm! }));
        } else {
          console.log("[geocode] no radiusKm in response");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          console.log("[geocode] aborted (province/city changed)");
          return;
        }
        console.log("[geocode] error", err);
      }
    }, 800);

    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      ac.abort();
    };
  }, [form.city, form.province]);

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
        const data = (await res.json()) as { search: Search; leads: Lead[] };
        setSearch(data.search);
        setLeads(data.leads);

        if (data.search.status === "completed") {
          setStatus("completed");
          return;
        }
        if (data.search.status === "failed") {
          setStatus("failed");
          setErrorMsg(data.search.error_message);
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
        onChange={setForm}
        onStart={handleStart}
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
          />
        </div>
      </div>
    </div>
  );
}

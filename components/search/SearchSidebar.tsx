"use client";

import { useEffect, useState } from "react";
import { Play, Clock, Loader2, Info, Mail } from "lucide-react";
import { PROVINCES } from "@/lib/argentina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/search/CityAutocomplete";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export interface SearchFormState {
  province: string;
  city: string;
  cityConfirmed: boolean;
  category: string;
  radiusKm: number;
  scrapeContacts: boolean;
}

interface CacheHit {
  searchId: string;
  daysAgo: number;
  totalResults: number;
  cachedRadiusKm: number;
}

interface SearchSidebarProps {
  state: SearchFormState;
  onChange: (next: SearchFormState) => void;
  onStart: (force: boolean) => void;
  onCityCoords?: (lat: number, lng: number, radiusKm?: number) => void;
  isRunning: boolean;
  cacheHit: CacheHit | null;
}

export function SearchSidebar({
  state,
  onChange,
  onStart,
  onCityCoords,
  isRunning,
  cacheHit,
}: SearchSidebarProps) {
  const [localRadius, setLocalRadius] = useState(state.radiusKm);

  useEffect(() => {
    console.log("[sidebar] state.radiusKm changed →", state.radiusKm);
    setLocalRadius(state.radiusKm);
  }, [state.radiusKm]);

  return (
    <aside className="w-[280px] shrink-0 border-r border-zinc-200 bg-white flex flex-col h-full overflow-y-auto">
      <div className="p-5 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Nueva búsqueda</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configurá la zona y categoría a explorar.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="province">Provincia</Label>
          <Select
            id="province"
            value={state.province}
            onChange={(e) => {
              const prov = PROVINCES.find((p) => p.name === e.target.value);
              onChange({
                ...state,
                province: e.target.value,
                city: prov?.capital ?? state.city,
                cityConfirmed: true, // capital is auto-confirmed
                radiusKm: prov?.defaultRadius ?? state.radiusKm,
              });
            }}
          >
            <option value="">Seleccioná…</option>
            {PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Ciudad / localidad</Label>
          <CityAutocomplete
            id="city"
            province={state.province}
            value={state.city}
            confirmed={state.cityConfirmed}
            onChange={(city, coords) => {
              onChange({ ...state, city, cityConfirmed: Boolean(coords) });
              if (coords) onCityCoords?.(coords.lat, coords.lng, coords.radiusKm);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category">Categoría</Label>
          <Input
            id="category"
            placeholder="Ej. agencias de marketing"
            value={state.category}
            onChange={(e) => onChange({ ...state, category: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label>Radio</Label>
            <span className="text-xs font-medium text-zinc-700">
              {localRadius} km
            </span>
          </div>
          <Slider
            min={1}
            max={50}
            step={1}
            value={localRadius}
            onChange={(v) => {
              setLocalRadius(v);
              onChange({ ...state, radiusKm: v });
            }}
          />
          <div className="flex justify-between text-[10px] text-zinc-400 px-0.5">
            <span>1</span>
            <span>25</span>
            <span>50</span>
          </div>
          <div className="flex items-start gap-1.5 mt-1 text-[11px] text-zinc-400">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <span>Elegí un radio suficiente desde el principio — ampliar más tarde implica re-scrapear y consume créditos de Apify.</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
              checked={state.scrapeContacts}
              onChange={(e) =>
                onChange({ ...state, scrapeContacts: e.target.checked })
              }
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm text-zinc-900">
                <Mail className="h-3.5 w-3.5 text-zinc-500" />
                Buscar emails y redes
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Visita el sitio web de cada negocio. Más lento y consume créditos extra de Apify (~30–50% de aciertos).
              </p>
            </div>
          </label>
        </div>

        {cacheHit && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-medium mb-1">
              <Clock className="h-3.5 w-3.5" />
              Búsqueda reciente
            </div>
            <p>
              Hace{" "}
              <span className="font-semibold">{cacheHit.daysAgo} días</span> —{" "}
              <span className="font-semibold">{cacheHit.totalResults}</span>{" "}
              leads encontrados.
            </p>
            {cacheHit.cachedRadiusKm > state.radiusKm && (
              <p className="mt-1 text-amber-800">
                Resultados guardados cubren{" "}
                <span className="font-semibold">{cacheHit.cachedRadiusKm} km</span>{" "}
                — se usarán para tu radio de{" "}
                <span className="font-semibold">{state.radiusKm} km</span>.
              </p>
            )}
            <p className="mt-1 text-amber-800">
              Podés re-scrapear para actualizar.
            </p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Button
            className="w-full"
            disabled={
              isRunning ||
              !state.province ||
              !state.cityConfirmed ||
              !state.category.trim()
            }
            onClick={() => onStart(Boolean(cacheHit))}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scrapeando…
              </>
            ) : cacheHit ? (
              <>
                <Play className="h-4 w-4" />
                Re-scrapear
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Iniciar scraping
              </>
            )}
          </Button>
          <p className="text-[11px] text-zinc-500 text-center">
            Tiempo estimado: 1–3 minutos
          </p>
        </div>
      </div>
    </aside>
  );
}

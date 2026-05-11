"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitySuggestion {
  name: string;
  lat: number;
  lng: number;
  radiusKm?: number;
}

interface CityAutocompleteProps {
  id?: string;
  province: string;
  value: string;
  confirmed: boolean;
  onChange: (
    city: string,
    coords?: { lat: number; lng: number; radiusKm?: number },
  ) => void;
}

export function CityAutocomplete({
  id,
  province,
  value,
  confirmed,
  onChange,
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when parent resets city (e.g. province change sets new capital)
  useEffect(() => {
    setInputValue(value);
    setSuggestions([]);
    setOpen(false);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setInputValue(q);
    onChange(q); // propagate raw text — no coords means unconfirmed

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.length < 2 || !province) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/geocode/suggest?q=${encodeURIComponent(q)}&province=${encodeURIComponent(province)}`,
          { signal: ac.signal },
        );
        if (!res.ok) throw new Error("suggest failed");
        const data = (await res.json()) as { suggestions: CitySuggestion[] };
        setSuggestions(data.suggestions);
        setOpen(data.suggestions.length > 0);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
        setOpen(false);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 400);
  }

  function handleSelect(s: CitySuggestion) {
    setSuggestions([]);
    setOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    onChange(s.name, { lat: s.lat, lng: s.lng, radiusKm: s.radiusKm });
  }

  function handleClear() {
    setInputValue("");
    setSuggestions([]);
    setOpen(false);
    onChange("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
  }

  // Confirmed state: show a chip instead of the text input
  if (confirmed && value) {
    return (
      <div
        className="flex h-9 w-full items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1"
        aria-label={`Ciudad seleccionada: ${value}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-zinc-800">
          {value}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto rounded-full p-0.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
          aria-label="Cambiar ciudad"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Unconfirmed state: show the text input with suggestion dropdown
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Ej. Villa Mercedes"
          autoComplete="off"
          className={cn(
            "flex h-9 w-full rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-50",
            loading && "pr-8",
          )}
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-400 pointer-events-none" />
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md text-sm max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={`${s.lat},${s.lng}`}
              onMouseDown={(e) => {
                e.preventDefault(); // keep input focused until selection
                handleSelect(s);
              }}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-50 text-zinc-800"
            >
              <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

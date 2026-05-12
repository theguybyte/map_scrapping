"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectAutocompleteProps {
  id?: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelectAutocomplete({
  id,
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  emptyMessage = "Sin coincidencias",
  className,
  disabled,
}: MultiSelectAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSet = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((opt) => {
      if (selectedSet.has(opt.toLowerCase())) return false;
      if (!q) return true;
      return opt.toLowerCase().includes(q);
    });
  }, [options, query, selectedSet]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

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

  function addOption(opt: string) {
    if (!opt) return;
    if (selectedSet.has(opt.toLowerCase())) return;
    onChange([...value, opt]);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  function removeOption(opt: string) {
    onChange(value.filter((v) => v.toLowerCase() !== opt.toLowerCase()));
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (open && filtered[activeIndex]) {
        e.preventDefault();
        addOption(filtered[activeIndex]);
      }
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      removeOption(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-purple-400",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-200"
          >
            <span className="max-w-[140px] truncate">{v}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeOption(v);
              }}
              className="rounded-full p-0.5 text-purple-500 hover:bg-purple-100 hover:text-purple-700"
              aria-label={`Quitar ${v}`}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          autoComplete="off"
          className="flex-1 min-w-[80px] bg-transparent py-0.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed"
        />
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      {open && !disabled && (
        <ul className="absolute z-50 mt-1 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white text-sm shadow-md max-h-56">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-zinc-400">{emptyMessage}</li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addOption(opt);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-zinc-800",
                  i === activeIndex ? "bg-zinc-100" : "hover:bg-zinc-50",
                )}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

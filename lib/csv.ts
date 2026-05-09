import Papa from "papaparse";
import type { Lead } from "./types";

const CSV_COLUMNS: Array<{ key: keyof Lead; header: string }> = [
  { key: "name", header: "Nombre" },
  { key: "category", header: "Categoría" },
  { key: "phone", header: "Teléfono" },
  { key: "website", header: "Sitio web" },
  { key: "email", header: "Email" },
  { key: "instagram", header: "Instagram" },
  { key: "facebook", header: "Facebook" },
  { key: "rating", header: "Rating" },
  { key: "review_count", header: "# Reviews" },
  { key: "address", header: "Dirección" },
  { key: "city", header: "Ciudad" },
  { key: "province", header: "Provincia" },
  { key: "google_maps_url", header: "Google Maps" },
  { key: "place_id", header: "Place ID" },
  { key: "last_scraped_at", header: "Última actualización" },
];

export function leadsToCsv(leads: Lead[]): string {
  return Papa.unparse({
    fields: CSV_COLUMNS.map((c) => c.header),
    data: leads.map((l) => CSV_COLUMNS.map((c) => l[c.key] ?? "")),
  });
}

export function leadsToTsv(leads: Lead[]): string {
  return Papa.unparse(
    {
      fields: CSV_COLUMNS.map((c) => c.header),
      data: leads.map((l) => CSV_COLUMNS.map((c) => l[c.key] ?? "")),
    },
    { delimiter: "\t" },
  );
}

export function downloadCsv(leads: Lead[], filename = "leads.csv") {
  const csv = leadsToCsv(leads);
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

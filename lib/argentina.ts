import type { Province } from "./types";

export const PROVINCES: Province[] = [
  { name: "Buenos Aires", capital: "La Plata", lat: -34.9215, lng: -57.9545, defaultRadius: 35, pillColor: "bg-sky-100 text-sky-800" },
  { name: "CABA", capital: "Ciudad Autónoma de Buenos Aires", lat: -34.6037, lng: -58.3816, defaultRadius: 15, pillColor: "bg-blue-100 text-blue-800" },
  { name: "Catamarca", capital: "San Fernando del Valle de Catamarca", lat: -28.4696, lng: -65.7795, defaultRadius: 20, pillColor: "bg-amber-100 text-amber-800" },
  { name: "Chaco", capital: "Resistencia", lat: -27.4514, lng: -58.9867, defaultRadius: 25, pillColor: "bg-lime-100 text-lime-800" },
  { name: "Chubut", capital: "Rawson", lat: -43.3002, lng: -65.1023, defaultRadius: 30, pillColor: "bg-cyan-100 text-cyan-800" },
  { name: "Córdoba", capital: "Córdoba", lat: -31.4201, lng: -64.1888, defaultRadius: 30, pillColor: "bg-green-100 text-green-800" },
  { name: "Corrientes", capital: "Corrientes", lat: -27.4691, lng: -58.8309, defaultRadius: 25, pillColor: "bg-emerald-100 text-emerald-800" },
  { name: "Entre Ríos", capital: "Paraná", lat: -31.7319, lng: -60.5238, defaultRadius: 25, pillColor: "bg-teal-100 text-teal-800" },
  { name: "Formosa", capital: "Formosa", lat: -26.1849, lng: -58.1731, defaultRadius: 25, pillColor: "bg-yellow-100 text-yellow-800" },
  { name: "Jujuy", capital: "San Salvador de Jujuy", lat: -24.1858, lng: -65.2995, defaultRadius: 20, pillColor: "bg-orange-100 text-orange-800" },
  { name: "La Pampa", capital: "Santa Rosa", lat: -36.6203, lng: -64.2906, defaultRadius: 30, pillColor: "bg-rose-100 text-rose-800" },
  { name: "La Rioja", capital: "La Rioja", lat: -29.4135, lng: -66.8559, defaultRadius: 25, pillColor: "bg-red-100 text-red-800" },
  { name: "Mendoza", capital: "Mendoza", lat: -32.8895, lng: -68.8458, defaultRadius: 30, pillColor: "bg-violet-100 text-violet-800" },
  { name: "Misiones", capital: "Posadas", lat: -27.3621, lng: -55.9008, defaultRadius: 25, pillColor: "bg-fuchsia-100 text-fuchsia-800" },
  { name: "Neuquén", capital: "Neuquén", lat: -38.9516, lng: -68.0591, defaultRadius: 30, pillColor: "bg-indigo-100 text-indigo-800" },
  { name: "Río Negro", capital: "Viedma", lat: -40.8135, lng: -62.9967, defaultRadius: 30, pillColor: "bg-purple-100 text-purple-800" },
  { name: "Salta", capital: "Salta", lat: -24.7821, lng: -65.4232, defaultRadius: 25, pillColor: "bg-pink-100 text-pink-800" },
  { name: "San Juan", capital: "San Juan", lat: -31.5375, lng: -68.5364, defaultRadius: 25, pillColor: "bg-amber-100 text-amber-900" },
  { name: "San Luis", capital: "San Luis", lat: -33.2950, lng: -66.3356, defaultRadius: 20, pillColor: "bg-purple-100 text-purple-800" },
  { name: "Santa Cruz", capital: "Río Gallegos", lat: -51.6230, lng: -69.2168, defaultRadius: 35, pillColor: "bg-slate-100 text-slate-800" },
  { name: "Santa Fe", capital: "Santa Fe", lat: -31.6333, lng: -60.7000, defaultRadius: 30, pillColor: "bg-emerald-100 text-emerald-900" },
  { name: "Santiago del Estero", capital: "Santiago del Estero", lat: -27.7951, lng: -64.2615, defaultRadius: 25, pillColor: "bg-orange-100 text-orange-900" },
  { name: "Tierra del Fuego", capital: "Ushuaia", lat: -54.8019, lng: -68.3030, defaultRadius: 30, pillColor: "bg-blue-100 text-blue-900" },
  { name: "Tucumán", capital: "San Miguel de Tucumán", lat: -26.8083, lng: -65.2176, defaultRadius: 20, pillColor: "bg-red-100 text-red-900" },
];

export function getProvince(name: string): Province | undefined {
  const target = name.trim().toLowerCase();
  return PROVINCES.find((p) => p.name.toLowerCase() === target);
}

export function getProvincePillColor(name: string): string {
  return getProvince(name)?.pillColor ?? "bg-zinc-100 text-zinc-800";
}

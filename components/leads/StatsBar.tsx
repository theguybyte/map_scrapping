import { Card } from "@/components/ui/card";
import { Globe, Phone, Database, Search } from "lucide-react";

interface StatsBarProps {
  total: number;
  withWebsite: number;
  withPhone: number;
  totalSearches: number;
}

export function StatsBar({
  total,
  withWebsite,
  withPhone,
  totalSearches,
}: StatsBarProps) {
  const cells = [
    {
      icon: Database,
      label: "Total leads",
      value: total,
      tone: "text-purple-700 bg-purple-50",
    },
    {
      icon: Globe,
      label: "Con sitio web",
      value: withWebsite,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      icon: Phone,
      label: "Con teléfono",
      value: withPhone,
      tone: "text-sky-700 bg-sky-50",
    },
    {
      icon: Search,
      label: "Búsquedas realizadas",
      value: totalSearches,
      tone: "text-amber-700 bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cells.map((c) => (
        <Card key={c.label} className="p-4 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-md ${c.tone}`}
          >
            <c.icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide">
              {c.label}
            </div>
            <div className="text-2xl font-semibold text-zinc-900 tabular-nums">
              {c.value.toLocaleString("es-AR")}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

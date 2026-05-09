"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  leadCount: number;
}

export function Navbar({ leadCount }: NavbarProps) {
  const pathname = usePathname();
  const tabs = [
    { href: "/search", label: "Nueva búsqueda" },
    { href: "/leads", label: "Mis leads", count: leadCount },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center px-6 gap-8">
        <Link href="/search" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-600 text-white">
            <MapPin className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            LeadMap
          </span>
        </Link>

        <nav className="flex items-center gap-1 h-full">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "relative h-full flex items-center px-4 text-sm font-medium transition-colors",
                  active
                    ? "text-purple-700"
                    : "text-zinc-600 hover:text-zinc-900",
                )}
              >
                {t.label}
                {typeof t.count === "number" && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-100 text-zinc-700 text-xs px-1.5 py-0.5 min-w-[1.25rem]">
                    {t.count}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 bg-purple-600" />
                )}
              </Link>
            );
          })}
        </nav>

        <form action="/auth/signout" method="post" className="ml-auto">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}

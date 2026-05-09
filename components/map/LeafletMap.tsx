"use client";

import dynamic from "next/dynamic";
import type { LeafletMapInnerProps } from "./LeafletMapInner";

const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-zinc-100 text-sm text-zinc-500">
      Cargando mapa…
    </div>
  ),
});

export function LeafletMap(props: LeafletMapInnerProps) {
  return <LeafletMapInner {...props} />;
}

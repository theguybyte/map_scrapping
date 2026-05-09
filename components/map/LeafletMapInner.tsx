"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Lead } from "@/lib/types";
import { haversineKm } from "@/lib/utils";

export interface LeafletMapInnerProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  leads?: Lead[];
}

function makeNumberedIcon(num: number, outside: boolean) {
  return L.divIcon({
    html: `<div class="leadmap-numbered-pin${outside ? " outside" : ""}">${num}</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeCrosshairIcon() {
  return L.divIcon({
    html: `<div style="position:relative;width:18px;height:18px">
      <div style="position:absolute;inset:0;border:2px solid #f97316;border-radius:999px"></div>
      <div class="leadmap-crosshair-dot" style="position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;background:#f97316;border-radius:999px"></div>
    </div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function MapRecenter({
  center,
  radiusKm,
}: {
  center: { lat: number; lng: number };
  radiusKm: number;
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(center.lat, center.lng).toBounds(
      radiusKm * 2 * 1000,
    );
    map.fitBounds(bounds, { padding: [24, 24], animate: true });
  }, [center.lat, center.lng, radiusKm, map]);
  return null;
}

export default function LeafletMapInner({
  center,
  radiusKm,
  leads = [],
}: LeafletMapInnerProps) {
  const crosshair = useMemo(() => makeCrosshairIcon(), []);
  const [tilesLoading, setTilesLoading] = useState(true);

  return (
    <div className="relative h-full w-full">
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{
          loading: () => setTilesLoading(true),
          load: () => setTilesLoading(false),
        }}
      />
      <MapRecenter center={center} radiusKm={radiusKm} />

      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{
          color: "#7c3aed",
          fillColor: "#7c3aed",
          fillOpacity: 0.08,
          weight: 2,
          dashArray: "6 6",
        }}
      />

      <Marker position={[center.lat, center.lng]} icon={crosshair} />

      {leads.map((lead, i) => {
        if (lead.latitude == null || lead.longitude == null) return null;
        const distance = haversineKm(center, {
          lat: lead.latitude,
          lng: lead.longitude,
        });
        const outside = distance > radiusKm;
        return (
          <Marker
            key={lead.place_id}
            position={[lead.latitude, lead.longitude]}
            icon={makeNumberedIcon(i + 1, outside)}
          >
            <Popup>
              <div className="text-sm font-sans">
                <div className="font-semibold text-zinc-900">{lead.name}</div>
                {lead.address && (
                  <div className="text-zinc-600 text-xs">{lead.address}</div>
                )}
                {lead.phone && (
                  <div className="text-zinc-700 mt-1">{lead.phone}</div>
                )}
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 underline break-all"
                  >
                    {lead.website}
                  </a>
                )}
                {lead.rating != null && (
                  <div className="text-amber-600 mt-1">
                    ★ {lead.rating}
                    {lead.review_count != null && (
                      <span className="text-zinc-500">
                        {" "}
                        ({lead.review_count})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
      {tilesLoading && (
        <div className="pointer-events-none absolute top-3 right-3 z-1000 flex items-center gap-2 rounded-full bg-white/95 backdrop-blur border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 shadow-sm">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-purple-600" />
          Actualizando mapa…
        </div>
      )}
    </div>
  );
}

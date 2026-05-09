import { getApifyAccountLimits, getApifyUserInfo } from "@/lib/apify";
import { ApifyTokenMissingError } from "@/lib/settings";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function UsageCard() {
  let info, limits;
  try {
    [info, limits] = await Promise.all([
      getApifyUserInfo(),
      getApifyAccountLimits(),
    ]);
  } catch (err) {
    if (err instanceof ApifyTokenMissingError) {
      return (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <AlertCircle className="h-4 w-4" />
          Configurá el token para ver el uso de la cuenta.
        </div>
      );
    }
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
        No se pudo consultar la API de Apify:{" "}
        {err instanceof Error ? err.message : "error desconocido"}
      </div>
    );
  }

  const currentUsd = limits?.current.monthlyUsageUsd ?? 0;
  const limitUsd =
    limits?.limits.maxMonthlyUsageUsd ??
    info.plan?.maxMonthlyUsageUsd ??
    info.plan?.monthlyUsageCreditsUsd ??
    0;
  const pct = limitUsd > 0 ? Math.min(100, (currentUsd / limitUsd) * 100) : 0;

  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Plan</span>
          <Badge className="bg-purple-100 text-purple-700 font-mono">
            {info.plan?.id ?? "—"}
          </Badge>
          {info.username && (
            <span className="text-sm text-zinc-500">· {info.username}</span>
          )}
        </div>
        <div className="text-xs text-zinc-500">
          {fmtDate(limits?.monthlyUsageCycle.startAt)} →{" "}
          {fmtDate(limits?.monthlyUsageCycle.endAt)}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold tabular-nums text-zinc-900">
            {fmtUsd(currentUsd)}
          </span>
          <span className="text-sm text-zinc-500 tabular-nums">
            de {fmtUsd(limitUsd)} · {pct.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-[width]`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {limits && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Compute units</dt>
            <dd className="tabular-nums text-zinc-900">
              {limits.current.monthlyActorComputeUnits.toLocaleString()} /{" "}
              {limits.limits.maxMonthlyActorComputeUnits.toLocaleString()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Proxy SERPs</dt>
            <dd className="tabular-nums text-zinc-900">
              {limits.current.monthlyProxySerps.toLocaleString()} /{" "}
              {limits.limits.maxMonthlyProxySerps.toLocaleString()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Actor jobs activos</dt>
            <dd className="tabular-nums text-zinc-900">
              {limits.current.activeActorJobCount} /{" "}
              {limits.limits.maxConcurrentActorJobs}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Retención</dt>
            <dd className="tabular-nums text-zinc-900">
              {limits.limits.dataRetentionDays} días
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export function UsageCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded bg-zinc-100" />
        <div className="h-4 w-40 rounded bg-zinc-100" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-7 w-40 rounded bg-zinc-100" />
        <div className="h-2 w-full rounded-full bg-zinc-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-4 rounded bg-zinc-100" />
        <div className="h-4 rounded bg-zinc-100" />
        <div className="h-4 rounded bg-zinc-100" />
        <div className="h-4 rounded bg-zinc-100" />
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { getApifyToken, maskToken } from "@/lib/settings";
import { TokenForm } from "./TokenForm";
import { UsageCard, UsageCardSkeleton } from "./UsageCard";

export const dynamic = "force-dynamic";

export default async function ApiSettingsPage() {
  const entry = await getApifyToken();
  const hasToken = !!entry;
  const tokenMasked = entry ? maskToken(entry.token) : null;
  const source = entry?.source ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">API</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configurá el token de Apify y revisá el uso del plan.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Apify API Token
        </h2>
        <TokenForm
          hasToken={hasToken}
          tokenMasked={tokenMasked}
          source={source}
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Uso mensual
        </h2>
        <Suspense fallback={<UsageCardSkeleton />}>
          <UsageCard />
        </Suspense>
      </Card>
    </div>
  );
}

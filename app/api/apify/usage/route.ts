import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getApifyAccountLimits,
  getApifyUserInfo,
} from "@/lib/apify";
import { ApifyTokenMissingError } from "@/lib/settings";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [info, limits] = await Promise.all([
      getApifyUserInfo(),
      getApifyAccountLimits(),
    ]);

    const currentUsd = limits?.current.monthlyUsageUsd ?? 0;
    const limitUsd =
      limits?.limits.maxMonthlyUsageUsd ??
      info.plan?.maxMonthlyUsageUsd ??
      info.plan?.monthlyUsageCreditsUsd ??
      0;
    const percentUsed =
      limitUsd > 0 ? Math.min(100, (currentUsd / limitUsd) * 100) : 0;

    return NextResponse.json({
      username: info.username,
      plan: info.plan?.id ?? null,
      planDescription: info.plan?.description ?? null,
      currentUsd,
      limitUsd,
      percentUsed,
      cycleStart: limits?.monthlyUsageCycle.startAt ?? null,
      cycleEnd: limits?.monthlyUsageCycle.endAt ?? null,
    });
  } catch (err) {
    if (err instanceof ApifyTokenMissingError) {
      return NextResponse.json(
        { error: "apify_token_not_configured" },
        { status: 409 },
      );
    }
    const msg = err instanceof Error ? err.message : "apify error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

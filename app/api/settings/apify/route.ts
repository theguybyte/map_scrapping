import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  clearApifyToken,
  getApifyToken,
  maskToken,
  probeApifyToken,
  setApifyToken,
} from "@/lib/settings";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const entry = await getApifyToken();
  if (!entry) {
    return NextResponse.json({
      hasToken: false,
      tokenMasked: null,
      source: null,
    });
  }
  return NextResponse.json({
    hasToken: true,
    tokenMasked: maskToken(entry.token),
    source: entry.source,
  });
}

export async function PUT(request: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const probe = await probeApifyToken(token);
  if (!probe.ok) {
    return NextResponse.json({ error: probe.error }, { status: 400 });
  }

  await setApifyToken(token);

  return NextResponse.json({
    ok: true,
    username: probe.user.username,
    plan: probe.user.plan?.id ?? null,
    tokenMasked: maskToken(token),
    source: "db" as const,
  });
}

export async function DELETE() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await clearApifyToken();
  const entry = await getApifyToken();
  return NextResponse.json({
    ok: true,
    hasToken: !!entry,
    tokenMasked: entry ? maskToken(entry.token) : null,
    source: entry?.source ?? null,
  });
}

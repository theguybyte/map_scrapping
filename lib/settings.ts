import "server-only";
import { ApifyClient } from "apify-client";
import type { User } from "apify-client";
import { createSupabaseAdminClient } from "./supabase/admin";

export type ApifyTokenSource = "db" | "env";

export class ApifyTokenMissingError extends Error {
  constructor() {
    super("Apify API token is not configured");
    this.name = "ApifyTokenMissingError";
  }
}

export async function getApifyToken(): Promise<{
  token: string;
  source: ApifyTokenSource;
} | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("app_settings")
    .select("apify_api_token")
    .eq("id", true)
    .maybeSingle();
  if (!error && data?.apify_api_token) {
    return { token: data.apify_api_token, source: "db" };
  }
  const env = process.env.APIFY_API_TOKEN;
  if (env && env.length > 0) {
    return { token: env, source: "env" };
  }
  return null;
}

export async function setApifyToken(token: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("app_settings")
    .upsert(
      { id: true, apify_api_token: token, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
  if (error) throw new Error(`Failed to save Apify token: ${error.message}`);
}

export async function clearApifyToken(): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("app_settings")
    .update({ apify_api_token: null, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(`Failed to clear Apify token: ${error.message}`);
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "•".repeat(token.length);
  const last4 = token.slice(-4);
  return `apify_api_${"•".repeat(8)}…${last4}`;
}

export async function probeApifyToken(
  token: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  if (!token || token.trim().length === 0) {
    return { ok: false, error: "Token is empty" };
  }
  try {
    const client = new ApifyClient({ token });
    const user = await client.user("me").get();
    return { ok: true, user };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Apify rejected the token";
    return { ok: false, error: msg };
  }
}

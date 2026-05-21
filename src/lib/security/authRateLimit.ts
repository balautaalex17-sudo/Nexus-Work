import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const MIN_CAP = (() => {
  const raw = Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5;
})();

const HOUR_CAP = (() => {
  const raw = Number(process.env.AUTH_RATE_LIMIT_PER_HOUR);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 20;
})();

const SALT = process.env.AUTH_RATE_LIMIT_SALT ?? "nexus-default-salt-rotate-me";

export interface AuthQuotaResult {
  allowed: boolean;
  reason: "minute_cap" | "hour_cap" | "invalid_key" | "quota_check_failed" | null;
}

interface AuthQuotaRow {
  allowed: boolean;
  minute_count: number;
  hour_count: number;
  reason: string | null;
}

async function deriveClientKey(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const realIp = h.get("x-real-ip");
  const raw = (forwarded?.split(",")[0] ?? realIp ?? "").trim();
  if (!raw) return null;
  return createHash("sha256").update(`${SALT}:${raw}`).digest("hex").slice(0, 64);
}

export async function consumeAuthQuota(): Promise<AuthQuotaResult> {
  const clientKey = await deriveClientKey();
  if (!clientKey) {
    // No usable IP header (likely local dev). Don't lock the user out.
    return { allowed: true, reason: "quota_check_failed" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_auth_quota", {
    p_client_key: clientKey,
    p_minute_cap: MIN_CAP,
    p_hour_cap: HOUR_CAP,
  });

  if (error) {
    return { allowed: true, reason: "quota_check_failed" };
  }

  const row: AuthQuotaRow | undefined = Array.isArray(data) ? data[0] : data;
  if (!row) return { allowed: true, reason: "quota_check_failed" };

  const reason =
    row.reason === "minute_cap" || row.reason === "hour_cap" || row.reason === "invalid_key"
      ? row.reason
      : null;

  return { allowed: Boolean(row.allowed), reason };
}

export function authQuotaErrorMessage(result: AuthQuotaResult): string {
  if (result.reason === "minute_cap") {
    return `Too many attempts. Wait a minute and try again (limit: ${MIN_CAP}/min).`;
  }
  if (result.reason === "hour_cap") {
    return `Too many attempts from this network. Try again in an hour (limit: ${HOUR_CAP}/hr).`;
  }
  return "Could not verify rate limit. Try again.";
}

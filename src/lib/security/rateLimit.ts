import "server-only";
import { createClient } from "@/lib/supabase/server";

const MIN_CAP = (() => {
  const raw = Number(process.env.LLM_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 10;
})();

const DAY_CAP = (() => {
  const raw = Number(process.env.LLM_RATE_LIMIT_PER_DAY);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 50;
})();

export interface QuotaResult {
  allowed: boolean;
  reason: "minute_cap" | "day_cap" | "unauthorized" | "quota_check_failed" | null;
}

interface QuotaRow {
  allowed: boolean;
  minute_count: number;
  day_count: number;
  reason: string | null;
}

export async function consumeAiQuota(): Promise<QuotaResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_minute_cap: MIN_CAP,
    p_day_cap: DAY_CAP,
  });

  if (error) {
    // Fail-open: keeps the app working until migration 0010_api_usage.sql is applied,
    // and prevents a Supabase outage from locking everyone out of generation.
    return { allowed: true, reason: "quota_check_failed" };
  }

  const row: QuotaRow | undefined = Array.isArray(data) ? data[0] : data;
  if (!row) return { allowed: true, reason: "quota_check_failed" };

  const reason =
    row.reason === "minute_cap" || row.reason === "day_cap" || row.reason === "unauthorized"
      ? row.reason
      : null;

  return { allowed: Boolean(row.allowed), reason };
}

export function quotaErrorMessage(result: QuotaResult): string {
  if (result.reason === "minute_cap") {
    return `You are generating too quickly. Wait a minute and try again (limit: ${MIN_CAP}/min).`;
  }
  if (result.reason === "day_cap") {
    return `Daily AI usage limit reached (${DAY_CAP}/day). Try again tomorrow.`;
  }
  if (result.reason === "unauthorized") {
    return "Unauthorized";
  }
  return "Could not verify usage quota. Try again.";
}

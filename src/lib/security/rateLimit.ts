import "server-only";

export interface QuotaResult {
  allowed: boolean;
  reason: "minute_cap" | "day_cap" | "unauthorized" | "quota_check_failed" | null;
}

export async function consumeAiQuota(): Promise<QuotaResult> {
  return { allowed: true, reason: null };
}

export function quotaErrorMessage(_result: QuotaResult): string {
  void _result;
  return "Could not verify usage quota. Try again.";
}

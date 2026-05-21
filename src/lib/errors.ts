const DB_INTERNAL_PATTERNS: ReadonlyArray<RegExp> = [
  /row-level security/i,
  /\bviolates\b/i,
  /\bconstraint\b/i,
  /permission denied/i,
  /relation\s+".+"\s+does not exist/i,
  /column\s+".+"\s+does not exist/i,
  /duplicate key/i,
  /^pgrst/i,
  /^postgrest/i,
  /\bSQLSTATE\b/i,
];

const AUTH_LINK_STORAGE_PATTERNS: ReadonlyArray<RegExp> = [
  /pkce/i,
  /code verifier/i,
  /flow state/i,
  /storage/i,
];

const AUTH_LINK_EXPIRED_PATTERNS: ReadonlyArray<RegExp> = [
  /otp_expired/i,
  /expired/i,
  /invalid.*link/i,
  /token.*invalid/i,
  /token.*expired/i,
];

const LEGACY_LOGIN_PATTERNS: ReadonlyArray<RegExp> = [
  /invalid login/i,
  /invalid.*credentials/i,
  /invalid_credentials/i,
];

export const LEGACY_ACCOUNT_ERROR_MESSAGE =
  "Your account may need a quick password update. Please reset your password, then log in again.";

export function safeActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  if (DB_INTERNAL_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback;
  }
  return message;
}

export function friendlyLoginError(error: unknown): string {
  if (!(error instanceof Error)) return "Invalid email or password.";
  const message = error.message.trim();

  if (LEGACY_LOGIN_PATTERNS.some((pattern) => pattern.test(message))) {
    return LEGACY_ACCOUNT_ERROR_MESSAGE;
  }

  return safeActionError(error, "Invalid email or password.");
}

export function friendlyAuthError(message: string | null | undefined): string {
  const cleanMessage = String(message ?? "").trim();

  if (!cleanMessage) {
    return "Something went wrong with that sign-in link. Please request a fresh email and try again.";
  }

  if (AUTH_LINK_STORAGE_PATTERNS.some((pattern) => pattern.test(cleanMessage))) {
    return "That email link opened in a different browser and could not finish signing you in. Please request a fresh confirmation email and try again.";
  }

  if (AUTH_LINK_EXPIRED_PATTERNS.some((pattern) => pattern.test(cleanMessage))) {
    return "That confirmation link has expired or was already used. Please sign up again to receive a fresh email.";
  }

  if (/supabase|@supabase|gotrue|authapi/i.test(cleanMessage)) {
    return "Something went wrong with that sign-in link. Please request a fresh email and try again.";
  }

  return cleanMessage;
}

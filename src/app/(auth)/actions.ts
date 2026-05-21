"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authQuotaErrorMessage, consumeAuthQuota } from "@/lib/security/authRateLimit";
import { safeActionError } from "@/lib/errors";

export interface AuthState {
  error?: string;
  message?: string;
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const quota = await consumeAuthQuota();
  if (!quota.allowed) {
    return { error: authQuotaErrorMessage(quota) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: safeActionError(error, "Invalid email or password.") };
  }

  const isSafeRedirect =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://");
  redirect(isSafeRedirect ? next : "/dashboard");
}

export async function signupAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const quota = await consumeAuthQuota();
  if (!quota.allowed) {
    return { error: authQuotaErrorMessage(quota) };
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "https://examcraft-ai.vercel.app";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) {
    return { error: safeActionError(error, "Could not create the account. Try again.") };
  }

  return {
    message: "Check your email for the confirmation link, then come back and log in.",
  };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

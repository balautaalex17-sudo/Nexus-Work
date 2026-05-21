import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthError } from "@/lib/errors";

type OtpType = "signup" | "email" | "recovery" | "invite" | "email_change";

function isOtpType(value: string | null): value is OtpType {
  return value === "signup" || value === "email" || value === "recovery" || value === "invite" || value === "email_change";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(friendlyAuthError(error.message))}`, request.url));
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(friendlyAuthError(error.message))}`, request.url));
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.redirect(new URL("/login?message=Your email has been confirmed. Please log in.", request.url));
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AuthState } from "@/app/(auth)/actions";

type AuthAction = (state: AuthState, formData: FormData) => Promise<AuthState>;

interface AuthFormProps {
  title: string;
  submitLabel: string;
  action: AuthAction;
  next?: string;
  notice?: string;
  noticeTone?: "neutral" | "error";
  passwordAutoComplete?: string;
}

const initialState: AuthState = {};

export function AuthForm({
  title,
  submitLabel,
  action,
  next,
  notice,
  noticeTone = "neutral",
  passwordAutoComplete = "current-password",
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errorNoticeClass =
    "rounded-3xl border border-[#A85448]/20 bg-[#A85448]/10 px-5 py-4 text-sm font-semibold leading-relaxed text-[#A85448]";
  const successNoticeClass =
    "rounded-3xl border border-[#5D7052]/20 bg-[#5D7052]/10 px-5 py-4 text-sm font-semibold leading-relaxed text-[#5D7052]";

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#2C2C24] mb-3">
        {title}
      </h1>
      <p className="text-[#78786C] mb-8">Enter your email and password to continue.</p>
      <form action={formAction} className="flex flex-col gap-5">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {notice ? (
          <p className={noticeTone === "error" ? errorNoticeClass : successNoticeClass}>
            {notice}
          </p>
        ) : null}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-bold uppercase tracking-wider text-[#78786C] mb-2 ml-5"
          >
            Email
          </label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-bold uppercase tracking-wider text-[#78786C] mb-2 ml-5"
          >
            Password
          </label>
          <Input id="password" name="password" type="password" required autoComplete={passwordAutoComplete} />
        </div>
        {state.error ? <p className={errorNoticeClass}>{state.error}</p> : null}
        {state.message ? <p className={successNoticeClass}>{state.message}</p> : null}
        <Button type="submit" disabled={pending} size="lg" className="w-full mt-2">
          {pending ? "Please wait..." : submitLabel}
        </Button>
      </form>
    </div>
  );
}

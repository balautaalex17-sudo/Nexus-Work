"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: AuthState = {};

export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);
  const errorClass =
    "rounded-3xl border border-[#A85448]/20 bg-[#A85448]/10 px-5 py-4 text-sm font-semibold leading-relaxed text-[#A85448]";
  const successClass =
    "rounded-3xl border border-[#5D7052]/20 bg-[#5D7052]/10 px-5 py-4 text-sm font-semibold leading-relaxed text-[#5D7052]";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="email"
          className="mb-2 ml-5 block text-xs font-bold uppercase tracking-wider text-[#78786C]"
        >
          Account email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      {state.error ? <p className={errorClass}>{state.error}</p> : null}
      {state.message ? <p className={successClass}>{state.message}</p> : null}
      <Button type="submit" disabled={pending} size="lg" className="mt-2 w-full">
        {pending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}

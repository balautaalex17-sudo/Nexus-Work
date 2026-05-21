"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePasswordAction, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: AuthState = {};

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);
  const errorClass =
    "rounded-3xl border border-[#A85448]/20 bg-[#A85448]/10 px-5 py-4 text-sm font-semibold leading-relaxed text-[#A85448]";
  const successClass =
    "rounded-3xl border border-[#5D7052]/20 bg-[#5D7052]/10 px-5 py-4 text-sm font-semibold leading-relaxed text-[#5D7052]";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="password"
          className="mb-2 ml-5 block text-xs font-bold uppercase tracking-wider text-[#78786C]"
        >
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 ml-5 block text-xs font-bold uppercase tracking-wider text-[#78786C]"
        >
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {state.error ? <p className={errorClass}>{state.error}</p> : null}
      {state.message ? (
        <p className={successClass}>
          {state.message}{" "}
          <Link href="/login" className="font-bold text-[#5D7052]">
            Go to login
          </Link>
        </p>
      ) : null}
      <Button type="submit" disabled={pending} size="lg" className="mt-2 w-full">
        {pending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}

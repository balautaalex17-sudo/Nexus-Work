"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAttemptAction } from "@/actions/history";
import { Button } from "@/components/ui/Button";

interface AttemptDeleteButtonProps {
  attemptId: string;
  title: string;
}

export function AttemptDeleteButton({ attemptId, title }: AttemptDeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="text-[#A85448] hover:bg-[#A85448]/10 hover:text-[#A85448]"
        onClick={() => {
          const ok = window.confirm(
            `Delete completed paper "${title}"? This removes the paper, its mistake log, and any drill-set questions from it.`,
          );
          if (!ok) return;

          setError(null);
          startTransition(async () => {
            const result = await deleteAttemptAction({ attemptId });
            if ("error" in result) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Deleting..." : "Delete"}
      </Button>
      {error ? <span className="max-w-48 text-right text-xs font-bold text-[#A85448]">{error}</span> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAttemptAction } from "@/actions/history";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface AttemptDeleteButtonProps {
  attemptId: string;
  title: string;
}

export function AttemptDeleteButton({ attemptId, title }: AttemptDeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteAttempt = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteAttemptAction({ attemptId });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <ConfirmDialog
        open={confirmOpen}
        danger
        title="Delete completed paper?"
        description={`This will delete "${title}", its mistake log, and any drill-set questions from it.`}
        confirmLabel="Delete paper"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={deleteAttempt}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="text-[#A85448] hover:bg-[#A85448]/10 hover:text-[#A85448]"
        onClick={() => setConfirmOpen(true)}
      >
        {pending ? "Deleting..." : "Delete"}
      </Button>
      {error ? <span className="max-w-48 text-xs font-bold text-[#A85448]">{error}</span> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCustomDrillSetAction } from "@/actions/history";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface DrillSetDeleteButtonProps {
  setId: string;
  name: string;
}

export function DrillSetDeleteButton({ setId, name }: DrillSetDeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <ConfirmDialog
        open={confirmOpen}
        danger
        title="Delete drill set?"
        description={`This will delete "${name}". Your mistakes and completed papers will stay saved.`}
        confirmLabel="Delete set"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setError(null);
          startTransition(async () => {
            const result = await deleteCustomDrillSetAction({ setId });
            if ("error" in result) {
              setError(result.error);
              return;
            }
            setConfirmOpen(false);
            router.refresh();
          });
        }}
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

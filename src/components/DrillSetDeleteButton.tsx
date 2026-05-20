"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteCustomDrillSetAction } from "@/actions/history";
import { Button } from "@/components/ui/Button";

interface DrillSetDeleteButtonProps {
  setId: string;
  name: string;
}

export function DrillSetDeleteButton({ setId, name }: DrillSetDeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-[#A85448] hover:bg-[#A85448]/10 hover:text-[#A85448]"
      onClick={() => {
        const ok = window.confirm(`Delete drill set "${name}"? This does not delete mistakes or completed papers.`);
        if (!ok) return;

        startTransition(async () => {
          await deleteCustomDrillSetAction({ setId });
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}

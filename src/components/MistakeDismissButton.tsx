"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { dismissMistakeAction } from "@/actions/history";
import { Button } from "@/components/ui/Button";

interface MistakeDismissButtonProps {
  attemptId: string;
  itemKey: string;
}

export function MistakeDismissButton({ attemptId, itemKey }: MistakeDismissButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await dismissMistakeAction({ attemptId, itemKey });
          router.refresh();
        });
      }}
    >
      {pending ? "Removing..." : "Remove"}
    </Button>
  );
}

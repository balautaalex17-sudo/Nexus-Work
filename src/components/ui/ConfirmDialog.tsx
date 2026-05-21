"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open, pending]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2C24]/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close confirmation"
        disabled={pending}
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-[2rem] border border-[#DED8CF] bg-[#FFFCF4] p-6 shadow-[0_24px_80px_-32px_rgba(44,44,36,0.45)]">
        <p className="eyebrow mb-2">{danger ? "Confirm deletion" : "Please confirm"}</p>
        <h2 id="confirm-dialog-title" className="font-display text-3xl text-[#2C2C24]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#78786C]">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={pending}
            className={
              danger
                ? "bg-[#A85448] text-white hover:bg-[#8F4036] hover:shadow-[0_6px_24px_-4px_rgba(168,84,72,0.3)]"
                : undefined
            }
            onClick={onConfirm}
          >
            {pending ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

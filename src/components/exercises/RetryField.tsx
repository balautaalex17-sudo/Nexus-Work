"use client";

import { useState } from "react";

interface RetryFieldProps {
  itemKey: string;
  initialValue: string;
  correctAnswer: string;
  onRetry?: (key: string, value: string) => Promise<{ accepted: boolean } | null>;
  onAccepted: (key: string) => void;
  placeholder?: string;
  width?: number | string;
}

export function RetryField({
  itemKey,
  initialValue,
  correctAnswer,
  onRetry,
  onAccepted,
  placeholder,
  width = 140,
}: RetryFieldProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "checking" | "rejected">("idle");

  if (!onRetry) {
    return <span className="answer-correct-reveal">{correctAnswer}</span>;
  }

  if (!open) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="answer-correct-reveal">{correctAnswer}</span>
        <button
          type="button"
          className="paper-link-btn"
          style={{ fontSize: "var(--text-xs)" }}
          onClick={() => {
            setValue(initialValue);
            setStatus("idle");
            setOpen(true);
          }}
        >
          Try again
        </button>
      </span>
    );
  }

  const submit = async () => {
    if (!value.trim()) return;
    setStatus("checking");
    const result = await onRetry(itemKey, value.trim());
    if (result?.accepted) {
      onAccepted(itemKey);
      setOpen(false);
      setStatus("idle");
      return;
    }
    setStatus("rejected");
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <input
        type="text"
        className="answer-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value);
          if (status === "rejected") setStatus("idle");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
        style={{ width, borderBottomColor: status === "rejected" ? "var(--incorrect)" : undefined }}
        autoFocus
      />
      <button
        type="button"
        className="paper-link-btn"
        onClick={() => void submit()}
        style={{ fontSize: "var(--text-xs)" }}
        disabled={status === "checking"}
      >
        {status === "checking" ? "Checking…" : "Check"}
      </button>
      <button
        type="button"
        className="paper-link-btn"
        onClick={() => {
          setOpen(false);
          setStatus("idle");
        }}
        style={{ fontSize: "var(--text-xs)", color: "var(--ink-light)" }}
      >
        Cancel
      </button>
      {status === "rejected" ? (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--incorrect)" }}>Not accepted.</span>
      ) : null}
    </span>
  );
}

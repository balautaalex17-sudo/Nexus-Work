"use client";

import { useMemo, useState } from "react";
import type { ExerciseProps } from "@/components/exercises/shared";
import { keyFromToken, splitByGaps } from "@/components/exercises/shared";
import { PART_INSTRUCTIONS, PART_QUESTION_RANGE } from "@/lib/exercises/questionNumbers";
import { part6Zod } from "@/lib/exercises/types";
import type { z } from "zod";

type Part6 = z.infer<typeof part6Zod>;

export function GappedText({
  exercise,
  mode,
  initialAnswers,
  results,
  onSubmit,
  onRetry,
  submitting,
}: ExerciseProps) {
  const data = exercise as Part6;
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [localResults, setLocalResults] = useState<Record<string, boolean>>(results ?? {});
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const meta = PART_INSTRUCTIONS.part6;
  const range = PART_QUESTION_RANGE.part6;
  const isReview = mode === "review";

  const usedParagraphs = useMemo(() => new Set(Object.values(answers)), [answers]);

  const handleSelect = async (gapKey: string, paragraphId: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      for (let i = 1; i <= 7; i += 1) {
        const otherKey = `gap${i}`;
        if (otherKey !== gapKey && next[otherKey] === paragraphId) {
          delete next[otherKey];
        }
      }
      if (paragraphId) next[gapKey] = paragraphId;
      else delete next[gapKey];
      return next;
    });

    if (retryingKey === gapKey && onRetry && paragraphId) {
      const result = await onRetry(gapKey, paragraphId);
      if (result?.accepted) {
        setLocalResults((prev) => ({ ...prev, [gapKey]: true }));
      } else {
        setLocalResults((prev) => ({ ...prev, [gapKey]: false }));
      }
      setRetryingKey(null);
    }
  };

  const passageRender = splitByGaps(data.text).map((token, index) => {
    const key = keyFromToken(token);
    if (!key) {
      return (
        <span key={index} className="passage-text" style={{ display: "inline" }}>
          {token}
        </span>
      );
    }
    const localIndex = Number(key.replace("gap", ""));
    const qNo = range.start + localIndex - 1;
    const ok = localResults[key];
    const isRetrying = retryingKey === key;
    const interactive = !isReview || isRetrying;
    const correct = data.correctOrder[localIndex - 1];

    return (
      <span
        key={index}
        style={{
          display: "inline-block",
          margin: "8px 4px",
          padding: "8px 12px",
          borderRadius: 4,
          border:
            isReview && ok !== undefined && !isRetrying
              ? `1px solid ${ok ? "var(--correct)" : "var(--incorrect)"}`
              : "1px solid var(--border)",
          background: "var(--paper-soft)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-sm)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            marginRight: 8,
            color: "var(--ink-light)",
            fontWeight: 600,
          }}
        >
          {qNo}
        </span>
        <select
          className="answer-select"
          disabled={!interactive}
          value={answers[key] ?? ""}
          onChange={(event) => void handleSelect(key, event.target.value)}
          style={{ minWidth: 70 }}
        >
          <option value="">—</option>
          {data.paragraphs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}
            </option>
          ))}
        </select>
        {isReview && ok === false && !isRetrying ? (
          <span style={{ marginLeft: 8, fontSize: "var(--text-xs)" }}>
            <span style={{ color: "var(--correct)", fontWeight: 600 }}>{correct}</span>
            {onRetry ? (
              <button
                type="button"
                className="paper-link-btn"
                style={{ marginLeft: 6, fontSize: "var(--text-xs)" }}
                onClick={() => setRetryingKey(key)}
              >
                Try again
              </button>
            ) : null}
          </span>
        ) : null}
      </span>
    );
  });

  return (
    <>
      <div className="part-header">
        <span className="part-header__label">{meta.heading}</span>
        <span className="part-header__title">{data.title}</span>
        <span className="part-header__marks">{range.marks}</span>
      </div>
      <div className="instructions-box">
        <strong>Instructions.</strong> {meta.instruction}
      </div>

      <div className="paper-body">
        <div
          className="passage-text"
          style={{ marginBottom: 24, lineHeight: 1.9, whiteSpace: "pre-wrap" }}
        >
          {passageRender}
        </div>

        <p className="eyebrow" style={{ margin: "0 0 12px" }}>
          Candidate paragraphs
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {data.paragraphs.map((paragraph) => {
            const placedAt = Object.entries(answers).find(([, v]) => v === paragraph.id)?.[0];
            const isUsed = usedParagraphs.has(paragraph.id);
            const placedNumber = placedAt
              ? range.start + Number(placedAt.replace("gap", "")) - 1
              : null;
            return (
              <div
                key={paragraph.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: 14,
                  background: isUsed ? "var(--paper-soft)" : "var(--surface)",
                  opacity: isUsed ? 0.7 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span className="keyword-pill">{paragraph.id}</span>
                  {placedNumber ? (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-light)" }}>
                      Placed at {placedNumber}
                    </span>
                  ) : null}
                </div>
                <p
                  className="passage-text"
                  style={{ margin: 0, fontSize: "1rem", lineHeight: 1.6 }}
                >
                  {paragraph.content}
                </p>
              </div>
            );
          })}
        </div>

        {mode === "active" ? (
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              className="submit-btn"
              disabled={submitting}
              onClick={() => onSubmit?.(answers)}
            >
              {submitting ? "Marking..." : "Submit paper"}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

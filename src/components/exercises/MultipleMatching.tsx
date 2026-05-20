"use client";

import { useState } from "react";
import type { ExerciseProps } from "@/components/exercises/shared";
import { keyFromToken, splitByGaps } from "@/components/exercises/shared";
import { PART_INSTRUCTIONS, PART_QUESTION_RANGE } from "@/lib/exercises/questionNumbers";
import { part7Zod } from "@/lib/exercises/types";
import type { z } from "zod";

type Part7 = z.infer<typeof part7Zod>;

function TextWithVisualBlanks({ text }: { text: string }) {
  return splitByGaps(text).map((token, index) => {
    const key = keyFromToken(token);
    if (!key) return <span key={index}>{token}</span>;

    return (
      <span key={index} className="inline-gap-blank" aria-label={`gap ${key.replace("gap", "")}`}>
        <span>{key.replace("gap", "")}</span>
      </span>
    );
  });
}

export function MultipleMatching({
  exercise,
  mode,
  initialAnswers,
  results,
  onSubmit,
  onRetry,
  submitting,
}: ExerciseProps) {
  const data = exercise as Part7;
  const textIds = data.texts.map((text) => text.id);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [localResults, setLocalResults] = useState<Record<string, boolean>>(results ?? {});
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const meta = PART_INSTRUCTIONS.part7;
  const range = PART_QUESTION_RANGE.part7;
  const isReview = mode === "review";

  const handleSelect = async (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (retryingKey === key && onRetry && value) {
      const result = await onRetry(key, value);
      if (result?.accepted) {
        setLocalResults((prev) => ({ ...prev, [key]: true }));
      } else {
        setLocalResults((prev) => ({ ...prev, [key]: false }));
      }
      setRetryingKey(null);
    }
  };

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
        <p className="eyebrow" style={{ margin: "0 0 12px" }}>
          Sections
        </p>
        <div className="grid gap-4 md:grid-cols-2" style={{ marginBottom: 28 }}>
          {data.texts.map((text) => (
            <div
              key={text.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: 16,
              }}
            >
              <span className="keyword-pill">{text.id}</span>
              <p
                className="passage-text"
                style={{ marginTop: 10, fontSize: "1rem", lineHeight: 1.65 }}
              >
                <TextWithVisualBlanks text={text.content} />
              </p>
            </div>
          ))}
        </div>

        <p className="eyebrow" style={{ margin: "0 0 12px" }}>
          Statements
        </p>
        <div>
          {data.prompts.map((prompt, index) => {
            const key = `prompt${index + 1}`;
            const ok = localResults[key];
            const qNo = range.start + index;
            const isRetrying = retryingKey === key;
            const interactive = !isReview || isRetrying;
            return (
              <div
                key={`${prompt.id}-${index}`}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "baseline",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--text-xs)",
                    color: "var(--ink-light)",
                    minWidth: 28,
                  }}
                >
                  {qNo}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.02rem",
                  }}
                >
                  {prompt.statement}
                </span>
                <select
                  className="answer-select"
                  disabled={!interactive}
                  value={answers[key] ?? ""}
                  onChange={(event) => void handleSelect(key, event.target.value)}
                  style={{
                    minWidth: 80,
                    borderColor:
                      isReview && ok !== undefined && !isRetrying
                        ? ok
                          ? "var(--correct)"
                          : "var(--incorrect)"
                        : "var(--border-strong)",
                  }}
                >
                  <option value="">—</option>
                  {textIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                {isReview && ok === false && !isRetrying ? (
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <span className="answer-correct-reveal">{prompt.correctTextId}</span>
                    {onRetry ? (
                      <button
                        type="button"
                        className="paper-link-btn"
                        style={{ fontSize: "var(--text-xs)" }}
                        onClick={() => setRetryingKey(key)}
                      >
                        Try again
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {mode === "active" ? (
          <button
            type="button"
            className="submit-btn"
            disabled={submitting}
            onClick={() => onSubmit?.(answers)}
            style={{ marginTop: 24 }}
          >
            {submitting ? "Marking..." : "Submit paper"}
          </button>
        ) : null}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import type { ExerciseProps } from "@/components/exercises/shared";
import { hasGapTokens, keyFromToken, splitByGaps } from "@/components/exercises/shared";
import { PART_INSTRUCTIONS, PART_QUESTION_RANGE } from "@/lib/exercises/questionNumbers";
import { part1Zod } from "@/lib/exercises/types";
import type { z } from "zod";

type Part1 = z.infer<typeof part1Zod>;

const optionLabel = ["A", "B", "C", "D"];

function gapIndex(gapKey: string) {
  return Number(gapKey.replace("gap", ""));
}

export function MultipleChoiceCloze({
  exercise,
  mode,
  initialAnswers,
  results,
  onSubmit,
  onRetry,
  submitting,
}: ExerciseProps) {
  const data = exercise as Part1;
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [localResults, setLocalResults] = useState<Record<string, boolean>>(results ?? {});
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const meta = PART_INSTRUCTIONS.part1;
  const range = PART_QUESTION_RANGE.part1;
  const hasInlineGaps = hasGapTokens(data.text);

  const isReview = mode === "review";

  const handleRetry = async (key: string, value: string) => {
    if (!onRetry) return;
    setAnswers((prev) => ({ ...prev, [key]: value }));
    const result = await onRetry(key, value);
    if (result?.accepted) {
      setLocalResults((prev) => ({ ...prev, [key]: true }));
    }
    setRetryingKey(null);
  };

  const renderGap = (key: string, number: number) => {
    const ok = localResults[key];
    const isRetrying = retryingKey === key;
    const disabled = isReview && !isRetrying;
    const correct = data.correctAnswers[key as keyof typeof data.correctAnswers];

    return (
      <>
        <span className="q-number">{number}</span>
        <select
          className="answer-select"
          disabled={disabled}
          value={answers[key] ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setAnswers((prev) => ({ ...prev, [key]: value }));
            if (isRetrying && value) {
              void handleRetry(key, value);
            }
          }}
          style={{
            borderColor:
              isReview && ok !== undefined && !isRetrying
                ? ok
                  ? "var(--correct)"
                  : "var(--incorrect)"
                : "var(--ink-mid)",
          }}
        >
          <option value="">—</option>
          {data.options[key as keyof typeof data.options].map((option, optionIndex) => (
            <option key={option} value={option}>
              {optionLabel[optionIndex]}. {option}
            </option>
          ))}
        </select>
        {isReview && ok === false && !isRetrying ? (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span className="answer-correct-reveal">{correct}</span>
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
        {isReview && ok && key in localResults && (results?.[key] === false) ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--correct)", marginLeft: 4 }}>
            ✓ accepted
          </span>
        ) : null}
      </>
    );
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
        <div className="passage-text">
          {splitByGaps(data.text).map((token, index) => {
            const key = keyFromToken(token);
            if (!key) {
              return <span key={index}>{token}</span>;
            }
            const localIndex = gapIndex(key);
            const number = range.start + localIndex - 1;
            return (
              <span
                key={index}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  margin: "0 4px",
                  verticalAlign: "middle",
                }}
              >
                {renderGap(key, number)}
              </span>
            );
          })}
        </div>

        {!hasInlineGaps ? (
          <div className="grid gap-3" style={{ marginTop: 16 }}>
            {Array.from({ length: 8 }, (_, i) => {
              const key = `gap${i + 1}`;
              const number = range.start + i;
              return (
                <label key={key} className="form-line">
                  {renderGap(key, number)}
                </label>
              );
            })}
          </div>
        ) : null}

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

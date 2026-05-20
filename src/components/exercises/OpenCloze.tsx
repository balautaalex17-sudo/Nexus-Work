"use client";

import { useState } from "react";
import type { ExerciseProps } from "@/components/exercises/shared";
import { RetryField } from "@/components/exercises/RetryField";
import { hasGapTokens, keyFromToken, splitByGaps } from "@/components/exercises/shared";
import { PART_INSTRUCTIONS, PART_QUESTION_RANGE } from "@/lib/exercises/questionNumbers";
import { part2Zod } from "@/lib/exercises/types";
import type { z } from "zod";

type Part2 = z.infer<typeof part2Zod>;

export function OpenCloze({
  exercise,
  mode,
  initialAnswers,
  results,
  onSubmit,
  onRetry,
  submitting,
}: ExerciseProps) {
  const data = exercise as Part2;
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [localResults, setLocalResults] = useState<Record<string, boolean>>(results ?? {});
  const meta = PART_INSTRUCTIONS.part2;
  const range = PART_QUESTION_RANGE.part2;
  const hasInlineGaps = hasGapTokens(data.text);
  const isReview = mode === "review";

  const markAccepted = (key: string) =>
    setLocalResults((prev) => ({ ...prev, [key]: true }));

  const renderField = (key: string, width = 110) => {
    const ok = localResults[key];
    const correct = data.correctAnswers[key as keyof typeof data.correctAnswers];
    return (
      <>
        <input
          type="text"
          maxLength={30}
          className={`answer-input ${isReview ? (ok ? "correct" : "incorrect") : ""}`}
          disabled={isReview}
          value={answers[key] ?? ""}
          onChange={(event) =>
            setAnswers((prev) => ({ ...prev, [key]: event.target.value }))
          }
          style={{ width }}
          spellCheck={false}
        />
        {isReview && ok === false ? (
          <RetryField
            itemKey={key}
            initialValue={answers[key] ?? ""}
            correctAnswer={correct}
            onRetry={onRetry}
            onAccepted={markAccepted}
            width={width}
          />
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
            const number = range.start + Number(key.replace("gap", "")) - 1;
            return (
              <span
                key={index}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  margin: "0 3px",
                  verticalAlign: "baseline",
                }}
              >
                <span className="q-number">{number}</span>
                {renderField(key)}
              </span>
            );
          })}
        </div>

        {!hasInlineGaps ? (
          <div className="grid gap-3" style={{ marginTop: 16 }}>
            {Array.from({ length: 8 }, (_, index) => {
              const key = `gap${index + 1}`;
              const number = range.start + index;
              return (
                <label key={key} className="form-line">
                  <span className="q-number">{number}</span>
                  <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                    {renderField(key, 200)}
                  </span>
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

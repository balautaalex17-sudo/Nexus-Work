"use client";

import { useState } from "react";
import type { ExerciseProps } from "@/components/exercises/shared";
import { RetryField } from "@/components/exercises/RetryField";
import { PART_INSTRUCTIONS, PART_QUESTION_RANGE } from "@/lib/exercises/questionNumbers";
import { part4Zod } from "@/lib/exercises/types";
import type { z } from "zod";

type Part4 = z.infer<typeof part4Zod>;

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function KeyWordTransformation({
  exercise,
  mode,
  initialAnswers,
  results,
  onSubmit,
  onRetry,
  submitting,
}: ExerciseProps) {
  const data = exercise as Part4;
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [localResults, setLocalResults] = useState<Record<string, boolean>>(results ?? {});
  const meta = PART_INSTRUCTIONS.part4;
  const range = PART_QUESTION_RANGE.part4;
  const isReview = mode === "review";

  const markAccepted = (key: string) =>
    setLocalResults((prev) => ({ ...prev, [key]: true }));

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
        {data.items.map((item, index) => {
          const key = `item${index + 1}`;
          const value = answers[key] ?? "";
          const words = countWords(value);
          const [minWords, maxWords] = item.wordLimit;
          const inRange = words >= minWords && words <= maxWords;
          const ok = localResults[key];
          const qNo = range.start + index;

          return (
            <div
              key={item.id}
              style={{
                paddingBottom: 18,
                marginBottom: 18,
                borderBottom: index === data.items.length - 1 ? 0 : "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span
                  className="q-number"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {qNo}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: "1.06rem",
                  }}
                >
                  {item.originalSentence}
                </p>
              </div>

              <div style={{ marginTop: 10, marginLeft: 24 }}>
                <span className="keyword-pill">{item.keyWord}</span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  marginLeft: 24,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  flexWrap: "wrap",
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.06rem",
                }}
              >
                <span>{item.startFragment}</span>
                <input
                  type="text"
                  className={`answer-input ${isReview ? (ok ? "correct" : "incorrect") : ""}`}
                  disabled={isReview}
                  value={value}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  style={{ minWidth: 220, flex: "1 1 220px", fontStyle: "normal" }}
                  spellCheck={false}
                />
                <span>{item.endFragment}</span>
              </div>

              <div
                style={{
                  marginTop: 6,
                  marginLeft: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "var(--text-xs)",
                  color: "var(--ink-light)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                <span>
                  Limit: {minWords}–{maxWords} words (including the key word)
                </span>
                <span style={{ color: !value ? "var(--ink-light)" : inRange ? "var(--correct)" : "var(--incorrect)" }}>
                  {words} {words === 1 ? "word" : "words"}
                </span>
              </div>

              {isReview && ok === false ? (
                <div
                  style={{
                    marginTop: 10,
                    marginLeft: 24,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--ink-light)" }}>
                    Sample answer:
                  </span>
                  <RetryField
                    itemKey={key}
                    initialValue={value}
                    correctAnswer={item.correctAnswer}
                    onRetry={onRetry}
                    onAccepted={markAccepted}
                    width={260}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        {mode === "active" ? (
          <button
            type="button"
            className="submit-btn"
            disabled={submitting}
            onClick={() => onSubmit?.(answers)}
          >
            {submitting ? "Marking..." : "Submit paper"}
          </button>
        ) : null}
      </div>
    </>
  );
}

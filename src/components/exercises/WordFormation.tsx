"use client";

import { useMemo, useState } from "react";
import type { ExerciseProps } from "@/components/exercises/shared";
import { RetryField } from "@/components/exercises/RetryField";
import { hasGapTokens, keyFromToken, splitByGaps } from "@/components/exercises/shared";
import { PART_INSTRUCTIONS, PART_QUESTION_RANGE } from "@/lib/exercises/questionNumbers";
import { part3Zod } from "@/lib/exercises/types";
import type { z } from "zod";

type Part3 = z.infer<typeof part3Zod>;

type LineRow = {
  text: string;
  gapId?: string;
  baseWord?: string;
};

function deriveLineRows(data: Part3): LineRow[] {
  if (data.lines && data.lines.length > 0) {
    return data.lines.map((line, index) => {
      const gapId = line.gapId ?? keyFromToken(line.text) ?? `gap${index + 1}`;
      return {
        ...line,
        gapId,
        baseWord: line.baseWord ?? data.baseWords[gapId as keyof typeof data.baseWords],
      };
    });
  }

  const rows = data.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map<LineRow>((line) => {
      const match = line.match(/gap\d+/i);
      if (!match) return { text: line };
      const gapId = match[0].toLowerCase();
      return { text: line, gapId, baseWord: data.baseWords[gapId as keyof typeof data.baseWords] };
    });

  if (rows.length > 0) return rows;
  return [{ text: data.text }];
}

export function WordFormation({
  exercise,
  mode,
  initialAnswers,
  results,
  onSubmit,
  onRetry,
  submitting,
}: ExerciseProps) {
  const data = exercise as Part3;
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [localResults, setLocalResults] = useState<Record<string, boolean>>(results ?? {});
  const meta = PART_INSTRUCTIONS.part3;
  const range = PART_QUESTION_RANGE.part3;
  const rows = useMemo(() => deriveLineRows(data), [data]);
  const isReview = mode === "review";

  const markAccepted = (key: string) =>
    setLocalResults((prev) => ({ ...prev, [key]: true }));

  const renderInput = (key: string, ok: boolean | undefined) => (
    <input
      type="text"
      className={`answer-input ${isReview ? (ok ? "correct" : "incorrect") : ""}`}
      disabled={isReview}
      value={answers[key] ?? ""}
      onChange={(event) => setAnswers((prev) => ({ ...prev, [key]: event.target.value }))}
      spellCheck={false}
      style={{ width: 130 }}
    />
  );

  const renderFallbackLine = (
    text: string,
    gapId: string | undefined,
    questionNumber: number | null,
    ok: boolean | undefined,
  ) => {
    if (!gapId || !questionNumber) return <span>{text}</span>;

    const parts = text.split(/(__+|\s{2,})/);
    const placeholderIndex = parts.findIndex((part) => /__+|\s{2,}/.test(part));
    const input = (
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          gap: 6,
          margin: "0 6px",
        }}
      >
        <span className="q-number">{questionNumber}</span>
        {renderInput(gapId, ok)}
      </span>
    );

    if (placeholderIndex === -1) {
      return (
        <>
          {input}
          <span>{text}</span>
        </>
      );
    }

    return parts.map((part, partIndex) =>
      partIndex === placeholderIndex ? (
        <span key={`${gapId}-fallback`}>{input}</span>
      ) : /__+|\s{2,}/.test(part) ? null : (
        <span key={`${gapId}-${partIndex}`}>{part}</span>
      ),
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
        <div className="word-formation-grid">
          <div
            className="word-formation-row"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-xs)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-light)",
              borderBottom: "1px solid var(--border)",
              paddingBottom: 8,
            }}
          >
            <span>Text</span>
            <span style={{ textAlign: "right" }}>Form</span>
          </div>
          {rows.map((row, index) => {
            const gapId = row.gapId;
            const questionNumber = gapId
              ? range.start + Number(gapId.replace("gap", "")) - 1
              : null;
            const ok = gapId ? localResults[gapId] : undefined;
            const correct = gapId
              ? data.correctAnswers[gapId as keyof typeof data.correctAnswers]
              : "";
            const rowHasGapToken = hasGapTokens(row.text);

            return (
              <div key={`${row.text}-${index}`} className="word-formation-row">
                <div className="passage-text" style={{ fontSize: "1.05rem" }}>
                  {rowHasGapToken
                    ? splitByGaps(row.text).map((token, tokenIndex) => {
                        const key = keyFromToken(token);
                        if (!key) {
                          return <span key={tokenIndex}>{token}</span>;
                        }
                        return (
                          <span
                            key={tokenIndex}
                            style={{
                              display: "inline-flex",
                              alignItems: "baseline",
                              gap: 6,
                              margin: "0 4px",
                            }}
                          >
                            <span className="q-number">
                              {range.start + Number(key.replace("gap", "")) - 1}
                            </span>
                            {renderInput(key, localResults[key])}
                          </span>
                        );
                      })
                    : renderFallbackLine(row.text, gapId, questionNumber, ok)}
                </div>
                <div className="word-bank-item">{row.baseWord ?? ""}</div>
                {isReview && gapId && ok === false ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      paddingLeft: 0,
                      paddingTop: 4,
                      color: "var(--ink-light)",
                      fontSize: "var(--text-sm)",
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>Expected:</span>
                    <RetryField
                      itemKey={gapId}
                      initialValue={answers[gapId] ?? ""}
                      correctAnswer={correct}
                      onRetry={onRetry}
                      onAccepted={markAccepted}
                      width={150}
                    />
                  </div>
                ) : null}
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

"use client";

import { useState } from "react";
import type { ExerciseProps } from "@/components/exercises/shared";
import { keyFromToken, splitByGaps } from "@/components/exercises/shared";
import { PART_INSTRUCTIONS, PART_QUESTION_RANGE } from "@/lib/exercises/questionNumbers";
import { part5Zod } from "@/lib/exercises/types";
import type { z } from "zod";

type Part5 = z.infer<typeof part5Zod>;

const alpha = ["A", "B", "C", "D"];

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

export function ReadingMultipleChoice({
  exercise,
  mode,
  initialAnswers,
  results,
  onSubmit,
  onRetry,
  submitting,
}: ExerciseProps) {
  const data = exercise as Part5;
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [localResults, setLocalResults] = useState<Record<string, boolean>>(results ?? {});
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const meta = PART_INSTRUCTIONS.part5;
  const range = PART_QUESTION_RANGE.part5;
  const paragraphs = data.text.split(/\n\s*\n/).filter(Boolean);
  const isReview = mode === "review";

  const handleSelect = async (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (retryingKey === key && onRetry) {
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
      <div className="part-header reading-part-header">
        <span className="part-header__label">{meta.heading}</span>
        <span className="part-header__title">{data.title}</span>
        <span className="part-header__marks">{range.marks}</span>
      </div>
      <div className="instructions-box reading-instructions-box">
        <strong>Instructions.</strong> {meta.instruction}
      </div>

      <div className="paper-body reading-paper-body">
        <div className="reading-layout">
          <article className="reading-passage-panel" aria-label="Reading text">
            {paragraphs.map((paragraph, index) => (
              <section className="reading-paragraph" key={`p-${index}`}>
                <span className="reading-paragraph-number">{index + 1}</span>
                <p className="passage-text reading-passage-text">
                  <TextWithVisualBlanks text={paragraph} />
                </p>
              </section>
            ))}
          </article>
          <aside className="reading-questions-panel" aria-label="Questions">
            {data.questions.map((question, index) => {
              const key = `q${index + 1}`;
              const ok = localResults[key];
              const qNo = range.start + index;
              const stem = question.prompt ?? question.id;
              const isRetrying = retryingKey === key;
              const interactive = !isReview || isRetrying;

              return (
                <div
                  key={`${question.id}-${index}`}
                  className="reading-question-card"
                >
                  <p className="reading-question-title">
                    <span className="reading-question-number">{qNo}</span>
                    {stem}
                  </p>
                  <div className="reading-options">
                    {question.options.map((option, optionIndex) => {
                      const isChosen = (answers[key] ?? "") === option;
                      const isCorrect = option === question.correctAnswer;
                      const optionStatus =
                        isReview && !isRetrying
                          ? isCorrect
                            ? "correct"
                            : isChosen
                              ? "incorrect"
                              : undefined
                          : undefined;

                      return (
                        <label
                          key={`${option}-${optionIndex}`}
                          className={[
                            "reading-option",
                            !interactive ? "reading-option--locked" : "",
                            optionStatus ? `reading-option--${optionStatus}` : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <input
                            className="option-radio"
                            disabled={!interactive}
                            type="radio"
                            name={key}
                            value={option}
                            checked={isChosen}
                            onChange={(event) => void handleSelect(key, event.target.value)}
                          />
                          <span className="reading-option__text">
                            <strong className="reading-option__label">{alpha[optionIndex]}</strong>
                            {option}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {isReview && ok === false && !isRetrying && onRetry ? (
                    <button
                      type="button"
                      className="paper-link-btn"
                      onClick={() => setRetryingKey(key)}
                    >
                      Try again
                    </button>
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
          </aside>
        </div>
      </div>
    </>
  );
}

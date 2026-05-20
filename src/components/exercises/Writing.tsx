"use client";

import { useState } from "react";
import type { ExerciseProps } from "@/components/exercises/shared";
import { WritingBrief } from "@/components/exercises/WritingBrief";
import { useWordCount, wordCountClasses } from "@/components/exercises/useWordCount";
import {
  WRITING_GENRE_LABEL,
  writingExamSpec,
  writingMinimumWords,
  writingWordTarget,
  type WritingPartId,
} from "@/lib/exercises/writing";
import {
  writingPart1Zod,
  writingPart2Zod,
  type WritingExercise,
} from "@/lib/exercises/types";

function parseWriting(props: ExerciseProps): WritingExercise | null {
  const exercise = props.exercise;
  if (exercise.type === "writing_part1") return writingPart1Zod.parse(exercise);
  if (exercise.type === "writing_part2") return writingPart2Zod.parse(exercise);
  return null;
}

export function Writing(props: ExerciseProps) {
  const exercise = parseWriting(props);
  const initial = (props.initialAnswers?.essay ?? "") as string;
  const [essay, setEssay] = useState<string>(initial);
  const fallbackRange: [number, number] = [1, 1];
  const wordState = useWordCount(essay, exercise?.wordRange ?? fallbackRange);

  if (!exercise) return <p className="text-[#A85448]">Unsupported writing exercise.</p>;

  const partKey: WritingPartId = exercise.type;
  const spec = writingExamSpec(exercise.exam, partKey);
  const genreLabel = WRITING_GENRE_LABEL[exercise.genre];
  const minimumWords = writingMinimumWords(exercise.exam, partKey);
  const submitting = Boolean(props.submitting);
  const tooShort = wordState.words < minimumWords;
  const targetLabel = writingWordTarget(exercise.exam, partKey);

  const handleSubmit = () => {
    if (!props.onSubmit || tooShort) return;
    props.onSubmit({ essay });
  };

  return (
    <>
      <div className="part-header">
        <span className="part-header__label">{spec.examHeading}</span>
        <span className="part-header__title">{exercise.title}</span>
        <span className="part-header__marks">
          {genreLabel} - {targetLabel}
        </span>
      </div>
      <div className="instructions-box">
        <strong>Task.</strong> {spec.promptInstruction}
      </div>

      <div className="paper-body">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <p className="eyebrow mb-3">Brief</p>
            <WritingBrief exercise={exercise} />
          </div>

          <div className="flex flex-col gap-3">
            {props.mode === "active" ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Your response</p>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${wordCountClasses(
                      wordState.tone,
                    )}`}
                    aria-live="polite"
                  >
                    {wordState.words} / {targetLabel}
                  </span>
                </div>
                <textarea
                  value={essay}
                  onChange={(event) => setEssay(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    partKey === "writing_part1"
                      ? "Begin your response. Address every content point."
                      : "Write in the chosen genre. Cover all the points in the brief."
                  }
                  disabled={submitting}
                  spellCheck
                  className="min-h-[440px] w-full rounded-[1.5rem] border border-[#DED8CF] bg-white/70 px-5 py-4 font-display text-base leading-relaxed text-[#2C2C24] outline-none transition-all duration-200 focus-visible:border-[#5D7052] focus-visible:ring-2 focus-visible:ring-[#5D7052]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF8] disabled:opacity-60"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#78786C]">
                    Press{" "}
                    <kbd className="rounded bg-[#E6DCCD] px-1.5 py-0.5 font-mono text-[10px] text-[#2C2C24]">
                      Ctrl/Cmd Enter
                    </kbd>{" "}
                    to submit.
                  </p>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={submitting || tooShort}
                  >
                    {submitting
                      ? "Marking..."
                      : tooShort
                        ? `Write at least ${minimumWords} words`
                        : "Submit for feedback"}
                    {!submitting && !tooShort ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    ) : null}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Your response (read only)</p>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${wordCountClasses(
                      wordState.tone,
                    )}`}
                  >
                    {wordState.words} / {targetLabel}
                  </span>
                </div>
                <article
                  className="passage-text rounded-[1.5rem] border border-[#DED8CF]/60 bg-[#FDFCF8] p-5"
                  style={{ fontSize: "1.02rem", lineHeight: 1.85, whiteSpace: "pre-wrap" }}
                >
                  {initial.trim().length > 0 ? initial : "(No response was recorded.)"}
                </article>
                <p className="text-xs text-[#78786C]">
                  Open this completed paper from Completed Papers or Mistakes to review the marker
                  feedback.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generateSimilarDrillSetAction,
  submitSimilarDrillSetAction,
} from "@/actions/practice";
import type {
  SimilarDrillSetItem,
  SimilarDrillSetResult,
} from "@/actions/practice-types";
import type { MistakeRow } from "@/actions/history";
import { Button } from "@/components/ui/Button";
import { ScoreSummary } from "@/components/ScoreSummary";
import { cn } from "@/lib/utils";

interface SimilarMistakePracticeSessionProps {
  mistakes: MistakeRow[];
  title: string;
  description?: string;
}

function refKey(ref: { attemptId: string; itemKey: string }) {
  return `${ref.attemptId}::${ref.itemKey}`;
}

const GAP_TOKEN_SPLIT_RE = /(\[gap\d*\]|\(gap\d*\)|\{gap\d*\}|<gap\d*>|\bgap\d+\b|_{3,})/gi;

function isGapTokenSegment(segment: string) {
  return /^(?:\[gap\d*\]|\(gap\d*\)|\{gap\d*\}|<gap\d*>|gap\d+|_{3,})$/i.test(segment.trim());
}

function renderPromptWithBlanks(text: string) {
  const parts = text.split(GAP_TOKEN_SPLIT_RE);
  return parts.map((segment, index) => {
    if (isGapTokenSegment(segment)) {
      return (
        <span
          key={index}
          className="mx-1 inline-block min-w-[3.5em] border-b-2 border-[#2C2C24]/70 align-baseline"
        >
          &nbsp;
        </span>
      );
    }
    return <span key={index}>{segment}</span>;
  });
}

function renderPassageWithBlanks(text: string, kind: "choice" | "text") {
  const parts = text.split(GAP_TOKEN_SPLIT_RE);
  return parts.map((segment, index) => {
    if (isGapTokenSegment(segment)) {
      if (kind === "choice") {
        return (
          <span
            key={index}
            className="mx-1 my-1 inline-flex items-center justify-center rounded-md border border-dashed border-[#5D7052]/50 bg-[#5D7052]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#5D7052]"
          >
            Missing paragraph
          </span>
        );
      }
      return (
        <span
          key={index}
          className="mx-1 inline-block min-w-[3.5em] border-b-2 border-[#2C2C24]/70 align-baseline"
        >
          &nbsp;
        </span>
      );
    }
    return <span key={index}>{segment}</span>;
  });
}

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; drills: SimilarDrillSetItem[] }
  | { kind: "grading"; drills: SimilarDrillSetItem[] }
  | {
      kind: "graded";
      drills: SimilarDrillSetItem[];
      results: Record<string, SimilarDrillSetResult>;
      score: number;
      maxScore: number;
    };

export function SimilarMistakePracticeSession({
  mistakes,
  title,
  description,
}: SimilarMistakePracticeSessionProps) {
  const refs = useMemo(
    () =>
      mistakes.map((mistake) => ({
        attemptId: mistake.attemptId,
        itemKey: mistake.itemKey,
      })),
    [mistakes],
  );

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const loadDrills = useCallback(async () => {
    if (refs.length === 0) {
      setPhase({ kind: "error", message: "No mistakes selected." });
      return;
    }
    setPhase({ kind: "loading" });
    setAnswers({});
    const result = await generateSimilarDrillSetAction({ items: refs });
    if ("error" in result) {
      setPhase({ kind: "error", message: result.error });
      return;
    }
    setPhase({ kind: "ready", drills: result.drills });
  }, [refs]);

  useEffect(() => {
    void loadDrills();
  }, [loadDrills]);

  const drills = phase.kind === "loading" || phase.kind === "error" ? [] : phase.drills;
  const answeredCount = drills.filter((entry) => (answers[refKey(entry.ref)] ?? "").trim().length > 0).length;
  const progressPercent = drills.length > 0 ? Math.round((answeredCount / drills.length) * 100) : 0;
  const allAnswered = drills.length > 0 && answeredCount === drills.length;

  const grade = async () => {
    if (phase.kind !== "ready") return;
    setPhase({ kind: "grading", drills: phase.drills });
    const payload = phase.drills.map((entry) => ({
      attemptId: entry.ref.attemptId,
      itemKey: entry.ref.itemKey,
      drill: entry.drill,
      answer: (answers[refKey(entry.ref)] ?? "").trim(),
    }));
    const response = await submitSimilarDrillSetAction({ items: payload });
    if ("error" in response) {
      setPhase({ kind: "error", message: response.error });
      return;
    }
    const indexed: Record<string, SimilarDrillSetResult> = {};
    for (const entry of response.results) {
      indexed[refKey(entry.ref)] = entry;
    }
    setPhase({
      kind: "graded",
      drills: phase.drills,
      results: indexed,
      score: response.score,
      maxScore: response.maxScore,
    });
  };

  if (mistakes.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl app-card text-center">
        <p className="eyebrow mb-3">Similar practice</p>
        <h2 className="font-display text-3xl text-[#2C2C24]">No mistakes available.</h2>
        <Link href="/dashboard/mistakes">
          <Button className="mt-6">Back to mistakes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="app-card mb-5">
        <p className="eyebrow mb-2">Similar practice</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl text-[#2C2C24]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[#78786C]">{description}</p> : null}
          </div>
          <span className="rounded-full bg-[#5D7052]/10 px-4 py-1.5 text-xs font-bold text-[#5D7052]">
            {mistakes.length} fresh exercise{mistakes.length === 1 ? "" : "s"}
          </span>
        </div>
        {drills.length > 0 ? (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-widest text-[#78786C]">
              <span>Answered</span>
              <span>
                {answeredCount} / {drills.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#DED8CF]/70">
              <div
                className="h-full rounded-full bg-[#5D7052] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {phase.kind === "graded" ? (
        <ScoreSummary score={phase.score} maxScore={phase.maxScore} />
      ) : null}

      {phase.kind === "loading" || phase.kind === "grading" ? (
        <div className="app-card text-center">
          <p className="eyebrow mb-3">
            {phase.kind === "loading" ? "Generating fresh exercises" : "Grading your drill"}
          </p>
          <p className="text-[#78786C]">
            {phase.kind === "loading"
              ? "Building a brand-new set of similar exercises based on your mistakes..."
              : "Checking each answer..."}
          </p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#DED8CF]/70">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#5D7052]" />
          </div>
        </div>
      ) : null}

      {phase.kind === "error" ? (
        <div className="app-card border border-[#A85448]/30 bg-[#A85448]/5">
          <p className="mb-4 text-sm font-bold text-[#A85448]">{phase.message}</p>
          <Button type="button" onClick={loadDrills}>
            Try again
          </Button>
        </div>
      ) : null}

      {phase.kind === "ready" || phase.kind === "grading" || phase.kind === "graded" ? (
        <div className="space-y-5">
          {phase.drills.map((entry, index) => {
            const key = refKey(entry.ref);
            const value = answers[key] ?? "";
            const result = phase.kind === "graded" ? phase.results[key] : undefined;
            const disabled = phase.kind !== "ready";

            return (
              <section key={key} className="app-card">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow mb-2">
                      {entry.source.exam} — {entry.source.partName} · Q{entry.source.questionNumber}
                    </p>
                    <h3 className="font-display text-2xl text-[#2C2C24]">
                      {renderPromptWithBlanks(entry.drill.prompt)}
                    </h3>
                    <p className="mt-1 text-sm text-[#78786C]">
                      Based on: {entry.source.title}
                    </p>
                  </div>
                  {result ? (
                    <span className={result.accepted ? "status-pass" : "status-fail"}>
                      {result.accepted ? "Correct" : "Still wrong"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#E6DCCD] px-3 py-1 text-xs font-bold text-[#4A4A40]">
                      {index + 1} / {phase.drills.length}
                    </span>
                  )}
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#5D7052]/10 px-3 py-1 text-xs font-bold text-[#5D7052]">
                    {entry.drill.skillLabel}
                  </span>
                </div>

                {entry.drill.context ? (
                  <p className="passage-text mb-4 whitespace-pre-wrap text-base">
                    {renderPassageWithBlanks(entry.drill.context, entry.drill.kind)}
                  </p>
                ) : null}

                {entry.drill.kind === "choice" && entry.drill.choices?.length ? (
                  <div className="mb-4 grid gap-2">
                    {entry.drill.choices.map((choice) => {
                      const picked = value === choice;
                      const correct = result && choice === result.correctAnswer;
                      const wrongPick = result && picked && !result.accepted && !correct;
                      return (
                        <label
                          key={choice}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm",
                            !result && "border-[#DED8CF] bg-white/80 hover:bg-white",
                            correct && "border-[#5D7052] bg-[#5D7052]/10",
                            wrongPick && "border-[#A85448] bg-[#A85448]/10",
                            result && !correct && !wrongPick && "border-[#DED8CF] bg-white/40 opacity-70",
                          )}
                        >
                          <input
                            className="option-radio"
                            type="radio"
                            name={key}
                            checked={picked}
                            disabled={disabled}
                            onChange={() => setAnswers((prev) => ({ ...prev, [key]: choice }))}
                          />
                          <span className="flex-1 text-[#4A4A40]">{choice}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    className="answer-input mb-4"
                    value={value}
                    disabled={disabled}
                    placeholder="Type your answer"
                    spellCheck={false}
                    onChange={(event) =>
                      setAnswers((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    style={{ width: "min(100%, 420px)" }}
                  />
                )}

                {result ? (
                  <div className="mt-4 rounded-md bg-[#E6DCCD]/50 p-4 text-sm text-[#4A4A40]">
                    <p>
                      <span className="font-bold">Answer: </span>
                      {result.correctAnswer}
                    </p>
                    <p className="mt-2">
                      <span className="font-bold">Why: </span>
                      {result.explanation}
                    </p>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {phase.kind === "ready" || phase.kind === "grading" ? (
        <div className="sticky bottom-4 mt-8 rounded-[2rem] border border-[#DED8CF] bg-[#FFFCF4]/95 p-3 shadow-soft backdrop-blur">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2 text-sm font-bold text-[#4A4A40]">
            <span>
              Answered {answeredCount} of {drills.length}
            </span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#DED8CF]/70">
            <div
              className="h-full rounded-full bg-[#5D7052] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/dashboard/mistakes?mode=drill">
              <Button type="button" variant="outline" size="sm">
                Back to drill sets
              </Button>
            </Link>
            <button
              type="button"
              className="submit-btn"
              disabled={phase.kind !== "ready" || !allAnswered}
              onClick={grade}
            >
              {phase.kind === "grading" ? "Checking..." : "Grade this drill"}
            </button>
          </div>
        </div>
      ) : null}

      {phase.kind === "graded" ? (
        <div className="mt-8 flex flex-wrap justify-between gap-2">
          <Link href="/dashboard/mistakes?mode=drill">
            <Button type="button" variant="ghost" size="sm">
              Back to drill sets
            </Button>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/practice">
              <Button type="button" variant="outline" size="sm">
                Practice something else
              </Button>
            </Link>
            <Button type="button" onClick={loadDrills}>
              Repeat — generate other similar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

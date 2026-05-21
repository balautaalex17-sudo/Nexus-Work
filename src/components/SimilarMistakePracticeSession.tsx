"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  generateSimilarMistakeDrillAction,
  submitSimilarMistakeDrillAction,
  type SimilarMistakeDrill,
} from "@/actions/practice";
import type { MistakeRow } from "@/actions/history";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SimilarMistakePracticeSessionProps {
  mistakes: MistakeRow[];
  title: string;
  description?: string;
}

type DrillState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      drill: SimilarMistakeDrill;
      answer: string;
      result: null | {
        accepted: boolean;
        correctAnswer: string;
        explanation: string;
        progress: { attempted: number; correct: number; lastPracticedAt: string };
      };
    };

function refKey(mistake: MistakeRow) {
  return `${mistake.attemptId}::${mistake.itemKey}`;
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

export function SimilarMistakePracticeSession({
  mistakes,
  title,
  description,
}: SimilarMistakePracticeSessionProps) {
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<DrillState>({ status: "idle" });
  const [localProgress, setLocalProgress] = useState<
    Record<string, { attempted: number; correct: number; lastPracticedAt?: string }>
  >({});
  const [pending, startTransition] = useTransition();

  const current = mistakes[index] ?? null;
  const currentKey = current ? refKey(current) : "";
  const progress = current
    ? localProgress[currentKey] ?? current.similarPractice ?? { attempted: 0, correct: 0 }
    : { attempted: 0, correct: 0 };

  const completedCount = useMemo(
    () =>
      mistakes.filter((mistake) => {
        const stats = localProgress[refKey(mistake)] ?? mistake.similarPractice;
        return (stats?.attempted ?? 0) > 0;
      }).length,
    [localProgress, mistakes],
  );

  const fetchDrill = useCallback(() => {
    if (!current) return;
    setState({ status: "loading" });
    startTransition(async () => {
      const result = await generateSimilarMistakeDrillAction({
        attemptId: current.attemptId,
        itemKey: current.itemKey,
      });
      if ("error" in result) {
        setState({ status: "error", message: result.error });
        return;
      }
      setState({ status: "ready", drill: result.drill, answer: "", result: null });
    });
  }, [current]);

  useEffect(() => {
    fetchDrill();
  }, [fetchDrill]);

  const submit = () => {
    if (!current || state.status !== "ready") return;
    startTransition(async () => {
      const result = await submitSimilarMistakeDrillAction({
        attemptId: current.attemptId,
        itemKey: current.itemKey,
        drill: state.drill,
        answer: state.answer,
      });
      if ("error" in result) {
        setState({ status: "error", message: result.error });
        return;
      }
      setLocalProgress((prev) => ({ ...prev, [currentKey]: result.progress }));
      setState({ ...state, result });
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
            {completedCount} / {mistakes.length} practised
          </span>
        </div>
      </div>

      <section className="app-card">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">
              {current?.exam} - {current?.partName}
            </p>
            <h3 className="font-display text-2xl text-[#2C2C24]">
              {current?.prompt ? renderPromptWithBlanks(current.prompt) : null}
            </h3>
            <p className="mt-1 text-sm text-[#78786C]">
              Original: {current?.title} - question {current?.questionNumber}
            </p>
          </div>
          <span className="rounded-full bg-[#E6DCCD] px-3 py-1 text-xs font-bold text-[#4A4A40]">
            {index + 1} / {mistakes.length}
          </span>
        </div>

        <div className="mb-5 rounded-2xl border border-[#DED8CF] bg-[#FFFCF4]/80 p-4 text-sm text-[#4A4A40]">
          Similar practice for this mistake: {progress.attempted} done, {progress.correct} correct.
        </div>

        {state.status === "loading" || state.status === "idle" ? (
          <div className="rounded-2xl border border-[#DED8CF] bg-white/70 p-8 text-center text-[#78786C]">
            Generating a fresh mini exercise...
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="rounded-2xl border border-[#A85448]/30 bg-[#A85448]/10 p-5">
            <p className="mb-4 text-sm font-bold text-[#A85448]">{state.message}</p>
            <Button type="button" onClick={fetchDrill}>
              Try again
            </Button>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <div className="rounded-2xl border border-[#DED8CF] bg-white/70 p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#5D7052]/10 px-3 py-1 text-xs font-bold text-[#5D7052]">
                {state.drill.skillLabel}
              </span>
              {state.result ? (
                <span className={state.result.accepted ? "status-pass" : "status-fail"}>
                  {state.result.accepted ? "Correct" : "Try this pattern again"}
                </span>
              ) : null}
            </div>
            {state.drill.context ? (
              <p className="passage-text mb-4 whitespace-pre-wrap text-base">
                {renderPassageWithBlanks(state.drill.context, state.drill.kind)}
              </p>
            ) : null}
            <h4 className="mb-4 font-display text-xl text-[#2C2C24]">
              {renderPromptWithBlanks(state.drill.prompt)}
            </h4>

            {state.drill.kind === "choice" && state.drill.choices?.length ? (
              <div className="mb-4 grid gap-2">
                {state.drill.choices.map((choice) => {
                  const picked = state.answer === choice;
                  const correct = state.result && choice === state.result.correctAnswer;
                  const wrongPick = state.result && picked && !correct;
                  return (
                    <label
                      key={choice}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm",
                        !state.result && "border-[#DED8CF] bg-white/80 hover:bg-white",
                        correct && "border-[#5D7052] bg-[#5D7052]/10",
                        wrongPick && "border-[#A85448] bg-[#A85448]/10",
                        state.result && !correct && !wrongPick && "border-[#DED8CF] bg-white/40 opacity-70",
                      )}
                    >
                      <input
                        className="option-radio"
                        type="radio"
                        checked={picked}
                        disabled={pending || Boolean(state.result)}
                        onChange={() => setState({ ...state, answer: choice })}
                      />
                      <span className="flex-1 text-[#4A4A40]">{choice}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <input
                className="answer-input mb-4"
                value={state.answer}
                disabled={pending || Boolean(state.result)}
                placeholder="Type your answer"
                spellCheck={false}
                onChange={(event) => setState({ ...state, answer: event.target.value })}
                style={{ width: "min(100%, 420px)" }}
              />
            )}

            {state.result ? (
              <div className="mt-4 rounded-md bg-[#E6DCCD]/50 p-4 text-sm text-[#4A4A40]">
                <p>
                  <span className="font-bold">Answer: </span>
                  {state.result.correctAnswer}
                </p>
                <p className="mt-2">
                  <span className="font-bold">Why: </span>
                  {state.result.explanation}
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={fetchDrill} disabled={pending}>
                Try another similar one
              </Button>
              {state.result ? (
                <Button
                  type="button"
                  onClick={() => {
                    setIndex((value) => (value + 1) % mistakes.length);
                  }}
                >
                  Next mistake
                </Button>
              ) : (
                <Button type="button" disabled={pending || !state.answer.trim()} onClick={submit}>
                  {pending ? "Checking..." : "Check answer"}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-6 flex flex-wrap justify-between gap-2">
        <Link href="/dashboard/mistakes?mode=drill">
          <Button type="button" variant="ghost" size="sm">
            Back to drill sets
          </Button>
        </Link>
        <Link href="/practice">
          <Button type="button" variant="outline" size="sm">
            Practice something else
          </Button>
        </Link>
      </div>
    </div>
  );
}

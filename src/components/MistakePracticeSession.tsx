"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitMistakePracticeAction } from "@/actions/practice";
import type { MistakeRow } from "@/actions/history";
import { ScoreSummary } from "@/components/ScoreSummary";
import { DrillSourceText } from "@/components/DrillSourceText";
import { hasGapTokens } from "@/components/exercises/shared";
import { MiniDrillPanel } from "@/components/MiniDrillPanel";
import { Button } from "@/components/ui/Button";

interface MistakePracticeSessionProps {
  mistakes: MistakeRow[];
  drillTitle?: string;
  drillDescription?: string;
  itemLabel?: string;
}

function choiceValue(choice: string) {
  const match = choice.match(/^([A-Z])\.\s+/);
  return match ? match[1] : choice;
}

export function MistakePracticeSession({
  mistakes,
  drillTitle,
  drillDescription,
  itemLabel = "mistake",
}: MistakePracticeSessionProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<{ score: number; maxScore: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const keyedMistakes = useMemo(
    () =>
      mistakes.map((mistake) => ({
        ...mistake,
        drillKey: `${mistake.attemptId}::${mistake.itemKey}`,
      })),
    [mistakes],
  );
  const answeredCount = keyedMistakes.filter(
    (mistake) => (answers[mistake.drillKey] ?? "").trim().length > 0,
  ).length;
  const progressPercent =
    keyedMistakes.length > 0 ? Math.round((answeredCount / keyedMistakes.length) * 100) : 0;
  const checkedCount = Object.keys(results).length;
  const pluralItemLabel = itemLabel === "question" ? "questions" : `${itemLabel}s`;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitMistakePracticeAction({
        items: keyedMistakes.map((mistake) => ({
          attemptId: mistake.attemptId,
          itemKey: mistake.itemKey,
          answer: answers[mistake.drillKey] ?? "",
        })),
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setResults(
        Object.fromEntries(
          result.results.map((item) => [`${item.attemptId}::${item.itemKey}`, item.accepted]),
        ),
      );
      setScore({ score: result.score, maxScore: result.maxScore });
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      {drillTitle ? (
        <div className="app-card mb-5">
          <p className="eyebrow mb-2">Current drill</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl text-[#2C2C24]">{drillTitle}</h2>
              {drillDescription ? (
                <p className="mt-1 text-sm text-[#78786C]">{drillDescription}</p>
              ) : null}
            </div>
            <span className="rounded-full bg-[#A85448]/10 px-4 py-1.5 text-xs font-bold text-[#A85448]">
              {keyedMistakes.length} {keyedMistakes.length === 1 ? itemLabel : pluralItemLabel}
            </span>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-widest text-[#78786C]">
              <span>Answered</span>
              <span>
                {answeredCount} / {keyedMistakes.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#DED8CF]/70">
              <div
                className="h-full rounded-full bg-[#5D7052] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {checkedCount > 0 ? (
              <p className="mt-3 text-sm text-[#78786C]">
                Checked {checkedCount} item{checkedCount === 1 ? "" : "s"} this round.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {score ? <ScoreSummary score={score.score} maxScore={score.maxScore} /> : null}
      {error ? (
        <div className="mb-4 rounded-md border border-[#A85448]/30 bg-[#A85448]/10 px-4 py-3 text-sm font-bold text-[#A85448]">
          {error}
        </div>
      ) : null}

      <div className="space-y-5">
        {keyedMistakes.map((mistake, index) => {
          const status = results[mistake.drillKey];
          const value = answers[mistake.drillKey] ?? "";

          return (
            <section key={mistake.drillKey} className="app-card">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow mb-2">
                    {mistake.part.replace("part", "Part ")} - Question {mistake.questionNumber}
                  </p>
                  <h2 className="font-display text-2xl text-[#2C2C24]">{mistake.prompt}</h2>
                  <p className="mt-1 text-sm text-[#78786C]">
                    From {mistake.title} - {mistake.exam}
                  </p>
                </div>
                {status !== undefined ? (
                  <span className={status ? "status-pass" : "status-fail"}>
                    {status ? "Correct" : "Still wrong"}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#E6DCCD] px-3 py-1 text-xs font-bold text-[#4A4A40]">
                    {index + 1} / {keyedMistakes.length}
                  </span>
                )}
              </div>

              {mistake.context ? (
                <details className="mb-4 rounded-md border border-[#DED8CF] bg-[#FFFCF4] p-4">
                  <summary className="cursor-pointer font-bold text-[#183F73]">
                    Show source text
                  </summary>
                  {hasGapTokens(mistake.context) ? (
                    <DrillSourceText
                      text={mistake.context}
                      activeKey={mistake.itemKey}
                      activeNumber={mistake.questionNumber}
                    />
                  ) : (
                    <p className="passage-text mt-3 whitespace-pre-wrap text-base">
                      {mistake.context}
                    </p>
                  )}
                </details>
              ) : null}

              {mistake.choices && mistake.choices.length > 0 ? (
                <div className="mb-4 grid gap-2">
                  {mistake.choices.map((choice) => {
                    const optionValue = choiceValue(choice);
                    return (
                      <label
                        key={choice}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-[#DED8CF] bg-white/70 p-3"
                      >
                        <input
                          className="option-radio"
                          type="radio"
                          name={mistake.drillKey}
                          value={optionValue}
                          checked={value === optionValue}
                          disabled={pending}
                          onChange={(event) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [mistake.drillKey]: event.target.value,
                            }))
                          }
                        />
                        <span className="text-sm text-[#4A4A40]">{choice}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input
                  className="answer-input mb-4"
                  value={value}
                  disabled={pending}
                  placeholder="Type your answer"
                  spellCheck={false}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [mistake.drillKey]: event.target.value }))
                  }
                  style={{ width: "min(100%, 420px)" }}
                />
              )}

              {status === false ? (
                <p className="text-sm text-[#78786C]">
                  Expected: <span className="font-mono font-bold text-[#5D7052]">{mistake.correctAnswer}</span>
                </p>
              ) : null}

              {mistake.kind === "question" &&
              (!mistake.choices || mistake.choices.length === 0) &&
              mistake.correctAnswer.trim().length > 0 &&
              mistake.correctAnswer.trim().split(/\s+/).length <= 3 ? (
                <div className="mt-4 border-t border-[#DED8CF] pt-4">
                  <MiniDrillPanel
                    word={mistake.correctAnswer.trim()}
                    exam={mistake.exam}
                    partType={mistake.part}
                  />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-4 mt-8 rounded-[2rem] border border-[#DED8CF] bg-[#FFFCF4]/95 p-3 shadow-soft backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2 text-sm font-bold text-[#4A4A40]">
          <span>
            Answered {answeredCount} of {keyedMistakes.length}
          </span>
          {score ? (
            <span className="text-[#5D7052]">
              Latest score: {score.score}/{score.maxScore}
            </span>
          ) : null}
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#DED8CF]/70">
          <div
            className="h-full rounded-full bg-[#5D7052] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/mistakes?mode=drill">
              <Button type="button" variant="ghost" size="sm">
                &larr; Drill Sets
              </Button>
            </Link>
            <Link href="/dashboard/mistakes">
              <Button type="button" variant="ghost" size="sm">
                &larr; Mistakes
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/practice">
              <Button type="button" variant="outline" size="sm">
                Practice something else
              </Button>
            </Link>
            <button type="button" className="submit-btn" disabled={pending} onClick={submit}>
              {pending ? "Checking..." : "Grade this drill"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

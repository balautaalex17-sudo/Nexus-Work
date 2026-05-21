"use client";

import { useState, useTransition } from "react";
import {
  generateContextualDrillAction,
  type ContextualDrill,
} from "@/actions/practice";
import type { Exam } from "@/lib/exercises/types";
import { cn } from "@/lib/utils";

type MiniDrillState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; drill: ContextualDrill; pickedIndex: number | null; revealed: boolean };

interface MiniDrillPanelProps {
  word: string;
  exam: Exam;
  partType: string;
}

export function MiniDrillPanel({ word, exam, partType }: MiniDrillPanelProps) {
  const [state, setState] = useState<MiniDrillState>({ status: "idle" });
  const [, startTransition] = useTransition();

  const fetchDrill = () => {
    setState({ status: "loading" });
    startTransition(async () => {
      const result = await generateContextualDrillAction({ word, exam, partType });
      if ("error" in result) {
        setState({ status: "error", message: result.error });
        return;
      }
      setState({
        status: "ready",
        drill: result.drill,
        pickedIndex: null,
        revealed: false,
      });
    });
  };

  if (state.status === "idle") {
    return (
      <button
        type="button"
        className="text-sm font-bold text-[#5D7052] hover:underline"
        onClick={fetchDrill}
      >
        Practice &ldquo;{word}&rdquo; in a new sentence &rarr;
      </button>
    );
  }

  if (state.status === "loading") {
    return <p className="text-sm text-[#78786C]">Generating fresh practice&hellip;</p>;
  }

  if (state.status === "error") {
    return (
      <div className="text-sm">
        <p className="mb-2 text-[#A85448]">{state.message}</p>
        <button
          type="button"
          className="font-bold text-[#5D7052] hover:underline"
          onClick={fetchDrill}
        >
          Try again
        </button>
      </div>
    );
  }

  const { drill, pickedIndex, revealed } = state;

  return (
    <div className="rounded-md border border-[#DED8CF] bg-[#FDFCF8] p-4">
      <p className="eyebrow mb-2">New context for &ldquo;{word}&rdquo;</p>
      <p className="passage-text mb-3 text-base leading-relaxed">{drill.sentence}</p>
      <div className="grid gap-2">
        {drill.options.map((opt, i) => {
          const isPicked = pickedIndex === i;
          const isCorrect = i === drill.correctIndex;
          const showCorrect = revealed && isCorrect;
          const showWrongPick = revealed && isPicked && !isCorrect;
          return (
            <label
              key={`${opt}-${i}`}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                !revealed && "border-[#DED8CF] bg-white/70 hover:bg-white",
                showCorrect && "border-[#5D7052] bg-[#5D7052]/10",
                showWrongPick && "border-[#A85448] bg-[#A85448]/10",
                revealed && !isCorrect && !isPicked && "border-[#DED8CF] bg-white/40 opacity-70",
              )}
            >
              <input
                className="option-radio"
                type="radio"
                name={`mini-${word}-${exam}-${partType}`}
                disabled={revealed}
                checked={isPicked}
                onChange={() => setState({ ...state, pickedIndex: i })}
              />
              <span className="flex-1 text-[#4A4A40]">{opt}</span>
              {showCorrect ? (
                <span className="text-xs font-bold text-[#5D7052]">Correct</span>
              ) : null}
              {showWrongPick ? (
                <span className="text-xs font-bold text-[#A85448]">Your pick</span>
              ) : null}
            </label>
          );
        })}
      </div>

      {!revealed ? (
        <div className="mt-4 text-right">
          <button
            type="button"
            className="submit-btn"
            disabled={pickedIndex === null}
            onClick={() => setState({ ...state, revealed: true })}
          >
            Check
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="rounded-md bg-[#E6DCCD]/50 p-3 text-sm text-[#4A4A40]">
            <span className="font-bold">Why: </span>
            {drill.explanation}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <button
              type="button"
              className="font-bold text-[#5D7052] hover:underline"
              onClick={fetchDrill}
            >
              Try another sentence
            </button>
            <button
              type="button"
              className="text-[#78786C] hover:underline"
              onClick={() => setState({ status: "idle" })}
            >
              Hide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

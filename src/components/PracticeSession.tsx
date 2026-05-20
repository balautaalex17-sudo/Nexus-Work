"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAttemptAction } from "@/actions/practice";
import { submitWritingAction } from "@/actions/writing";
import { ExerciseRenderer } from "@/components/ExerciseRenderer";
import type { Exercise } from "@/lib/exercises/types";

interface PracticeSessionProps {
  exercise: Exercise;
}

export function PracticeSession({ exercise }: PracticeSessionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isWriting =
    exercise.type === "writing_part1" || exercise.type === "writing_part2";

  const handleSubmit = (answers: Record<string, string>) => {
    setError(null);
    startTransition(async () => {
      if (isWriting) {
        const essayText = String(answers.essay ?? "");
        const result = await submitWritingAction({ exercise, essayText });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        router.push(`/dashboard/writing/${result.id}`);
        return;
      }
      const result = await submitAttemptAction({ exercise, userAnswers: answers });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/history/${result.id}`);
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {pending ? (
        <div className="mx-auto mb-4 flex w-full max-w-3xl items-center gap-3 rounded-full border border-[#DED8CF]/60 bg-white/80 px-6 py-3 text-sm text-[#78786C] shadow-soft backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#5D7052]" />
          {isWriting ? "Marking your writing..." : "Marking your answers..."}
        </div>
      ) : null}
      {error ? (
        <div className="mx-auto mb-4 w-full max-w-3xl rounded-md border border-[#A85448]/30 bg-[#A85448]/10 px-5 py-3 text-sm font-bold text-[#A85448]">
          {error}
        </div>
      ) : null}
      <ExerciseRenderer
        exercise={exercise}
        mode="active"
        onSubmit={handleSubmit}
        submitting={pending}
      />
    </div>
  );
}

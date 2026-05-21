"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  exerciseSchema,
  writingPart1Zod,
  writingPart2Zod,
  type Exercise,
  type WritingExercise,
} from "@/lib/exercises/types";
import {
  gradeWriting,
  WRITING_MAX_BAND,
  writingTotalBand,
} from "@/lib/exercises/aiWritingFeedback";
import { isWritingPart, type WritingPartId } from "@/lib/exercises/writing";
import { consumeAiQuota, quotaErrorMessage } from "@/lib/security/rateLimit";
import { safeActionError } from "@/lib/errors";

const writingExerciseSchema = exerciseSchema.refine(
  (exercise): exercise is WritingExercise =>
    exercise.type === "writing_part1" || exercise.type === "writing_part2",
  { message: "Not a writing exercise." },
);

function parseWriting(exercise: Exercise): WritingExercise {
  if (exercise.type === "writing_part1") return writingPart1Zod.parse(exercise);
  if (exercise.type === "writing_part2") return writingPart2Zod.parse(exercise);
  throw new Error("Not a writing exercise.");
}

export async function submitWritingAction(input: {
  exercise: Exercise;
  essayText: string;
}): Promise<{ id: string; total: number; max: number } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const quota = await consumeAiQuota();
    if (!quota.allowed) {
      return { error: quotaErrorMessage(quota) };
    }

    const parsed = writingExerciseSchema.safeParse(input.exercise);
    if (!parsed.success) return { error: "Submission is not a writing exercise." };

    const exercise = parseWriting(parsed.data);
    const essayText = String(input.essayText ?? "").trim();
    if (!essayText) return { error: "Write something before submitting." };

    const feedback = await gradeWriting({ exercise, essayText });
    const total = writingTotalBand(feedback);
    const partId: WritingPartId = exercise.type;

    if (!isWritingPart(partId)) {
      return { error: "Writing submission has an invalid part." };
    }

    const { data, error } = await supabase
      .from("history")
      .insert({
        user_id: user.id,
        exam: exercise.exam,
        part: partId,
        title: exercise.title,
        topic: exercise.topic,
        exercise,
        user_answers: { essay: essayText },
        writing_feedback: feedback,
        genre: exercise.genre,
        score: total,
        max_score: WRITING_MAX_BAND,
      })
      .select("id")
      .single();

    if (error) {
      return { error: safeActionError(error, "Could not save the writing attempt. Try again.") };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/writing");
    revalidatePath(`/dashboard/writing/${data.id as string}`);

    return { id: data.id as string, total, max: WRITING_MAX_BAND };
  } catch (error) {
    return { error: safeActionError(error, "Writing submit failed. Try again.") };
  }
}

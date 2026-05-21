"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateExercise } from "@/lib/exercises/generate";
import {
  exerciseSchema,
  examSchema,
  partSchema,
  type Exam,
  type Exercise,
  type PartId,
} from "@/lib/exercises/types";
import { scoreExercise, totalsFromPerItem } from "@/lib/exercises/validators";
import { updateMistakeLog } from "@/lib/exercises/mistakeLog";
import {
  applyAcceptedAnswers,
  collectVerifyItems,
  verifyAlternativeAnswers,
} from "@/lib/exercises/aiCheck";
import {
  WRITING_GENRES,
  isWritingPart,
  type WritingGenre,
} from "@/lib/exercises/writing";
import { consumeAiQuota, quotaErrorMessage } from "@/lib/security/rateLimit";
import { safeActionError } from "@/lib/errors";

const partMap: Record<Exercise["type"], PartId> = {
  use_of_english_part1: "part1",
  use_of_english_part2: "part2",
  use_of_english_part3: "part3",
  use_of_english_part4: "part4",
  reading_part5: "part5",
  reading_part6: "part6",
  reading_part7: "part7",
  writing_part1: "writing_part1",
  writing_part2: "writing_part2",
};

function dismissedKeys(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((item): item is string => typeof item === "string"));
}

function parseGenre(raw: unknown): WritingGenre | undefined {
  if (typeof raw !== "string") return undefined;
  return (WRITING_GENRES as readonly string[]).includes(raw) ? (raw as WritingGenre) : undefined;
}

export async function generateExerciseAction(
  exam: Exam,
  part: PartId,
  genre?: string,
): Promise<{ exercise: Exercise } | { error: string }> {
  const validExam = examSchema.safeParse(exam);
  const validPart = partSchema.safeParse(part);
  if (!validExam.success || !validPart.success) {
    return { error: "Invalid exam or part." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const quota = await consumeAiQuota();
    if (!quota.allowed) {
      return { error: quotaErrorMessage(quota) };
    }

    const resolvedGenre = isWritingPart(part) ? parseGenre(genre) : undefined;

    const { data: recent } = await supabase
      .from("history")
      .select("title, topic_normalized")
      .eq("user_id", user.id)
      .eq("exam", exam)
      .eq("part", part)
      .order("created_at", { ascending: false })
      .limit(50);

    let excludeTitles = (recent ?? []).map((row) => row.title as string);
    let excludeTopics = Array.from(
      new Set((recent ?? []).map((row) => row.topic_normalized as string)),
    );
    let generated: Exercise | null = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      generated = await generateExercise({
        exam,
        part,
        excludeTitles,
        excludeTopics,
        genre: resolvedGenre,
      });
      const normalizedTopic = generated.topic.toLowerCase().replace(/\s+/g, " ").trim();

      const { data: collision } = await supabase
        .from("history")
        .select("id")
        .eq("user_id", user.id)
        .eq("exam", exam)
        .eq("part", part)
        .or(`title.eq.${generated.title},topic_normalized.eq.${normalizedTopic}`)
        .limit(1)
        .maybeSingle();

      if (!collision) break;

      excludeTitles = [...excludeTitles, generated.title];
      excludeTopics = [...excludeTopics, normalizedTopic];
    }

    if (!generated) {
      return { error: "Could not generate an exercise." };
    }

    return { exercise: exerciseSchema.parse(generated) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    if (message.startsWith("Failed to generate exercise after retries")) {
      return {
        error:
          "The AI returned a malformed paper twice. Please try again; the app will repair common format mistakes automatically.",
      };
    }
    return { error: safeActionError(error, "Could not generate an exercise. Try again.") };
  }
}

export async function submitAttemptAction(input: {
  exercise: Exercise;
  userAnswers: Record<string, string> | Record<string, string[]>;
}): Promise<{ id: string; score: number; maxScore: number } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const quota = await consumeAiQuota();
    if (!quota.allowed) {
      return { error: quotaErrorMessage(quota) };
    }

    const exercise = exerciseSchema.parse(input.exercise);
    if (exercise.type === "writing_part1" || exercise.type === "writing_part2") {
      return {
        error: "Use submitWritingAction for writing submissions.",
      };
    }
    const exact = scoreExercise(exercise, input.userAnswers);

    const verifyItems = collectVerifyItems(
      exercise,
      input.userAnswers as Record<string, string>,
      exact.perItem,
    );
    const aiAccepted = await verifyAlternativeAnswers(verifyItems);
    const perItem = applyAcceptedAnswers(exact.perItem, aiAccepted);
    const { score, maxScore } = totalsFromPerItem(perItem);
    const mistakeLog = updateMistakeLog({
      currentLog: [],
      exercise,
      userAnswers: input.userAnswers,
      perItem,
    });

    const { data, error } = await supabase
      .from("history")
      .insert({
        user_id: user.id,
        exam: exercise.exam,
        part: partMap[exercise.type],
        title: exercise.title,
        topic: exercise.topic,
        exercise,
        user_answers: input.userAnswers,
        per_item: perItem,
        ai_accepted: aiAccepted,
        mistake_log: mistakeLog,
        score,
        max_score: maxScore,
      })
      .select("id")
      .single();

    if (error) {
      return { error: safeActionError(error, "Could not save the attempt. Try again.") };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/history");
    revalidatePath("/dashboard/mistakes");

    return { id: data.id as string, score, maxScore };
  } catch (error) {
    return { error: safeActionError(error, "Submit failed. Try again.") };
  }
}

export async function retryItemAction(input: {
  attemptId: string;
  itemKey: string;
  newAnswer: string;
}): Promise<
  | { perItem: Record<string, boolean>; score: number; maxScore: number; accepted: boolean }
  | { error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const quota = await consumeAiQuota();
    if (!quota.allowed) {
      return { error: quotaErrorMessage(quota) };
    }

    const { data: row, error: loadError } = await supabase
      .from("history")
      .select("*")
      .eq("id", input.attemptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError || !row) {
      return { error: "Attempt not found." };
    }

    const exercise = exerciseSchema.parse(row.exercise);
    if (exercise.type === "writing_part1" || exercise.type === "writing_part2") {
      return { error: "Writing attempts do not support per-item retry." };
    }
    const userAnswers = {
      ...((row.user_answers as Record<string, string>) ?? {}),
      [input.itemKey]: input.newAnswer,
    };

    const exact = scoreExercise(exercise, userAnswers);
    const storedAccepted = (row.ai_accepted as Record<string, boolean>) ?? {};
    const updatedAccepted: Record<string, boolean> = { ...storedAccepted };
    delete updatedAccepted[input.itemKey];

    if (!exact.perItem[input.itemKey] && input.newAnswer.trim().length > 0) {
      const verifyItems = collectVerifyItems(exercise, userAnswers, exact.perItem).filter(
        (v) => v.key === input.itemKey,
      );
      const verdict = await verifyAlternativeAnswers(verifyItems);
      if (verdict[input.itemKey]) {
        updatedAccepted[input.itemKey] = true;
      }
    }

    const perItem = applyAcceptedAnswers(exact.perItem, updatedAccepted);
    const { score, maxScore } = totalsFromPerItem(perItem);
    const mistakeLog = updateMistakeLog({
      currentLog: row.mistake_log,
      exercise,
      userAnswers,
      perItem,
    });

    const { error: updateError } = await supabase
      .from("history")
      .update({
        user_answers: userAnswers,
        ai_accepted: updatedAccepted,
        per_item: perItem,
        mistake_log: mistakeLog,
        score,
        max_score: maxScore,
      })
      .eq("id", input.attemptId)
      .eq("user_id", user.id);

    if (updateError) {
      return { error: safeActionError(updateError, "Could not save the retry. Try again.") };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/history");
    revalidatePath("/dashboard/mistakes");
    revalidatePath(`/dashboard/history/${input.attemptId}`);

    return {
      perItem,
      score,
      maxScore,
      accepted: perItem[input.itemKey] === true,
    };
  } catch (error) {
    return { error: safeActionError(error, "Retry failed. Try again.") };
  }
}

export async function submitMistakePracticeAction(input: {
  items: Array<{ attemptId: string; itemKey: string; answer: string }>;
}): Promise<
  | {
      results: Array<{ attemptId: string; itemKey: string; accepted: boolean }>;
      score: number;
      maxScore: number;
    }
  | { error: string }
> {
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

    const items = input.items
      .map((item) => ({
        attemptId: String(item.attemptId ?? ""),
        itemKey: String(item.itemKey ?? ""),
        answer: String(item.answer ?? "").trim(),
      }))
      .filter((item) => item.attemptId && item.itemKey);

    if (items.length === 0) return { error: "No mistakes were submitted." };

    const byAttempt = new Map<string, typeof items>();
    for (const item of items) {
      byAttempt.set(item.attemptId, [...(byAttempt.get(item.attemptId) ?? []), item]);
    }

    const { data: rows, error: loadError } = await supabase
      .from("history")
      .select("*")
      .eq("user_id", user.id)
      .in("id", Array.from(byAttempt.keys()));

    if (loadError || !rows) {
      return { error: safeActionError(loadError, "Could not load mistakes.") };
    }

    const prepared = rows.map((row) => {
      const exercise = exerciseSchema.parse(row.exercise);
      if (exercise.type === "writing_part1" || exercise.type === "writing_part2") {
        throw new Error("Writing attempts can not be drilled.");
      }
      const attempted = byAttempt.get(row.id as string) ?? [];
      const userAnswers = {
        ...((row.user_answers as Record<string, string>) ?? {}),
      };
      for (const item of attempted) {
        userAnswers[item.itemKey] = item.answer;
      }

      const exact = scoreExercise(exercise, userAnswers);
      const aiAccepted = {
        ...(((row.ai_accepted as Record<string, boolean>) ?? {}) as Record<string, boolean>),
      };
      for (const item of attempted) {
        delete aiAccepted[item.itemKey];
      }

      const attemptedKeys = new Set(attempted.map((item) => item.itemKey));
      const verifyItems = collectVerifyItems(exercise, userAnswers, exact.perItem)
        .filter((item) => attemptedKeys.has(item.key))
        .map((item) => ({ ...item, key: `${row.id as string}::${item.key}` }));

      return {
        row,
        exercise,
        attempted,
        userAnswers,
        exact,
        aiAccepted,
        verifyItems,
      };
    });

    const acceptedByAi = await verifyAlternativeAnswers(
      prepared.flatMap((entry) => entry.verifyItems),
    );

    const results: Array<{ attemptId: string; itemKey: string; accepted: boolean }> = [];

    for (const entry of prepared) {
      for (const item of entry.attempted) {
        if (acceptedByAi[`${entry.row.id as string}::${item.itemKey}`]) {
          entry.aiAccepted[item.itemKey] = true;
        }
      }

      const perItem = applyAcceptedAnswers(entry.exact.perItem, entry.aiAccepted);
      const { score, maxScore } = totalsFromPerItem(perItem);
      const mistakeLog = updateMistakeLog({
        currentLog: entry.row.mistake_log,
        exercise: entry.exercise,
        userAnswers: entry.userAnswers,
        perItem,
      });
      const hidden = dismissedKeys(entry.row.dismissed_mistakes);
      for (const item of entry.attempted) {
        hidden.delete(item.itemKey);
        results.push({
          attemptId: entry.row.id as string,
          itemKey: item.itemKey,
          accepted: perItem[item.itemKey] === true,
        });
      }

      const { error: updateError } = await supabase
        .from("history")
        .update({
          user_answers: entry.userAnswers,
          ai_accepted: entry.aiAccepted,
          per_item: perItem,
          mistake_log: mistakeLog,
          dismissed_mistakes: Array.from(hidden),
          score,
          max_score: maxScore,
        })
        .eq("id", entry.row.id as string)
        .eq("user_id", user.id);

      if (updateError) {
        return { error: safeActionError(updateError, "Could not save mistake practice. Try again.") };
      }

      revalidatePath(`/dashboard/history/${entry.row.id as string}`);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/history");
    revalidatePath("/dashboard/mistakes");
    revalidatePath("/practice/mistakes");

    return {
      results,
      score: results.filter((item) => item.accepted).length,
      maxScore: results.length,
    };
  } catch (error) {
    return { error: safeActionError(error, "Mistake test failed. Try again.") };
  }
}

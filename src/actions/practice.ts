"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import { normalizeMistakeLog, updateMistakeLog, updateSimilarPracticeLog } from "@/lib/exercises/mistakeLog";
import { describeExerciseItem, PART_NAMES } from "@/lib/exercises/itemDetails";
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
import { chatJson, OpenRouterError } from "@/lib/gemini/client";
import type {
  SimilarDrillSetItem,
  SimilarDrillSetResult,
} from "@/actions/practice-types";

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

const contextualDrillSchema = z.object({
  sentence: z.string().min(20).max(280),
  options: z.array(z.string().min(1).max(40)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10).max(240),
});

export type ContextualDrill = z.infer<typeof contextualDrillSchema>;

function buildContextualDrillPrompt(word: string, exam: Exam, partType: string): string {
  const isCloze = partType === "part1" || partType === "part2";
  return [
    "You are a Cambridge English exam writer.",
    `Task: write ONE short sentence (15-30 words) at ${exam} level where the word "${word}" is the correct answer.`,
    `The sentence MUST contain the literal string "____" (four underscores) in the position where "${word}" goes.`,
    `Do NOT include the word "${word}" anywhere else in the sentence.`,
    "Provide exactly 4 answer options (single words or short phrases of the same word class as the target).",
    "Three options must be plausible distractors that are wrong in this specific context (wrong collocation, wrong register, wrong nuance, or false friend).",
    isCloze
      ? "The four options should look like Cambridge Part 1 distractors: same word class, similar surface meaning, but only one fits the collocation."
      : "Pick distractors that learners commonly confuse with the target.",
    "Also write a one-sentence explanation (under 240 chars) of WHY the target word is right and the distractors are wrong.",
    "Return strictly valid JSON with this shape:",
    `{"sentence":"...____...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}`,
    `The "correctIndex" must point to "${word}" in the options array (case-insensitive match).`,
    "Do NOT wrap in markdown fences.",
  ].join("\n");
}

export async function generateContextualDrillAction(input: {
  word: string;
  exam: Exam;
  partType: string;
}): Promise<{ drill: ContextualDrill } | { error: string }> {
  const validExam = examSchema.safeParse(input.exam);
  if (!validExam.success) return { error: "Invalid exam." };

  const word = String(input.word ?? "").trim();
  if (!word || word.length > 40) return { error: "Invalid word." };

  const partType = String(input.partType ?? "").trim();
  if (!partType || partType.length > 32) return { error: "Invalid part." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const quota = await consumeAiQuota();
    if (!quota.allowed) return { error: quotaErrorMessage(quota) };

    const prompt = buildContextualDrillPrompt(word, validExam.data, partType);
    const raw = await chatJson<unknown>({
      prompt,
      temperature: 0.8,
      maxTokens: 600,
      signal: AbortSignal.timeout(20000),
    });

    const parsed = contextualDrillSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: "The AI returned a malformed exercise. Try again." };
    }
    if (!parsed.data.sentence.includes("____")) {
      return { error: "The AI omitted the blank. Try again." };
    }

    const correctOption = parsed.data.options[parsed.data.correctIndex];
    if (!correctOption || correctOption.toLowerCase() !== word.toLowerCase()) {
      const matchIndex = parsed.data.options.findIndex(
        (opt) => opt.toLowerCase() === word.toLowerCase(),
      );
      if (matchIndex < 0) {
        return { error: "The AI did not include the target word. Try again." };
      }
      parsed.data.correctIndex = matchIndex;
    }

    return { drill: parsed.data };
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return { error: safeActionError(error, "AI service unavailable. Try again.") };
    }
    return { error: safeActionError(error, "Could not generate drill. Try again.") };
  }
}

const similarMistakeDrillSchema = z.object({
  kind: z.enum(["choice", "text"]),
  skillLabel: z.string().min(1),
  prompt: z.string().min(1),
  context: z.string().optional(),
  choices: z.array(z.string().min(1)).optional(),
  correctAnswer: z.string().min(1),
  acceptableAnswers: z.array(z.string().min(1)).optional(),
  explanation: z.string().min(1),
});

export type SimilarMistakeDrill = z.infer<typeof similarMistakeDrillSchema>;

function coerceSimilarDrillPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

  const kindRaw = typeof obj.kind === "string" ? obj.kind.toLowerCase() : "";
  if (kindRaw.includes("choice") || kindRaw.includes("multiple") || kindRaw === "mc" || kindRaw.includes("select")) {
    obj.kind = "choice";
  } else if (kindRaw.includes("text") || kindRaw.includes("open") || kindRaw.includes("free") || kindRaw.includes("write")) {
    obj.kind = "text";
  } else if (obj.kind !== "choice" && obj.kind !== "text") {
    obj.kind = Array.isArray(obj.choices) && (obj.choices as unknown[]).length >= 2 ? "choice" : "text";
  }

  if (!obj.choices && Array.isArray(obj.options)) {
    obj.choices = obj.options;
  }
  if (Array.isArray(obj.choices)) {
    obj.choices = (obj.choices as unknown[])
      .map((value) => (typeof value === "string" ? value : value == null ? "" : String(value)))
      .filter((value) => value.trim().length > 0);
  }

  if (!obj.context) {
    const fallbackContext = obj.text ?? obj.passage;
    if (typeof fallbackContext === "string") obj.context = fallbackContext;
  }

  if (typeof obj.prompt !== "string") {
    const altPrompt = obj.question ?? obj.stem ?? obj.task;
    if (typeof altPrompt === "string") obj.prompt = altPrompt;
    else if (obj.prompt != null) obj.prompt = String(obj.prompt);
  }

  if (typeof obj.correctAnswer !== "string") {
    const altAnswer = obj.answer ?? obj.correct ?? obj.correct_answer ?? obj.solution;
    if (typeof altAnswer === "string") obj.correctAnswer = altAnswer;
    else if (typeof altAnswer === "number" || typeof altAnswer === "boolean") obj.correctAnswer = String(altAnswer);
    else if (Array.isArray(altAnswer) && altAnswer.length > 0) obj.correctAnswer = String(altAnswer[0]);
  }

  if (typeof obj.skillLabel !== "string" || obj.skillLabel.trim().length === 0) {
    const alt = obj.skill ?? obj.label;
    obj.skillLabel = typeof alt === "string" && alt.trim() ? alt : "Similar practice";
  }

  if (typeof obj.explanation !== "string" || obj.explanation.trim().length === 0) {
    const alt = obj.why ?? obj.rationale ?? obj.reasoning;
    obj.explanation =
      typeof alt === "string" && alt.trim()
        ? alt
        : "Check the correct answer above and review the original mistake's pattern.";
  }

  return obj;
}

const WRITING_CRITERIA_LABELS: Record<string, string> = {
  writing_content: "Content",
  writing_communicative_achievement: "Communicative achievement",
  writing_organisation: "Organisation",
  writing_language: "Language",
};

function normalizeAnswer(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normaliseSimilarDrill(drill: SimilarMistakeDrill): SimilarMistakeDrill | { error: string } {
  if (drill.kind === "choice") {
    const choices = drill.choices ?? [];
    if (choices.length < 2) return { error: "The AI returned a malformed similar exercise. Try again." };
    const normalizedAnswer = normalizeAnswer(drill.correctAnswer);
    let answerIndex = choices.findIndex((choice) => normalizeAnswer(choice) === normalizedAnswer);
    if (answerIndex < 0) {
      const letterMatch = /^([a-h])(?:[\s\).:\-]|$)/i.exec(drill.correctAnswer.trim());
      if (letterMatch) {
        const idx = letterMatch[1].toLowerCase().charCodeAt(0) - "a".charCodeAt(0);
        if (idx >= 0 && idx < choices.length) answerIndex = idx;
      }
    }
    if (answerIndex < 0) {
      answerIndex = choices.findIndex((choice) => {
        const stripped = normalizeAnswer(choice.replace(/^[a-h][\s\).:\-]+/i, ""));
        return stripped === normalizedAnswer;
      });
    }
    if (answerIndex < 0) {
      answerIndex = choices.findIndex((choice) => {
        const a = normalizeAnswer(choice);
        return a.includes(normalizedAnswer) || normalizedAnswer.includes(a);
      });
    }
    if (answerIndex < 0) {
      return { error: "The AI did not include the correct answer in the options. Try again." };
    }
    return {
      ...drill,
      choices,
      correctAnswer: choices[answerIndex],
      acceptableAnswers: [choices[answerIndex]],
    };
  }

  const acceptableAnswers = Array.from(
    new Set([drill.correctAnswer, ...(drill.acceptableAnswers ?? [])].map((answer) => answer.trim()).filter(Boolean)),
  );
  return { ...drill, choices: undefined, acceptableAnswers };
}

function partInstruction(part: string) {
  switch (part) {
    case "part1":
      return "Make a one-item multiple-choice cloze. Use a new sentence or very short paragraph. Test the same word, collocation, phrasal verb, register, or nuance. Return kind=\"choice\" with exactly 4 options.";
    case "part2":
      return "Make a one-item open cloze. Use a new sentence or very short paragraph with one blank. Test the same grammar/function word pattern. Return kind=\"text\" and concise acceptableAnswers.";
    case "part3":
      return "Make a one-item word formation task. Use the same base word or word-family pattern in a new sentence. Return kind=\"text\".";
    case "part4":
      return "Make a one-item key word transformation. Use the same key word or transformation pattern in a new sentence pair. Return kind=\"text\".";
    case "part5":
      return "Make a short reading extract of 80-130 words and one multiple-choice question testing the same reading move: detail, inference, tone, implication, or vocabulary in context. Return kind=\"choice\" with exactly 4 options.";
    case "part6":
      return "Make a one-gap gapped-text mini task. Provide a short text with one missing paragraph and 4 paragraph options. Return kind=\"choice\".";
    case "part7":
      return "Make a mini multiple-matching task. Provide 3-4 short text snippets and one statement to match. Return kind=\"choice\".";
    case "writing_part1":
    case "writing_part2":
      return "Make a focused writing micro-practice task for the weak criterion. Prefer a multiple-choice revision, register, cohesion, or content-coverage decision. Do not ask for a full essay. Return kind=\"choice\".";
    default:
      return "Make one short Cambridge-style mini exercise testing the same skill in a new context.";
  }
}

function buildSimilarMistakePrompt(source: {
  exam: Exam;
  part: string;
  partName: string;
  title: string;
  prompt: string;
  context?: string;
  choices?: string[];
  userAnswer: string;
  correctAnswer: string;
  kind: "question" | "writing_feedback";
}) {
  return [
    "You are an expert Cambridge English exam writer.",
    "Generate ONE fresh mini practice exercise based on the learner's mistake.",
    "The exercise must test the same underlying skill, but it must NOT copy the original question, passage, sentence, or answer context.",
    `Level: ${source.exam}`,
    `Part: ${source.part} (${source.partName})`,
    `Original paper: ${source.title}`,
    `Original prompt: ${source.prompt}`,
    source.context ? `Original context:\n${source.context}` : null,
    source.choices?.length ? `Original choices:\n${source.choices.join("\n")}` : null,
    `Learner answer: ${source.userAnswer || "(blank)"}`,
    `Expected answer or target: ${source.correctAnswer || "(criterion improvement)"}`,
    `Generation rule: ${partInstruction(source.part)}`,
    "Keep it quick: one item only.",
    "For choice tasks, include 4 options and set correctAnswer to the exact correct option text.",
    "For text tasks, provide correctAnswer plus acceptableAnswers for exact accepted variants.",
    "Return strictly valid JSON with this shape:",
    `{"kind":"choice","skillLabel":"...","prompt":"...","context":"...","choices":["...","...","...","..."],"correctAnswer":"...","acceptableAnswers":["..."],"explanation":"..."}`,
    "Do not wrap in markdown fences.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

async function loadSimilarMistakeSource(input: { attemptId: string; itemKey: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { data, error } = await supabase
    .from("history")
    .select(
      "id, exam, part, title, topic, exercise, user_answers, dismissed_mistakes, mistake_log, writing_feedback, genre",
    )
    .eq("id", input.attemptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return { error: "Mistake not found." as const };
  if (dismissedKeys(data.dismissed_mistakes).has(input.itemKey)) {
    return { error: "That mistake was deleted." as const };
  }

  const row = data as Record<string, unknown> & {
    id: string;
    exam: Exam;
    part: string;
    title: string;
    mistake_log: unknown;
  };
  const itemKey = input.itemKey;
  const partName = PART_NAMES[row.part] ?? row.part;

  if (isWritingPart(row.part) && itemKey in WRITING_CRITERIA_LABELS) {
    const userAnswers = (row.user_answers ?? {}) as Record<string, unknown>;
    const essay = typeof userAnswers.essay === "string" ? userAnswers.essay : "";
    const feedback = (row.writing_feedback ?? {}) as Record<string, unknown>;
    const notesRecord =
      typeof feedback.notes === "object" && feedback.notes !== null
        ? (feedback.notes as Record<string, unknown>)
        : {};
    const noteKey = itemKey.replace("writing_", "");
    const notes = Array.isArray(notesRecord[noteKey])
      ? (notesRecord[noteKey] as unknown[]).map(String).join(" ")
      : "";

    return {
      supabase,
      userId: user.id,
      row,
      source: {
        exam: row.exam,
        part: row.part,
        partName,
        title: row.title,
        prompt: `${WRITING_CRITERIA_LABELS[itemKey]} feedback`,
        context: [notes ? `Marker notes: ${notes}` : null, essay ? `Learner response:\n${essay}` : null]
          .filter((item): item is string => Boolean(item))
          .join("\n\n"),
        userAnswer: "",
        correctAnswer: "A stronger Cambridge writing criterion response",
        kind: "writing_feedback" as const,
      },
    };
  }

  const exercise = exerciseSchema.parse(row.exercise);
  const details = describeExerciseItem(exercise, itemKey);
  if (!details) return { error: "Mistake not found." as const };

  const userAnswers = (row.user_answers ?? {}) as Record<string, string>;
  const logged = normalizeMistakeLog(row.mistake_log).find((entry) => entry.itemKey === itemKey);

  return {
    supabase,
    userId: user.id,
    row,
    source: {
      exam: row.exam,
      part: row.part,
      partName,
      title: row.title,
      prompt: details.prompt,
      context: details.context,
      choices: details.choices,
      userAnswer: logged?.lastAnswer ?? userAnswers[itemKey] ?? "",
      correctAnswer: logged?.correctAnswer ?? details.correctAnswer,
      kind: "question" as const,
    },
  };
}

const SIMILAR_DRILL_TEMPERATURES = [0.75, 0.55, 0.35];

type LoadedSimilarSource = Awaited<ReturnType<typeof loadSimilarMistakeSource>> extends infer T
  ? T extends { error: unknown }
    ? never
    : T
  : never;

function fallbackDrillFromSource(source: LoadedSimilarSource["source"]): SimilarMistakeDrill {
  const choices = source.choices ?? [];
  const kind: "choice" | "text" = choices.length >= 2 ? "choice" : "text";
  const correct = source.correctAnswer || (choices[0] ?? "");
  return {
    kind,
    skillLabel: source.partName || "Similar practice",
    prompt: source.prompt || "Practise this skill again.",
    context: source.context,
    choices: kind === "choice" ? choices : undefined,
    correctAnswer: correct,
    acceptableAnswers: [correct],
    explanation: "Fresh similar exercise unavailable — retrying the original is still useful practice.",
  };
}

async function generateOneSimilarDrill(
  loadedSource: LoadedSimilarSource,
): Promise<{ drill: SimilarMistakeDrill }> {
  const prompt = buildSimilarMistakePrompt(loadedSource.source);
  let lastIssue: unknown = null;
  for (let attempt = 0; attempt < SIMILAR_DRILL_TEMPERATURES.length; attempt++) {
    try {
      const raw = await chatJson<unknown>({
        prompt,
        temperature: SIMILAR_DRILL_TEMPERATURES[attempt],
        maxTokens: 900,
        signal: AbortSignal.timeout(22000),
      });
      const coerced = coerceSimilarDrillPayload(raw);
      const parsed = similarMistakeDrillSchema.safeParse(coerced);
      if (!parsed.success) {
        lastIssue = parsed.error.issues;
        console.error("[similarMistakeDrill] schema validation failed", {
          attempt,
          issues: parsed.error.issues,
          raw,
        });
        continue;
      }
      const normalized = normaliseSimilarDrill(parsed.data);
      if ("error" in normalized) {
        lastIssue = normalized.error;
        continue;
      }
      return { drill: normalized };
    } catch (innerError) {
      if (innerError instanceof OpenRouterError) {
        lastIssue = innerError.message;
        continue;
      }
      console.error("[similarMistakeDrill] unexpected error", innerError);
      lastIssue = innerError instanceof Error ? innerError.message : String(innerError);
    }
  }
  console.error("[similarMistakeDrill] falling back to original mistake", { lastIssue });
  return { drill: fallbackDrillFromSource(loadedSource.source) };
}

export async function generateSimilarMistakeDrillAction(input: {
  attemptId: string;
  itemKey: string;
}): Promise<{ drill: SimilarMistakeDrill } | { error: string }> {
  const attemptId = String(input.attemptId ?? "").trim();
  const itemKey = String(input.itemKey ?? "").trim();
  if (!attemptId || !itemKey) return { error: "Mistake not found." };

  try {
    const loaded = await loadSimilarMistakeSource({ attemptId, itemKey });
    if ("error" in loaded) return { error: loaded.error ?? "Mistake not found." };

    const quota = await consumeAiQuota();
    if (!quota.allowed) return { error: quotaErrorMessage(quota) };

    return await generateOneSimilarDrill(loaded);
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return { error: safeActionError(error, "AI service unavailable. Try again.") };
    }
    return { error: safeActionError(error, "Could not generate similar practice. Try again.") };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const current = cursor++;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function generateSimilarDrillSetAction(input: {
  items: Array<{ attemptId: string; itemKey: string }>;
}): Promise<{ drills: SimilarDrillSetItem[] } | { error: string }> {
  const refs = (input.items ?? [])
    .map((item) => ({
      attemptId: String(item?.attemptId ?? "").trim(),
      itemKey: String(item?.itemKey ?? "").trim(),
    }))
    .filter((item) => item.attemptId && item.itemKey);
  if (refs.length === 0) return { error: "No mistakes selected." };
  if (refs.length > 20) return { error: "Drill set too large. Select 20 or fewer mistakes." };

  try {
    const quota = await consumeAiQuota();
    if (!quota.allowed) return { error: quotaErrorMessage(quota) };

    const loaded = await Promise.all(refs.map((ref) => loadSimilarMistakeSource(ref)));
    for (const entry of loaded) {
      if ("error" in entry) {
        return { error: entry.error ?? "One of the mistakes could not be loaded." };
      }
    }
    const sources = loaded as LoadedSimilarSource[];
    const partRanges: Record<string, number> = {
      part1: 1,
      part2: 9,
      part3: 17,
      part4: 25,
      part5: 31,
      part6: 37,
      part7: 44,
      writing_part1: 54,
      writing_part2: 55,
    };
    const questionNumber = (part: string, itemKey: string) => {
      const numeric = Number(itemKey.match(/\d+/)?.[0] ?? "1");
      return (partRanges[part] ?? 1) + numeric - 1;
    };

    const generated = await runWithConcurrency(sources, 4, (src) => generateOneSimilarDrill(src));

    const drills: SimilarDrillSetItem[] = [];
    for (let i = 0; i < sources.length; i++) {
      const outcome = generated[i];
      const src = sources[i];
      drills.push({
        ref: refs[i],
        drill: outcome.drill,
        source: {
          exam: src.source.exam,
          part: src.source.part,
          partName: src.source.partName,
          title: src.source.title,
          prompt: src.source.prompt,
          context: src.source.context,
          choices: src.source.choices,
          userAnswer: src.source.userAnswer,
          correctAnswer: src.source.correctAnswer,
          questionNumber: questionNumber(src.source.part, refs[i].itemKey),
        },
      });
    }
    return { drills };
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return { error: safeActionError(error, "AI service unavailable. Try again.") };
    }
    return { error: safeActionError(error, "Could not generate similar practice. Try again.") };
  }
}

interface SubmitOneSimilarOutcome {
  accepted: boolean;
  correctAnswer: string;
  explanation: string;
  progress: { attempted: number; correct: number; lastPracticedAt: string };
}

async function submitOneSimilarDrill(input: {
  attemptId: string;
  itemKey: string;
  drill: SimilarMistakeDrill;
  answer: string;
}): Promise<SubmitOneSimilarOutcome | { error: string }> {
  const attemptId = String(input.attemptId ?? "").trim();
  const itemKey = String(input.itemKey ?? "").trim();
  const answer = String(input.answer ?? "").trim();
  const parsedDrill = similarMistakeDrillSchema.safeParse(input.drill);
  if (!attemptId || !itemKey || !parsedDrill.success) return { error: "Could not check this drill." };
  if (!answer) return { error: "Add an answer first." };

  const drill = parsedDrill.data;
  const acceptedAnswers = [drill.correctAnswer, ...(drill.acceptableAnswers ?? [])];
  const accepted = acceptedAnswers.some((candidate) => normalizeAnswer(candidate) === normalizeAnswer(answer));

  const loaded = await loadSimilarMistakeSource({ attemptId, itemKey });
  if ("error" in loaded) return { error: loaded.error ?? "Mistake not found." };

  const now = new Date().toISOString();
  const nextLog = updateSimilarPracticeLog({
    currentLog: loaded.row.mistake_log,
    itemKey,
    firstAnswer: loaded.source.userAnswer,
    correctAnswer: loaded.source.correctAnswer,
    accepted,
    now,
  });
  const progress = nextLog.find((entry) => entry.itemKey === itemKey)?.similarPractice;

  const { error: updateError } = await loaded.supabase
    .from("history")
    .update({ mistake_log: nextLog })
    .eq("id", attemptId)
    .eq("user_id", loaded.userId);

  if (updateError || !progress) {
    return { error: safeActionError(updateError, "Could not save similar practice. Try again.") };
  }

  return {
    accepted,
    correctAnswer: drill.correctAnswer,
    explanation: drill.explanation,
    progress: {
      attempted: progress.attempted,
      correct: progress.correct,
      lastPracticedAt: progress.lastPracticedAt ?? now,
    },
  };
}

export async function submitSimilarMistakeDrillAction(input: {
  attemptId: string;
  itemKey: string;
  drill: SimilarMistakeDrill;
  answer: string;
}): Promise<SubmitOneSimilarOutcome | { error: string }> {
  try {
    const result = await submitOneSimilarDrill(input);
    if (!("error" in result)) {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/mistakes");
      revalidatePath(`/dashboard/history/${input.attemptId}`);
      revalidatePath(`/dashboard/writing/${input.attemptId}`);
    }
    return result;
  } catch (error) {
    return { error: safeActionError(error, "Could not check similar practice. Try again.") };
  }
}

export async function submitSimilarDrillSetAction(input: {
  items: Array<{
    attemptId: string;
    itemKey: string;
    drill: SimilarMistakeDrill;
    answer: string;
  }>;
}): Promise<
  | { results: SimilarDrillSetResult[]; score: number; maxScore: number }
  | { error: string }
> {
  const items = input.items ?? [];
  if (items.length === 0) return { error: "Nothing to grade." };

  try {
    const results: SimilarDrillSetResult[] = [];
    const revalidateAttempts = new Set<string>();
    for (const item of items) {
      const outcome = await submitOneSimilarDrill(item);
      if ("error" in outcome) return { error: outcome.error };
      results.push({
        ref: { attemptId: item.attemptId, itemKey: item.itemKey },
        accepted: outcome.accepted,
        correctAnswer: outcome.correctAnswer,
        explanation: outcome.explanation,
        progress: outcome.progress,
      });
      revalidateAttempts.add(item.attemptId);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/mistakes");
    for (const attemptId of revalidateAttempts) {
      revalidatePath(`/dashboard/history/${attemptId}`);
      revalidatePath(`/dashboard/writing/${attemptId}`);
    }

    const score = results.filter((entry) => entry.accepted).length;
    return { results, score, maxScore: results.length };
  } catch (error) {
    return { error: safeActionError(error, "Could not grade the drill. Try again.") };
  }
}

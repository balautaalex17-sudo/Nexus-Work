"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  exerciseSchema,
  writingPart1Zod,
  writingPart2Zod,
  type Exam,
  type Exercise,
  type WritingExercise,
} from "@/lib/exercises/types";
import { scoreExercise } from "@/lib/exercises/validators";
import {
  describeExerciseItem,
  itemKeysForExercise,
  PART_NAMES,
  questionNumberForKey,
} from "@/lib/exercises/itemDetails";
import { normalizeMistakeLog, type SimilarPracticeStats } from "@/lib/exercises/mistakeLog";
import {
  writingFeedbackSchema,
  type WritingFeedback,
} from "@/lib/exercises/aiWritingFeedback";
import {
  WRITING_GENRE_LABEL,
  isWritingPart,
  type WritingGenre,
  writingExamSpec,
} from "@/lib/exercises/writing";
import { safeActionError } from "@/lib/errors";

export interface HistoryRow {
  id: string;
  exam: Exam;
  part: string;
  title: string;
  topic: string;
  score: number;
  max_score: number;
  created_at: string;
}

type HistoryDataRow = HistoryRow & {
  exercise: unknown;
  user_answers: unknown;
  per_item: unknown;
  ai_accepted: unknown;
  dismissed_mistakes?: unknown;
  mistake_log?: unknown;
  writing_feedback?: unknown;
  genre?: unknown;
};

export interface MistakeRow {
  attemptId: string;
  exam: Exam;
  part: string;
  partName: string;
  title: string;
  topic: string;
  created_at: string;
  itemKey: string;
  questionNumber: number;
  prompt: string;
  context?: string;
  choices?: string[];
  userAnswer: string;
  correctAnswer: string;
  resolved?: boolean;
  dismissed?: boolean;
  firstAnswer?: string;
  lastMissedAt?: string;
  timesMissed?: number;
  drillable?: boolean;
  kind?: "question" | "writing_feedback";
  similarPractice?: SimilarPracticeStats;
}

export interface DrillSetItem {
  attemptId: string;
  itemKey: string;
}

export interface CustomDrillSetSummary {
  id: string;
  name: string;
  items: DrillSetItem[];
  itemCount: number;
  created_at: string;
  updated_at: string;
}

export interface CustomDrillSetDetail extends CustomDrillSetSummary {
  drillItems: MistakeRow[];
  unavailableCount: number;
}

export interface DashboardPartStat {
  part: string;
  partName: string;
  attempts: number;
  score: number;
  maxScore: number;
  accuracy: number;
  mistakes: number;
}

export interface DashboardSummary {
  history: HistoryRow[];
  totalAttempts: number;
  totalScore: number;
  totalMax: number;
  accuracy: number;
  lastAccuracy: number;
  previousAccuracy: number;
  trend: number;
  unresolvedMistakes: number;
  partStats: DashboardPartStat[];
  weakestPart: DashboardPartStat | null;
  strongestPart: DashboardPartStat | null;
}

function dismissedKeys(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((item): item is string => typeof item === "string"));
}

function normalizeDrillSetItems(value: unknown): DrillSetItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: DrillSetItem[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const attemptId = String(record.attemptId ?? "").trim();
    const itemKey = String(record.itemKey ?? "").trim();
    if (!attemptId || !itemKey) continue;

    const key = `${attemptId}::${itemKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ attemptId, itemKey });
  }

  return out;
}

function cleanDrillSetItems(items: DrillSetItem[]) {
  return normalizeDrillSetItems(items);
}

function drillRefKey(item: DrillSetItem) {
  return `${item.attemptId}::${item.itemKey}`;
}

function accuracy(score: number, max: number) {
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

const WRITING_CRITERIA = [
  {
    itemKey: "writing_content",
    field: "content",
    label: "Content",
    description: "Task coverage and relevance",
  },
  {
    itemKey: "writing_communicative_achievement",
    field: "communicativeAchievement",
    label: "Communicative achievement",
    description: "Register, genre control, and reader impact",
  },
  {
    itemKey: "writing_organisation",
    field: "organisation",
    label: "Organisation",
    description: "Paragraphing, cohesion, and logical flow",
  },
  {
    itemKey: "writing_language",
    field: "language",
    label: "Language",
    description: "Grammar and vocabulary range and accuracy",
  },
] as const;

function isWritingExercise(exercise: Exercise) {
  return exercise.type === "writing_part1" || exercise.type === "writing_part2";
}

function writingGenreLabel(value: unknown) {
  if (typeof value !== "string") return null;
  return value in WRITING_GENRE_LABEL ? WRITING_GENRE_LABEL[value as WritingGenre] : null;
}

function displayPartName(exam: Exam, part: string) {
  return isWritingPart(part)
    ? writingExamSpec(exam, part).selectorName
    : (PART_NAMES[part] ?? part);
}

function writingMistakeRowsFromAttempt(row: HistoryDataRow): MistakeRow[] {
  if (!isWritingPart(row.part)) return [];

  const feedback = safeFeedback(row.writing_feedback);
  if (!feedback || !feedback.accepted) return [];

  const hidden = dismissedKeys(row.dismissed_mistakes);
  const logByKey = new Map(normalizeMistakeLog(row.mistake_log).map((entry) => [entry.itemKey, entry]));
  const userAnswers = (row.user_answers ?? {}) as Record<string, unknown>;
  const essayText = typeof userAnswers.essay === "string" ? userAnswers.essay : "";
  const genreLabel = writingGenreLabel(row.genre);

  return WRITING_CRITERIA.flatMap((criterion) => {
    if (hidden.has(criterion.itemKey)) return [];

    const band = feedback[criterion.field];
    if (band >= 5) return [];

    const notes = feedback.notes[criterion.field];
    const firstNote =
      notes[0] ?? `${criterion.description} needs attention before this reaches a full band.`;
    const noteBlock = notes.length > 0 ? notes.slice(0, 3).join(" ") : feedback.overall;
    const context = [
      genreLabel ? `Genre: ${genreLabel}` : null,
      `Task: ${row.title}`,
      noteBlock ? `Marker notes: ${noteBlock}` : null,
      essayText.trim() ? `Your response:\n${essayText}` : null,
    ]
      .filter((item): item is string => Boolean(item))
      .join("\n\n");

    return [
      {
        attemptId: row.id,
        exam: row.exam,
        part: row.part,
        partName: displayPartName(row.exam, row.part),
        title: row.title,
        topic: row.topic,
        created_at: row.created_at,
        itemKey: criterion.itemKey,
        questionNumber: questionNumberForKey(row.part, "essay"),
        prompt: `${criterion.label}: ${firstNote}`,
        context,
        userAnswer: `${band}/5`,
        correctAnswer: "Aim for 5/5",
        resolved: false,
        dismissed: false,
        firstAnswer: `${band}/5`,
        lastMissedAt: row.created_at,
        timesMissed: 1,
        drillable: false,
        kind: "writing_feedback",
        similarPractice: logByKey.get(criterion.itemKey)?.similarPractice,
      } satisfies MistakeRow,
    ];
  });
}

function rowForItem(
  row: HistoryDataRow,
  exercise: Exercise,
  key: string,
  overrides: Partial<MistakeRow> = {},
): MistakeRow | null {
  const info = describeExerciseItem(exercise, key);
  if (!info) return null;
  const userAnswers = (row.user_answers ?? {}) as Record<string, string>;

  return {
    attemptId: row.id,
    exam: row.exam,
    part: row.part,
    partName: displayPartName(row.exam, row.part),
    title: row.title,
    topic: row.topic,
    created_at: row.created_at,
    itemKey: key,
    questionNumber: questionNumberForKey(row.part, key),
    prompt: info.prompt,
    context: info.context,
    choices: info.choices,
    userAnswer: userAnswers[key] ?? "",
    correctAnswer: info.correctAnswer,
    drillable: true,
    kind: "question",
    ...overrides,
  };
}

function mistakeRowsFromAttempt(row: HistoryDataRow): MistakeRow[] {
  const exercise = (() => {
    try {
      return exerciseSchema.parse(row.exercise);
    } catch {
      return null;
    }
  })();
  if (!exercise) return [];
  if (isWritingExercise(exercise)) return writingMistakeRowsFromAttempt(row);

  const userAnswers = (row.user_answers ?? {}) as Record<string, string>;
  const aiAccepted = (row.ai_accepted ?? {}) as Record<string, boolean>;
  const perItem =
    (row.per_item as Record<string, boolean> | null) ??
    scoreExercise(exercise, userAnswers, aiAccepted).perItem;
  const hidden = dismissedKeys(row.dismissed_mistakes);
  const out: MistakeRow[] = [];
  for (const [key, ok] of Object.entries(perItem)) {
    if (ok || hidden.has(key)) continue;
    const item = rowForItem(row, exercise, key);
    if (item) out.push(item);
  }

  return out;
}

function loggedMistakeRowsFromAttempt(row: HistoryDataRow): MistakeRow[] {
  const exercise = (() => {
    try {
      return exerciseSchema.parse(row.exercise);
    } catch {
      return null;
    }
  })();
  if (!exercise) return [];
  if (isWritingExercise(exercise)) return writingMistakeRowsFromAttempt(row);

  const log = normalizeMistakeLog(row.mistake_log);
  if (log.length === 0) return mistakeRowsFromAttempt(row);
  const hidden = dismissedKeys(row.dismissed_mistakes);

  return log
    .map((entry) =>
      rowForItem(row, exercise, entry.itemKey, {
        userAnswer: entry.lastAnswer,
        correctAnswer: entry.correctAnswer,
        resolved: Boolean(entry.resolvedAt),
        dismissed: hidden.has(entry.itemKey),
        firstAnswer: entry.firstAnswer,
        lastMissedAt: entry.lastMissedAt,
        timesMissed: entry.timesMissed,
        similarPractice: entry.similarPractice,
      }),
    )
    .filter((item): item is MistakeRow => Boolean(item));
}

function problemSetRowsFromAttempt(row: HistoryDataRow): MistakeRow[] {
  const exercise = (() => {
    try {
      return exerciseSchema.parse(row.exercise);
    } catch {
      return null;
    }
  })();
  if (!exercise) return [];

  return itemKeysForExercise(exercise)
    .map((key) => rowForItem(row, exercise, key))
    .filter((item): item is MistakeRow => Boolean(item));
}

async function resolveMistakeRefsForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  refs: DrillSetItem[],
) {
  const wanted = cleanDrillSetItems(refs);
  if (wanted.length === 0) return [];

  const attemptIds = Array.from(new Set(wanted.map((item) => item.attemptId)));
  const { data } = await supabase
    .from("history")
    .select(
      "id, exam, part, title, topic, score, max_score, created_at, exercise, user_answers, per_item, ai_accepted, dismissed_mistakes, mistake_log, writing_feedback, genre",
    )
    .eq("user_id", userId)
    .in("id", attemptIds);

  const available = new Map<string, MistakeRow>();
  for (const row of (data ?? []) as HistoryDataRow[]) {
    for (const item of loggedMistakeRowsFromAttempt(row)) {
      if (!item.dismissed && item.drillable !== false) {
        available.set(drillRefKey(item), item);
      }
    }
  }

  return wanted
    .map((item) => available.get(drillRefKey(item)))
    .filter((item): item is MistakeRow => Boolean(item));
}

async function pruneCustomDrillSetRefs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  shouldRemove: (item: DrillSetItem) => boolean,
) {
  const { data, error } = await supabase
    .from("custom_drill_sets")
    .select("id, items")
    .eq("user_id", userId);

  if (error) return safeActionError(error, "Could not prune drill sets.");

  for (const set of data ?? []) {
    const current = normalizeDrillSetItems(set.items);
    const next = current.filter((item) => !shouldRemove(item));
    if (next.length === current.length) continue;

    if (next.length === 0) {
      const { error: deleteError } = await supabase
        .from("custom_drill_sets")
        .delete()
        .eq("id", set.id as string)
        .eq("user_id", userId);
      if (deleteError) return safeActionError(deleteError, "Could not prune drill sets.");
    } else {
      const { error: updateError } = await supabase
        .from("custom_drill_sets")
        .update({ items: next, updated_at: new Date().toISOString() })
        .eq("id", set.id as string)
        .eq("user_id", userId);
      if (updateError) return safeActionError(updateError, "Could not prune drill sets.");
    }
  }

  return null;
}

export async function getRecentHistory(limit?: number): Promise<HistoryRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("history")
    .select("id, exam, part, title, topic, score, max_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data } = await query;
  return (data ?? []) as HistoryRow[];
}

export async function getAllAttempts(): Promise<HistoryRow[]> {
  return getRecentHistory();
}

export async function getCompletedPapers(): Promise<HistoryRow[]> {
  return getRecentHistory();
}

export async function getAttemptById(id: string): Promise<{
  row: HistoryRow;
  exercise: Exercise;
  userAnswers: Record<string, string>;
  perItem: Record<string, boolean>;
  aiAccepted: Record<string, boolean>;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const exercise = exerciseSchema.parse(data.exercise);
  const userAnswers = (data.user_answers ?? {}) as Record<string, string>;
  const aiAccepted = (data.ai_accepted ?? {}) as Record<string, boolean>;
  const storedPerItem = data.per_item as Record<string, boolean> | null;
  const perItem = storedPerItem ?? scoreExercise(exercise, userAnswers, aiAccepted).perItem;

  return {
    row: data as HistoryRow,
    exercise,
    userAnswers,
    perItem,
    aiAccepted,
  };
}

export async function getAllMistakes(limit = 200): Promise<MistakeRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("history")
    .select(
      "id, exam, part, title, topic, score, max_score, created_at, exercise, user_answers, per_item, ai_accepted, dismissed_mistakes, writing_feedback, genre",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return (data as HistoryDataRow[]).flatMap(mistakeRowsFromAttempt);
}

export async function getMistakeLog(limit = 200): Promise<MistakeRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("history")
    .select(
      "id, exam, part, title, topic, score, max_score, created_at, exercise, user_answers, per_item, ai_accepted, dismissed_mistakes, mistake_log, writing_feedback, genre",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return (data as HistoryDataRow[]).flatMap(loggedMistakeRowsFromAttempt);
}

export async function getAttemptProblemSet(attemptId: string): Promise<{
  row: HistoryRow;
  items: MistakeRow[];
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    row: data as HistoryRow,
    items: problemSetRowsFromAttempt(data as HistoryDataRow),
  };
}

export async function getCustomDrillSets(): Promise<CustomDrillSetSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("custom_drill_sets")
    .select("id, name, items, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const items = normalizeDrillSetItems(row.items);
    return {
      id: String(row.id),
      name: String(row.name ?? "Untitled drill set"),
      items,
      itemCount: items.length,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  });
}

export async function getCustomDrillSet(setId: string): Promise<CustomDrillSetDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("custom_drill_sets")
    .select("id, name, items, created_at, updated_at")
    .eq("id", setId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const items = normalizeDrillSetItems(data.items);
  const drillItems = await resolveMistakeRefsForUser(supabase, user.id, items);

  return {
    id: data.id as string,
    name: data.name as string,
    items,
    itemCount: items.length,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    drillItems,
    unavailableCount: Math.max(0, items.length - drillItems.length),
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      history: [],
      totalAttempts: 0,
      totalScore: 0,
      totalMax: 0,
      accuracy: 0,
      lastAccuracy: 0,
      previousAccuracy: 0,
      trend: 0,
      unresolvedMistakes: 0,
      partStats: [],
      weakestPart: null,
      strongestPart: null,
    };
  }

  const { data } = await supabase
    .from("history")
    .select(
      "id, exam, part, title, topic, score, max_score, created_at, exercise, user_answers, per_item, ai_accepted, dismissed_mistakes, mistake_log, writing_feedback, genre",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = ((data ?? []) as HistoryDataRow[]).map((row) => ({
    ...row,
    score: Number(row.score ?? 0),
    max_score: Number(row.max_score ?? 0),
  }));

  const history = rows.slice(0, 10).map(
    (row): HistoryRow => ({
      id: row.id,
      exam: row.exam,
      part: row.part,
      title: row.title,
      topic: row.topic,
      score: row.score,
      max_score: row.max_score,
      created_at: row.created_at,
    }),
  );

  const totalScore = rows.reduce((sum, row) => sum + row.score, 0);
  const totalMax = rows.reduce((sum, row) => sum + row.max_score, 0);
  const lastFive = rows.slice(0, 5);
  const previousFive = rows.slice(5, 10);
  const lastAccuracy = accuracy(
    lastFive.reduce((sum, row) => sum + row.score, 0),
    lastFive.reduce((sum, row) => sum + row.max_score, 0),
  );
  const previousAccuracy = accuracy(
    previousFive.reduce((sum, row) => sum + row.score, 0),
    previousFive.reduce((sum, row) => sum + row.max_score, 0),
  );

  const partMap = new Map<string, DashboardPartStat>();
  let unresolvedMistakes = 0;

  for (const row of rows) {
    const existing =
      partMap.get(row.part) ??
      ({
        part: row.part,
        partName: displayPartName(row.exam, row.part),
        attempts: 0,
        score: 0,
        maxScore: 0,
        accuracy: 0,
        mistakes: 0,
      } satisfies DashboardPartStat);

    const mistakes = mistakeRowsFromAttempt(row).length;
    unresolvedMistakes += mistakes;
    existing.attempts += 1;
    existing.score += row.score;
    existing.maxScore += row.max_score;
    existing.mistakes += mistakes;
    existing.accuracy = accuracy(existing.score, existing.maxScore);
    partMap.set(row.part, existing);
  }

  const partStats = Array.from(partMap.values()).sort((a, b) => a.part.localeCompare(b.part));
  const attemptedParts = partStats.filter((part) => part.attempts > 0);
  const weakestPart =
    attemptedParts.length > 0
      ? [...attemptedParts].sort((a, b) => a.accuracy - b.accuracy || b.mistakes - a.mistakes)[0]
      : null;
  const strongestPart =
    attemptedParts.length > 0
      ? [...attemptedParts].sort((a, b) => b.accuracy - a.accuracy || a.mistakes - b.mistakes)[0]
      : null;

  return {
    history,
    totalAttempts: rows.length,
    totalScore,
    totalMax,
    accuracy: accuracy(totalScore, totalMax),
    lastAccuracy,
    previousAccuracy,
    trend: lastAccuracy - previousAccuracy,
    unresolvedMistakes,
    partStats,
    weakestPart,
    strongestPart,
  };
}

export async function dismissMistakeAction(input: {
  attemptId: string;
  itemKey: string;
}): Promise<{ ok: true } | { error: string }> {
  return deleteMistakeAction(input);
}

export async function deleteMistakeAction(input: {
  attemptId: string;
  itemKey: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("history")
    .select("dismissed_mistakes, mistake_log")
    .eq("id", input.attemptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return { error: "Mistake not found." };

  const next = Array.from(new Set([...dismissedKeys(data.dismissed_mistakes), input.itemKey]));
  const nextLog = normalizeMistakeLog(data.mistake_log).filter(
    (entry) => entry.itemKey !== input.itemKey,
  );
  const { error: updateError } = await supabase
    .from("history")
    .update({ dismissed_mistakes: next, mistake_log: nextLog })
    .eq("id", input.attemptId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: safeActionError(updateError, "Could not delete the mistake. Try again.") };
  }

  const pruneError = await pruneCustomDrillSetRefs(
    supabase,
    user.id,
    (item) => item.attemptId === input.attemptId && item.itemKey === input.itemKey,
  );
  if (pruneError) return { error: pruneError };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mistakes");
  revalidatePath("/dashboard/writing");
  revalidatePath("/practice/mistakes");
  revalidatePath(`/dashboard/history/${input.attemptId}`);
  revalidatePath(`/dashboard/writing/${input.attemptId}`);
  return { ok: true };
}

export async function saveCustomDrillSetAction(input: {
  name?: string;
  setId?: string;
  items: DrillSetItem[];
}): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const picked = cleanDrillSetItems(input.items);
  if (picked.length === 0) return { error: "Choose at least one mistake." };

  const verifiedRows = await resolveMistakeRefsForUser(supabase, user.id, picked);
  const verified = cleanDrillSetItems(
    verifiedRows.map((row) => ({ attemptId: row.attemptId, itemKey: row.itemKey })),
  );
  if (verified.length === 0) return { error: "Those mistakes are no longer available." };

  if (input.setId) {
    const { data: existing, error: loadError } = await supabase
      .from("custom_drill_sets")
      .select("id, items")
      .eq("id", input.setId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError || !existing) return { error: "Drill set not found." };

    const items = cleanDrillSetItems([...normalizeDrillSetItems(existing.items), ...verified]);
    const { error: updateError } = await supabase
      .from("custom_drill_sets")
      .update({ items, updated_at: new Date().toISOString() })
      .eq("id", input.setId)
      .eq("user_id", user.id);

    if (updateError) {
      return { error: safeActionError(updateError, "Could not update the drill set. Try again.") };
    }

    revalidatePath("/dashboard/mistakes");
    return { ok: true, id: input.setId };
  }

  const name = String(input.name ?? "").trim();
  if (!name) return { error: "Name the drill set first." };
  if (name.length > 80) return { error: "Keep the drill set name under 80 characters." };

  const { data, error } = await supabase
    .from("custom_drill_sets")
    .insert({
      user_id: user.id,
      name,
      items: verified,
    })
    .select("id")
    .single();

  if (error) return { error: safeActionError(error, "Could not save the drill set. Try again.") };

  revalidatePath("/dashboard/mistakes");
  return { ok: true, id: data.id as string };
}

export async function deleteCustomDrillSetAction(input: {
  setId: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("custom_drill_sets")
    .delete()
    .eq("id", input.setId)
    .eq("user_id", user.id);

  if (error) return { error: safeActionError(error, "Could not delete the drill set. Try again.") };

  revalidatePath("/dashboard/mistakes");
  return { ok: true };
}

export interface WritingAttemptRow {
  id: string;
  exam: Exam;
  part: "writing_part1" | "writing_part2";
  title: string;
  topic: string;
  genre: WritingGenre;
  created_at: string;
  score: number;
  max_score: number;
  accepted: boolean;
}

export interface WritingAttemptDetail {
  row: WritingAttemptRow;
  exercise: WritingExercise;
  essayText: string;
  feedback: WritingFeedback;
}

function safeFeedback(value: unknown): WritingFeedback | null {
  const parsed = writingFeedbackSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function rowToWritingAttempt(row: Record<string, unknown>): WritingAttemptRow | null {
  const part = String(row.part ?? "");
  if (part !== "writing_part1" && part !== "writing_part2") return null;
  const feedback = safeFeedback(row.writing_feedback);
  return {
    id: String(row.id),
    exam: row.exam as Exam,
    part,
    title: String(row.title ?? ""),
    topic: String(row.topic ?? ""),
    genre: (typeof row.genre === "string" ? row.genre : "essay") as WritingGenre,
    created_at: String(row.created_at),
    score: Number(row.score ?? 0),
    max_score: Number(row.max_score ?? 0),
    accepted: feedback?.accepted ?? false,
  };
}

export async function getWritingAttempts(limit = 50): Promise<WritingAttemptRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("history")
    .select(
      "id, exam, part, title, topic, score, max_score, created_at, genre, writing_feedback",
    )
    .eq("user_id", user.id)
    .in("part", ["writing_part1", "writing_part2"])
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map(rowToWritingAttempt)
    .filter((row): row is WritingAttemptRow => Boolean(row));
}

export async function getWritingAttemptById(id: string): Promise<WritingAttemptDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const part = String(data.part ?? "");
  if (part !== "writing_part1" && part !== "writing_part2") return null;

  const exerciseRaw = data.exercise;
  const parsed =
    part === "writing_part1"
      ? writingPart1Zod.safeParse(exerciseRaw)
      : writingPart2Zod.safeParse(exerciseRaw);
  if (!parsed.success) return null;

  const feedback =
    safeFeedback(data.writing_feedback) ??
    ({
      content: 0,
      communicativeAchievement: 0,
      organisation: 0,
      language: 0,
      overall: "Feedback was not stored. Submit the paper again to re-grade.",
      notes: { content: [], communicativeAchievement: [], organisation: [], language: [] },
      accepted: false,
    } satisfies WritingFeedback);

  const userAnswers = (data.user_answers ?? {}) as Record<string, unknown>;
  const essayText = typeof userAnswers.essay === "string" ? userAnswers.essay : "";

  const row = rowToWritingAttempt(data as Record<string, unknown>);
  if (!row) return null;

  return {
    row,
    exercise: parsed.data,
    essayText,
    feedback,
  };
}

export async function deleteAttemptAction(input: {
  attemptId: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pruneError = await pruneCustomDrillSetRefs(
    supabase,
    user.id,
    (item) => item.attemptId === input.attemptId,
  );
  if (pruneError) return { error: pruneError };

  const { error } = await supabase
    .from("history")
    .delete()
    .eq("id", input.attemptId)
    .eq("user_id", user.id);

  if (error) return { error: safeActionError(error, "Could not delete the attempt. Try again.") };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/mistakes");
  revalidatePath("/dashboard/writing");
  revalidatePath("/practice/mistakes");
  revalidatePath(`/dashboard/history/${input.attemptId}`);
  revalidatePath(`/dashboard/writing/${input.attemptId}`);
  return { ok: true };
}

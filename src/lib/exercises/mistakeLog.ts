import type { Exercise } from "@/lib/exercises/types";
import { describeExerciseItem, indexFromKey } from "@/lib/exercises/itemDetails";

export interface SimilarPracticeStats {
  attempted: number;
  correct: number;
  lastPracticedAt?: string;
}

export interface MistakeLogEntry {
  itemKey: string;
  firstAnswer: string;
  lastAnswer: string;
  correctAnswer: string;
  firstMissedAt: string;
  lastMissedAt: string;
  timesMissed: number;
  resolvedAt?: string;
  similarPractice?: SimilarPracticeStats;
}

function normalizeSimilarPractice(value: unknown): SimilarPracticeStats | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const attempted = Math.max(0, Number(record.attempted ?? 0));
  const correct = Math.max(0, Number(record.correct ?? 0));
  const lastPracticedAt =
    typeof record.lastPracticedAt === "string" ? record.lastPracticedAt : undefined;

  if (attempted === 0 && correct === 0 && !lastPracticedAt) return undefined;

  return {
    attempted,
    correct: Math.min(correct, attempted || correct),
    lastPracticedAt,
  };
}

export function normalizeMistakeLog(value: unknown): MistakeLogEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      itemKey: String(entry.itemKey ?? ""),
      firstAnswer: String(entry.firstAnswer ?? ""),
      lastAnswer: String(entry.lastAnswer ?? entry.firstAnswer ?? ""),
      correctAnswer: String(entry.correctAnswer ?? ""),
      firstMissedAt: String(entry.firstMissedAt ?? entry.lastMissedAt ?? new Date(0).toISOString()),
      lastMissedAt: String(entry.lastMissedAt ?? entry.firstMissedAt ?? new Date(0).toISOString()),
      timesMissed: Number(entry.timesMissed ?? 1),
      resolvedAt: typeof entry.resolvedAt === "string" ? entry.resolvedAt : undefined,
      similarPractice: normalizeSimilarPractice(entry.similarPractice),
    }))
    .filter((entry) => entry.itemKey);
}

export function updateMistakeLog(input: {
  currentLog: unknown;
  exercise: Exercise;
  userAnswers: Record<string, string> | Record<string, string[]>;
  perItem: Record<string, boolean>;
  now?: string;
}) {
  const now = input.now ?? new Date().toISOString();
  const entries = new Map(normalizeMistakeLog(input.currentLog).map((entry) => [entry.itemKey, entry]));

  for (const [itemKey, accepted] of Object.entries(input.perItem)) {
    const existing = entries.get(itemKey);
    if (accepted) {
      if (existing && !existing.resolvedAt) {
        entries.set(itemKey, { ...existing, resolvedAt: now });
      }
      continue;
    }

    const answerValue = input.userAnswers[itemKey];
    const answer = Array.isArray(answerValue) ? answerValue.join(", ") : String(answerValue ?? "");
    const details = describeExerciseItem(input.exercise, itemKey);
    const correctAnswer = details?.correctAnswer ?? existing?.correctAnswer ?? "";

    entries.set(itemKey, {
      itemKey,
      firstAnswer: existing?.firstAnswer ?? answer,
      lastAnswer: answer,
      correctAnswer,
      firstMissedAt: existing?.firstMissedAt ?? now,
      lastMissedAt: now,
      timesMissed: (existing?.timesMissed ?? 0) + 1,
      resolvedAt: undefined,
      similarPractice: existing?.similarPractice,
    });
  }

  return Array.from(entries.values()).sort(
    (a, b) => indexFromKey(a.itemKey) - indexFromKey(b.itemKey) || a.itemKey.localeCompare(b.itemKey),
  );
}

export function updateSimilarPracticeLog(input: {
  currentLog: unknown;
  itemKey: string;
  firstAnswer?: string;
  correctAnswer?: string;
  accepted: boolean;
  now?: string;
}) {
  const now = input.now ?? new Date().toISOString();
  const entries = new Map(normalizeMistakeLog(input.currentLog).map((entry) => [entry.itemKey, entry]));
  const existing = entries.get(input.itemKey);
  const currentStats = existing?.similarPractice ?? { attempted: 0, correct: 0 };

  entries.set(input.itemKey, {
    itemKey: input.itemKey,
    firstAnswer: existing?.firstAnswer ?? input.firstAnswer ?? "",
    lastAnswer: existing?.lastAnswer ?? input.firstAnswer ?? "",
    correctAnswer: existing?.correctAnswer ?? input.correctAnswer ?? "",
    firstMissedAt: existing?.firstMissedAt ?? now,
    lastMissedAt: existing?.lastMissedAt ?? now,
    timesMissed: existing?.timesMissed ?? 1,
    resolvedAt: existing?.resolvedAt,
    similarPractice: {
      attempted: currentStats.attempted + 1,
      correct: currentStats.correct + (input.accepted ? 1 : 0),
      lastPracticedAt: now,
    },
  });

  return Array.from(entries.values()).sort(
    (a, b) => indexFromKey(a.itemKey) - indexFromKey(b.itemKey) || a.itemKey.localeCompare(b.itemKey),
  );
}

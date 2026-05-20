import type { Exercise } from "@/lib/exercises/types";
import { describeExerciseItem, indexFromKey } from "@/lib/exercises/itemDetails";

export interface MistakeLogEntry {
  itemKey: string;
  firstAnswer: string;
  lastAnswer: string;
  correctAnswer: string;
  firstMissedAt: string;
  lastMissedAt: string;
  timesMissed: number;
  resolvedAt?: string;
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
    });
  }

  return Array.from(entries.values()).sort(
    (a, b) => indexFromKey(a.itemKey) - indexFromKey(b.itemKey) || a.itemKey.localeCompare(b.itemKey),
  );
}

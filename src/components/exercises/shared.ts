import type { Exercise } from "@/lib/exercises/types";

export interface ExerciseProps {
  exercise: Exercise;
  mode: "active" | "review";
  initialAnswers?: Record<string, string>;
  results?: Record<string, boolean>;
  onSubmit?: (answers: Record<string, string>) => void;
  submitting?: boolean;
  attemptId?: string;
  onRetry?: (key: string, value: string) => Promise<{ accepted: boolean } | null>;
}

const gapTokenPattern = /(\[gap\d+\]|\(gap\d+\)|\{gap\d+\}|<gap\d+>|\bgap\d+\b)/gi;

export function splitByGaps(text: string) {
  return text.split(gapTokenPattern);
}

export function keyFromToken(token: string) {
  const match = token.match(/gap\d+/i);
  return match ? match[0].toLowerCase() : null;
}

export function hasGapTokens(text: string) {
  return /(\[gap\d+\]|\(gap\d+\)|\{gap\d+\}|<gap\d+>|\bgap\d+\b)/i.test(text);
}

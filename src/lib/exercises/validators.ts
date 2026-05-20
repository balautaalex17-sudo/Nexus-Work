import type { Exercise } from "@/lib/exercises/types";

export interface ScoreResult {
  score: number;
  maxScore: number;
  perItem: Record<string, boolean>;
}

function norm(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function scoreExercise(
  exercise: Exercise,
  userAnswers: Record<string, string> | Record<string, string[]>,
  aiAccepted?: Record<string, boolean>,
): ScoreResult {
  const perItem: Record<string, boolean> = {};

  switch (exercise.type) {
    case "use_of_english_part1": {
      for (let i = 1; i <= 8; i += 1) {
        const key = `gap${i}`;
        perItem[key] =
          (userAnswers[key] as string) ===
          exercise.correctAnswers[key as keyof typeof exercise.correctAnswers];
      }
      break;
    }
    case "use_of_english_part2":
    case "use_of_english_part3": {
      for (let i = 1; i <= 8; i += 1) {
        const key = `gap${i}`;
        const got = String(userAnswers[key] ?? "");
        const expected = exercise.correctAnswers[key as keyof typeof exercise.correctAnswers];
        perItem[key] = norm(got) === norm(expected);
      }
      break;
    }
    case "use_of_english_part4": {
      exercise.items.forEach((item, index) => {
        const key = `item${index + 1}`;
        perItem[key] = norm(String(userAnswers[key] ?? "")) === norm(item.correctAnswer);
      });
      break;
    }
    case "reading_part5": {
      exercise.questions.forEach((question, index) => {
        const key = `q${index + 1}`;
        perItem[key] = (userAnswers[key] as string) === question.correctAnswer;
      });
      break;
    }
    case "reading_part6": {
      exercise.correctOrder.forEach((paragraphId, index) => {
        const key = `gap${index + 1}`;
        perItem[key] = (userAnswers[key] as string) === paragraphId;
      });
      break;
    }
    case "reading_part7": {
      exercise.prompts.forEach((prompt, index) => {
        const key = `prompt${index + 1}`;
        perItem[key] = (userAnswers[key] as string) === prompt.correctTextId;
      });
      break;
    }
    case "writing_part1":
    case "writing_part2": {
      // Writing is graded by aiWritingFeedback, not per-item booleans.
      // Return an empty per-item map so this path is a safe no-op.
      return { score: 0, maxScore: 0, perItem: {} };
    }
  }

  if (aiAccepted) {
    for (const key of Object.keys(perItem)) {
      if (!perItem[key] && aiAccepted[key]) {
        perItem[key] = true;
      }
    }
  }

  const maxScore = Object.keys(perItem).length;
  const score = Object.values(perItem).filter(Boolean).length;
  return { score, maxScore, perItem };
}

export function totalsFromPerItem(perItem: Record<string, boolean>) {
  const maxScore = Object.keys(perItem).length;
  const score = Object.values(perItem).filter(Boolean).length;
  return { score, maxScore };
}

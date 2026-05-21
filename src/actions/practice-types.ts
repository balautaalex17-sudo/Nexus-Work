import type { Exam } from "@/lib/exercises/types";
import type { SimilarMistakeDrill } from "@/actions/practice";

export interface SimilarDrillSetItem {
  ref: { attemptId: string; itemKey: string };
  drill: SimilarMistakeDrill;
  source: {
    exam: Exam;
    part: string;
    partName: string;
    title: string;
    prompt: string;
    context?: string;
    choices?: string[];
    userAnswer: string;
    correctAnswer: string;
    questionNumber: number;
  };
}

export interface SimilarDrillSetResult {
  ref: { attemptId: string; itemKey: string };
  accepted: boolean;
  correctAnswer: string;
  explanation: string;
  progress: { attempted: number; correct: number; lastPracticedAt: string };
}

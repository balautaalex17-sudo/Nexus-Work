import { ExerciseRenderer } from "@/components/ExerciseRenderer";
import { ScoreSummary } from "@/components/ScoreSummary";
import type { Exercise } from "@/lib/exercises/types";

interface ReviewRendererProps {
  attemptId: string;
  exercise: Exercise;
  initialAnswers: Record<string, string>;
  initialResults: Record<string, boolean>;
}

export function ReviewRenderer({
  attemptId,
  exercise,
  initialAnswers,
  initialResults,
}: ReviewRendererProps) {
  const totalCorrect = Object.values(initialResults).filter(Boolean).length;
  const total = Object.keys(initialResults).length;

  return (
    <div>
      <ScoreSummary score={totalCorrect} maxScore={total} />
      <ExerciseRenderer
        exercise={exercise}
        mode="review"
        initialAnswers={initialAnswers}
        results={initialResults}
        attemptId={attemptId}
      />
    </div>
  );
}

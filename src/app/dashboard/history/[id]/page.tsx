import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAttemptById } from "@/actions/history";
import { ReviewRenderer } from "@/components/ReviewRenderer";
import { Button } from "@/components/ui/Button";

interface HistoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function HistoryReviewPage({ params }: HistoryPageProps) {
  const { id } = await params;
  const attempt = await getAttemptById(id);
  if (!attempt) notFound();
  if (attempt.exercise.type === "writing_part1" || attempt.exercise.type === "writing_part2") {
    redirect(`/dashboard/writing/${id}`);
  }

  const partLabel = attempt.row.part.replace("part", "Part ");
  const practiceHref = `/practice/${attempt.row.exam}/${attempt.row.part}`;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 flex w-full max-w-7xl flex-wrap items-baseline justify-between gap-3 text-sm">
        <span className="text-[#78786C]">
          <span className="mr-2 inline-flex rounded-full bg-[#E6DCCD] px-2.5 py-0.5 text-xs font-bold text-[#4A4A40]">
            {attempt.row.exam}
          </span>
          <span className="font-bold text-[#2C2C24]">{partLabel}</span>
          <span className="mx-2 text-[#DED8CF]">-</span>
          {new Date(attempt.row.created_at).toLocaleString()}
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard/mistakes?mode=papers"
            className="font-bold text-[#5D7052] border-b-0 hover:border-b"
          >
            Back to completed papers
          </Link>
          <Link href={practiceHref}>
            <Button size="sm">Practice another {partLabel}</Button>
          </Link>
        </div>
      </div>
      <ReviewRenderer
        attemptId={attempt.row.id}
        exercise={attempt.exercise}
        initialAnswers={attempt.userAnswers}
        initialResults={attempt.perItem}
      />
    </div>
  );
}

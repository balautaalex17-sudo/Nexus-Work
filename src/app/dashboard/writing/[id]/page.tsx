import Link from "next/link";
import { notFound } from "next/navigation";
import { getWritingAttemptById } from "@/actions/history";
import { WritingBrief } from "@/components/exercises/WritingBrief";
import { WritingFeedbackPanel } from "@/components/exercises/WritingFeedbackPanel";
import { BlobField } from "@/components/ui/BlobField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { WRITING_MAX_BAND, writingTotalBand } from "@/lib/exercises/aiWritingFeedback";
import {
  WRITING_GENRE_LABEL,
  type WritingPartId,
  writingExamSpec,
  writingWordTarget,
} from "@/lib/exercises/writing";

interface WritingAttemptPageProps {
  params: Promise<{ id: string }>;
}

export default async function WritingAttemptPage({ params }: WritingAttemptPageProps) {
  const { id } = await params;
  const attempt = await getWritingAttemptById(id);
  if (!attempt) notFound();

  const { exercise, feedback, essayText, row } = attempt;
  const part = exercise.type as WritingPartId;
  const spec = writingExamSpec(exercise.exam, part);
  const total = writingTotalBand(feedback);
  const wordCount = essayText.trim().length > 0 ? essayText.trim().split(/\s+/).length : 0;

  return (
    <>
      <Section maxWidth="2xl" spacing="sm" className="overflow-hidden">
        <BlobField
          blobs={[
            { shape: 0, color: "#5D7052", size: 320, top: "-100px", right: "10%", opacity: 0.12 },
            { shape: 4, color: "#C18C5D", size: 240, bottom: "-80px", left: "-60px", opacity: 0.18 },
          ]}
        />
        <div className="flex flex-wrap items-baseline justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-2 text-[#78786C]">
            <span className="rounded-full bg-[#E6DCCD] px-3 py-1 text-xs font-bold text-[#4A4A40]">
              {exercise.exam}
            </span>
            <span className="rounded-full bg-[#5D7052]/10 px-3 py-1 text-xs font-bold text-[#5D7052]">
              {spec.selectorLabel}
            </span>
            <span className="rounded-full bg-[#C18C5D]/15 px-3 py-1 text-xs font-bold text-[#9A6730]">
              {WRITING_GENRE_LABEL[exercise.genre]}
            </span>
            <span className="ml-2">{new Date(row.created_at).toLocaleString()}</span>
          </div>
          <Link
            href="/dashboard/mistakes?mode=papers"
            className="border-b-0 font-bold text-[#5D7052] hover:border-b"
          >
            Back to completed papers
          </Link>
        </div>

        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-[#2C2C24] md:text-5xl">
          {exercise.title}
        </h1>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <p className="lede">
            Total band:{" "}
            <span className="font-bold text-[#2C2C24]">
              {total} / {WRITING_MAX_BAND}
            </span>{" "}
            - {wordCount} words written (target {writingWordTarget(exercise.exam, part)}).
          </p>
          <Link href="/practice">
            <Button variant="outline">Try a new paper</Button>
          </Link>
        </div>
      </Section>

      <Section maxWidth="2xl" spacing="sm">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card shapeIndex={1} className="space-y-6">
            <div>
              <p className="eyebrow mb-2">Task brief</p>
              <WritingBrief exercise={exercise} />
            </div>
          </Card>

          <Card shapeIndex={4} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">Your response</p>
              <span className="text-xs font-bold uppercase tracking-widest text-[#78786C]">
                {wordCount} words
              </span>
            </div>
            <article
              className="passage-text rounded-[1.5rem] border border-[#DED8CF]/60 bg-[#FDFCF8] p-5"
              style={{ fontSize: "1.02rem", lineHeight: 1.85, whiteSpace: "pre-wrap" }}
            >
              {essayText.trim().length > 0 ? essayText : "(No response was recorded.)"}
            </article>
          </Card>
        </div>
      </Section>

      <Section maxWidth="2xl" spacing="default">
        <p className="eyebrow mb-4">Marker feedback</p>
        <WritingFeedbackPanel feedback={feedback} />
      </Section>
    </>
  );
}

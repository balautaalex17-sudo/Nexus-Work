import Link from "next/link";
import { notFound } from "next/navigation";
import { generateExerciseAction } from "@/actions/practice";
import { PracticeSession } from "@/components/PracticeSession";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { examSchema, partSchema, type Exam, type PartId } from "@/lib/exercises/types";

interface PracticePartPageProps {
  params: Promise<{ exam: string; part: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PracticePartPage({ params, searchParams }: PracticePartPageProps) {
  const { exam, part } = await params;
  const search = (await searchParams) ?? {};
  if (!examSchema.safeParse(exam).success || !partSchema.safeParse(part).success) {
    notFound();
  }

  const genre = firstParam(search.genre);
  const generated = await generateExerciseAction(exam as Exam, part as PartId, genre);
  if ("error" in generated) {
    const retryHref = genre
      ? `/practice/${exam}/${part}?genre=${encodeURIComponent(genre)}`
      : `/practice/${exam}/${part}`;
    return (
      <Section maxWidth="lg" spacing="sm">
        <Card shapeIndex={3} className="text-center py-12">
          <p className="eyebrow mb-3 text-[#A85448]">Could not prepare paper</p>
          <h1 className="font-display text-3xl text-[#2C2C24] mb-3">Generation failed</h1>
          <p className="text-[#78786C] max-w-xl mx-auto mb-2">{generated.error}</p>
          <p className="text-sm text-[#78786C] mb-6">
            Try again in a moment, or pick a different part.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/practice">
              <Button variant="outline">Back to selector</Button>
            </Link>
            <Link href={retryHref}>
              <Button>Try again</Button>
            </Link>
          </div>
        </Card>
      </Section>
    );
  }

  return <PracticeSession exercise={generated.exercise} />;
}

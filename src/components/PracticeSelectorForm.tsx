"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import type { Exam } from "@/lib/exercises/types";
import {
  WRITING_GENRE_LABEL,
  isWritingPart,
  writingAllowedGenres,
  writingExamSpec,
  writingWordTarget,
  type WritingGenre,
  type WritingPartId,
} from "@/lib/exercises/writing";

interface PartOption {
  id: string;
  label: string;
  name: string;
  group: "Use of English" | "Reading" | "Writing";
}

const PART_OPTIONS: PartOption[] = [
  { id: "part1", label: "Part 1", name: "Multiple Choice Cloze", group: "Use of English" },
  { id: "part2", label: "Part 2", name: "Open Cloze", group: "Use of English" },
  { id: "part3", label: "Part 3", name: "Word Formation", group: "Use of English" },
  { id: "part4", label: "Part 4", name: "Key Word Transformation", group: "Use of English" },
  { id: "part5", label: "Part 5", name: "Reading Multiple Choice", group: "Reading" },
  { id: "part6", label: "Part 6", name: "Gapped Text", group: "Reading" },
  { id: "part7", label: "Part 7", name: "Multiple Matching", group: "Reading" },
  { id: "writing_part1", label: "Part 1", name: "Compulsory Writing Task", group: "Writing" },
  { id: "writing_part2", label: "Part 2", name: "Writing of your choice", group: "Writing" },
];

const GROUPS: Array<PartOption["group"]> = ["Use of English", "Reading", "Writing"];

const EXAMS = [
  {
    id: "KET",
    title: "KET",
    subtitle: "A2 Key",
    blurb: "Beginner-friendly practice with everyday vocabulary and short, clear texts.",
  },
  {
    id: "PET",
    title: "PET",
    subtitle: "B1 Preliminary",
    blurb: "Lower-intermediate practice with familiar school, work, travel, and hobby topics.",
  },
  {
    id: "FCE",
    title: "FCE",
    subtitle: "B2 First",
    blurb: "Upper-intermediate practice with B2 grammar, collocation, and reading pressure.",
  },
  {
    id: "CAE",
    title: "CAE",
    subtitle: "C1 Advanced",
    blurb: "Advanced practice with C1 distractors and richer academic prose.",
  },
  {
    id: "CPE",
    title: "CPE",
    subtitle: "C2 Proficiency",
    blurb: "Mastery-level practice with C2 vocabulary, complex syntax, and formal register.",
  },
] as const satisfies ReadonlyArray<{ id: Exam; title: string; subtitle: string; blurb: string }>;

export function PracticeSelectorForm() {
  const router = useRouter();
  const [exam, setExam] = useState<Exam>("FCE");
  const [part, setPart] = useState<string>("part1");
  const [genre, setGenre] = useState<WritingGenre | null>(null);

  const partOptions = useMemo(
    () =>
      PART_OPTIONS.map((option) => {
        if (!isWritingPart(option.id)) return option;
        const spec = writingExamSpec(exam, option.id);
        return { ...option, label: spec.selectorLabel, name: spec.selectorName };
      }),
    [exam],
  );
  const selectedPart = partOptions.find((option) => option.id === part);
  const writingPart = isWritingPart(part) ? (part as WritingPartId) : null;
  const writingGenres = useMemo(
    () => (writingPart ? writingAllowedGenres(exam, writingPart) : []),
    [exam, writingPart],
  );
  const fixedGenre = writingPart ? writingExamSpec(exam, writingPart).fixedGenre : undefined;
  const defaultGenre = fixedGenre ?? writingGenres[0] ?? null;
  const wordTarget = writingPart ? writingWordTarget(exam, writingPart) : null;

  // Keep genre valid when the user switches level or part.
  useEffect(() => {
    if (writingPart) {
      setGenre((current) =>
        current && writingGenres.includes(current) ? current : defaultGenre,
      );
    } else {
      setGenre(null);
    }
  }, [writingPart, writingGenres, defaultGenre]);

  const canBegin = Boolean(selectedPart) && (!writingPart || genre !== null);

  const begin = () => {
    if (!canBegin || !selectedPart) return;
    if (writingPart && genre) {
      router.push(`/practice/${exam}/${writingPart}?genre=${genre}`);
      return;
    }
    router.push(`/practice/${exam}/${part}`);
  };

  return (
    <Section maxWidth="2xl" spacing="default">
      <p className="eyebrow mb-3">Practice selector</p>
      <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#2C2C24] mb-3">
        Set up your paper.
      </h1>
      <p className="lede mb-12">
        Pick a level, then a part. Reading and Use of English papers are auto-marked; Writing
        papers get structured Cambridge-style feedback from the AI marker.
      </p>

      <div className="mb-12">
        <p className="eyebrow mb-4">Level</p>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {EXAMS.map((option, index) => {
            const selected = exam === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setExam(option.id)}
                className={`text-left transition-all duration-300 ease-organic ${
                  selected ? "scale-[1.01]" : "hover:-translate-y-1"
                }`}
              >
                <Card
                  shapeIndex={index + 1}
                  className={`relative h-full ${
                    selected
                      ? "border-[#5D7052] bg-[#5D7052]/5 shadow-lift"
                      : "border-[#DED8CF]/60"
                  }`}
                >
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div>
                      <p className="font-display text-3xl font-bold text-[#2C2C24]">
                        {option.title}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#C18C5D]">
                        {option.subtitle}
                      </p>
                      <p className="mt-3 text-sm text-[#78786C]">{option.blurb}</p>
                    </div>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        selected ? "border-[#5D7052] bg-[#5D7052]" : "border-[#DED8CF]"
                      }`}
                    >
                      {selected ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#F3F4F1"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-12">
        <p className="eyebrow mb-4">Part</p>
        {GROUPS.map((group) => (
          <div key={group} className="mb-8 last:mb-0">
            <p className="font-display text-xl text-[#4A4A40] mb-4">{group}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {partOptions.filter((option) => option.group === group).map((option) => {
                const selected = part === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPart(option.id)}
                    className={`flex items-center gap-4 rounded-full border px-5 py-4 text-left transition-all duration-300 ease-organic ${
                      selected
                        ? "border-[#5D7052] bg-[#5D7052]/5 shadow-soft scale-[1.01]"
                        : "border-[#DED8CF]/60 bg-white/60 hover:border-[#5D7052]/50 hover:-translate-y-0.5"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        selected ? "bg-[#5D7052] text-[#F3F4F1]" : "bg-[#E6DCCD] text-[#4A4A40]"
                      }`}
                    >
                      {option.label.replace("Part ", "")}
                    </span>
                    <span className="flex-1">
                      <span className="block text-xs uppercase tracking-widest font-bold text-[#C18C5D]">
                        {option.label}
                      </span>
                      <span className="block font-display text-lg text-[#2C2C24]">
                        {option.name}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {writingPart ? (
        <div className="mb-12">
          <p className="eyebrow mb-4">Genre</p>
          {writingGenres.length <= 1 ? (
            <Card shapeIndex={2} className="flex flex-wrap items-baseline gap-3">
              <span className="px-4 py-2 rounded-full bg-[#5D7052] text-[#F3F4F1] text-xs font-bold uppercase tracking-widest">
                {writingPart === "writing_part1" ? "Compulsory" : "Fixed task type"}
              </span>
              <span className="font-display text-2xl text-[#2C2C24]">
                {genre ? WRITING_GENRE_LABEL[genre] : "Writing"}
              </span>
              {wordTarget ? (
                <span className="ml-auto text-sm text-[#78786C]">{wordTarget}</span>
              ) : null}
            </Card>
          ) : (
            <>
              <p className="text-sm text-[#78786C] mb-4">
                Pick the genre you want to practise from the standard exam task types.
              </p>
              <div className="flex flex-wrap gap-3">
                {writingGenres.map((g) => {
                  const selected = genre === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenre(g)}
                      className={`rounded-full border px-5 py-3 text-sm font-bold transition-all duration-200 ease-organic ${
                        selected
                          ? "border-[#5D7052] bg-[#5D7052] text-[#F3F4F1] shadow-soft scale-[1.02]"
                          : "border-[#DED8CF]/70 bg-white/60 text-[#4A4A40] hover:border-[#5D7052]/50 hover:-translate-y-0.5"
                      }`}
                    >
                      {WRITING_GENRE_LABEL[g]}
                    </button>
                  );
                })}
              </div>
              {wordTarget ? (
                <p className="mt-4 text-xs text-[#78786C]">
                  Target word range: <span className="font-bold text-[#2C2C24]">{wordTarget}</span>
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-30">
        <Card
          shapeIndex={0}
          className="flex flex-wrap items-center justify-between gap-4 bg-white/85 backdrop-blur-md px-6 py-5"
        >
          <p className="text-sm text-[#78786C]">
            <span className="font-bold text-[#2C2C24]">{exam}</span> - {selectedPart?.label} -{" "}
            <span className="font-display italic">{selectedPart?.name}</span>
            {writingPart && genre ? (
              <>
                {" - "}
                <span className="font-bold text-[#5D7052]">{WRITING_GENRE_LABEL[genre]}</span>
              </>
            ) : null}
          </p>
          <Button onClick={begin} size="lg" disabled={!canBegin}>
            Begin paper
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </Card>
      </div>
    </Section>
  );
}

import Link from "next/link";
import {
  getCompletedPapers,
  getCustomDrillSet,
  getCustomDrillSets,
  getMistakeLog,
} from "@/actions/history";
import { AttemptDeleteButton } from "@/components/AttemptDeleteButton";
import { DrillSetDeleteButton } from "@/components/DrillSetDeleteButton";
import { MistakeLibrary } from "@/components/MistakeLibrary";
import { MistakePracticeSession } from "@/components/MistakePracticeSession";
import { BlobField } from "@/components/ui/BlobField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { PART_NAMES } from "@/lib/exercises/itemDetails";
import { EXAM_CODES, type Exam } from "@/lib/exercises/types";
import { isWritingPart, type WritingPartId, writingExamSpec } from "@/lib/exercises/writing";
import { cn } from "@/lib/utils";

interface MistakesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type Mode = "mistakes" | "drill" | "papers";

const modes: Array<{ id: Mode; label: string }> = [
  { id: "mistakes", label: "Mistakes" },
  { id: "drill", label: "Drill Sets" },
  { id: "papers", label: "Completed Papers" },
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function scorePercent(score: number, maxScore: number) {
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

function attemptHref(paper: { id: string; part: string }) {
  return isWritingPart(paper.part)
    ? `/dashboard/writing/${paper.id}`
    : `/dashboard/history/${paper.id}`;
}

function partLabel(exam: Exam, part: string) {
  if (isWritingPart(part)) return specForWriting(exam, part).selectorLabel;
  return part.replace("part", "Part ");
}

function partName(exam: Exam, part: string) {
  if (isWritingPart(part)) return specForWriting(exam, part).selectorName;
  return PART_NAMES[part] ?? part;
}

function specForWriting(exam: Exam, part: WritingPartId) {
  return writingExamSpec(exam, part);
}

function modeFromParam(value: string | string[] | undefined): Mode {
  const mode = firstParam(value);
  if (mode === "drill" || mode === "sets") return "drill";
  if (mode === "papers" || mode === "attempts") return "papers";
  return "mistakes";
}

function levelFromParam(value: string | string[] | undefined): Exam | null {
  const level = firstParam(value);
  return EXAM_CODES.includes(level as Exam) ? (level as Exam) : null;
}

function pageHref(mode: Mode, level: Exam | null, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (mode !== "mistakes") params.set("mode", mode);
  if (level) params.set("level", level);
  for (const [key, value] of Object.entries(extra ?? {})) {
    params.set(key, value);
  }
  const query = params.toString();
  return `/dashboard/mistakes${query ? `?${query}` : ""}`;
}

function HubTabs({ activeMode, level }: { activeMode: Mode; level: Exam | null }) {
  return (
    <div className="mt-8 flex flex-wrap gap-2 rounded-full border border-[#DED8CF]/70 bg-white/65 p-2 shadow-soft backdrop-blur">
      {modes.map((mode) => (
        <Link
          key={mode.id}
          href={pageHref(mode.id, level)}
          className={cn(
            "rounded-full border-b-0 px-5 py-2 text-sm font-bold transition",
            activeMode === mode.id
              ? "bg-[#5D7052] text-[#F3F4F1]"
              : "text-[#4A4A40] hover:bg-[#5D7052]/10 hover:text-[#5D7052]",
          )}
        >
          {mode.label}
        </Link>
      ))}
    </div>
  );
}

function LevelFilter({ activeMode, level }: { activeMode: Mode; level: Exam | null }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Link
        href={pageHref(activeMode, null)}
        className={cn(
          "rounded-full border border-[#DED8CF] px-4 py-2 text-sm font-bold transition",
          !level ? "bg-[#2C2C24] text-[#FDFCF8]" : "bg-white/70 text-[#4A4A40] hover:bg-[#E6DCCD]",
        )}
      >
        All levels
      </Link>
      {EXAM_CODES.map((exam) => (
        <Link
          key={exam}
          href={pageHref(activeMode, exam)}
          className={cn(
            "rounded-full border border-[#DED8CF] px-4 py-2 text-sm font-bold transition",
            level === exam
              ? "bg-[#2C2C24] text-[#FDFCF8]"
              : "bg-white/70 text-[#4A4A40] hover:bg-[#E6DCCD]",
          )}
        >
          {exam}
        </Link>
      ))}
    </div>
  );
}

export default async function MistakesPage({ searchParams }: MistakesPageProps) {
  const params = (await searchParams) ?? {};
  const mode = modeFromParam(params.mode);
  const level = levelFromParam(params.level);
  const setId = firstParam(params.setId);

  const [mistakeLog, completedPapers, drillSets] = await Promise.all([
    getMistakeLog(),
    getCompletedPapers(),
    getCustomDrillSets(),
  ]);

  const storedMistakes = mistakeLog.filter((mistake) => !mistake.dismissed);
  const visibleMistakes = level
    ? storedMistakes.filter((mistake) => mistake.exam === level)
    : storedMistakes;
  const visiblePapers = level
    ? completedPapers.filter((paper) => paper.exam === level)
    : completedPapers;
  const activeMistakes = visibleMistakes.filter((mistake) => !mistake.resolved);
  const resolvedMistakes = visibleMistakes.filter((mistake) => mistake.resolved);

  if (mode === "drill" && setId) {
    const drillSet = await getCustomDrillSet(setId);
    if (drillSet && drillSet.drillItems.length > 0) {
      return (
        <>
          <Section maxWidth="2xl" spacing="sm">
            <p className="eyebrow mb-3">Drill Sets</p>
            <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-[#2C2C24] md:text-5xl">
              {drillSet.name}
            </h1>
            <p className="lede">
              This drill is made from selected mistakes. It updates the original completed papers,
              but it does not create a new completed paper.
            </p>
            <HubTabs activeMode={mode} level={level} />
            <LevelFilter activeMode={mode} level={level} />
          </Section>
          {drillSet.unavailableCount > 0 ? (
            <Section maxWidth="2xl" spacing="sm">
              <Card shapeIndex={2} tone="sand" className="text-[#4A4A40]">
                {drillSet.unavailableCount} saved item
                {drillSet.unavailableCount === 1 ? " is" : "s are"} no longer available because
                the mistake or completed paper was deleted.
              </Card>
            </Section>
          ) : null}
          <MistakePracticeSession
            mistakes={drillSet.drillItems}
            drillTitle={drillSet.name}
            drillDescription={`${drillSet.drillItems.length} selected mistake${
              drillSet.drillItems.length === 1 ? "" : "s"
            }`}
            itemLabel="question"
          />
        </>
      );
    }
  }

  return (
    <>
      <Section maxWidth="2xl" spacing="sm" className="overflow-hidden">
        <BlobField
          blobs={[
            { shape: 2, color: "#C18C5D", size: 360, top: "-120px", left: "60%", opacity: 0.18 },
            { shape: 4, color: "#5D7052", size: 280, top: "10%", left: "-100px", opacity: 0.14 },
          ]}
        />
        <p className="eyebrow mb-3">
          {mode === "papers" ? "Completed papers" : mode === "drill" ? "Drill sets" : "Mistakes"}
        </p>
        <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-[#2C2C24] md:text-5xl">
          {mode === "papers"
            ? "Every full paper you submitted."
            : mode === "drill"
              ? "Your custom drills from selected mistakes."
              : "Mistakes grouped by level and part."}
        </h1>
        <p className="lede">
          Mistakes are individual stored questions. Completed Papers are full submitted exercises.
          Drill Sets are reusable practice sets you build from mistakes.
        </p>
        <HubTabs activeMode={mode} level={level} />
        <LevelFilter activeMode={mode} level={level} />
      </Section>

      {mode === "mistakes" ? (
        <>
          <Section maxWidth="2xl" spacing="sm">
            <div className="grid gap-4 md:grid-cols-3">
              <Card shapeIndex={0} tone="sand" className="px-6 py-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#4A4A40]">
                  Stored mistakes
                </p>
                <p className="font-display text-4xl font-bold text-[#A85448]">
                  {visibleMistakes.length}
                </p>
                <p className="mt-2 text-sm text-[#4A4A40]">
                  {level ? `${level} only.` : "All levels."}
                </p>
              </Card>
              <Card shapeIndex={2} className="px-6 py-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#78786C]">
                  Active
                </p>
                <p className="font-display text-4xl font-bold text-[#2C2C24]">
                  {activeMistakes.length}
                </p>
                <p className="mt-2 text-sm text-[#78786C]">Still worth drilling.</p>
              </Card>
              <Card shapeIndex={4} className="px-6 py-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#78786C]">
                  Resolved
                </p>
                <p className="font-display text-4xl font-bold text-[#5D7052]">
                  {resolvedMistakes.length}
                </p>
                <p className="mt-2 text-sm text-[#78786C]">Kept until you delete them.</p>
              </Card>
            </div>
          </Section>

          <Section maxWidth="2xl" spacing="sm">
            <MistakeLibrary mistakes={visibleMistakes} drillSets={drillSets} />
          </Section>
        </>
      ) : null}

      {mode === "drill" ? (
        <Section maxWidth="2xl" spacing="sm">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-[#DED8CF] pb-4">
            <div>
              <p className="eyebrow mb-2">Drill Sets</p>
              <h2 className="font-display text-3xl text-[#2C2C24]">Reusable mistake practice.</h2>
              <p className="mt-2 text-[#78786C]">
                Create new sets from the Mistakes tab by selecting individual mistakes.
              </p>
            </div>
            <Link href={pageHref("mistakes", level)}>
              <Button>Choose mistakes</Button>
            </Link>
          </div>

          {drillSets.length === 0 ? (
            <Card shapeIndex={1} className="py-16 text-center">
              <p className="eyebrow mb-3">No drill sets yet</p>
              <h2 className="mb-3 font-display text-4xl text-[#2C2C24]">
                Build one from Mistakes.
              </h2>
              <p className="mx-auto mb-6 max-w-md text-[#78786C]">
                Pick any individual mistakes, name the set, then drill it whenever you want.
              </p>
              <Link href={pageHref("mistakes", level)}>
                <Button>Create a drill set</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {drillSets.map((set, index) => (
                <Card key={set.id} shapeIndex={index} lift className="flex flex-col gap-4">
                  <div>
                    <p className="eyebrow mb-2">Custom set</p>
                    <h3 className="font-display text-2xl text-[#2C2C24]">{set.name}</h3>
                    <p className="mt-2 text-sm text-[#78786C]">
                      {set.itemCount} selected mistake{set.itemCount === 1 ? "" : "s"} - updated{" "}
                      {formatDate(set.updated_at)}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href={pageHref("drill", level, { setId: set.id })}>
                      <Button size="sm">Drill set</Button>
                    </Link>
                    <DrillSetDeleteButton setId={set.id} name={set.name} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {mode === "papers" ? (
        <Section maxWidth="2xl" spacing="sm">
          <Card shapeIndex={0} className="overflow-hidden p-0">
            {visiblePapers.length === 0 ? (
              <div className="p-10 text-center">
                <p className="mb-3 font-display text-2xl text-[#2C2C24]">
                  No completed papers here.
                </p>
                <p className="mx-auto mb-6 max-w-md text-[#78786C]">
                  Complete a paper and it will appear here for review.
                </p>
                <Link href="/practice">
                  <Button>Choose a paper</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th className="pl-8">Date</th>
                      <th>Level</th>
                      <th>Part</th>
                      <th>Title</th>
                      <th>Score</th>
                      <th>Actions</th>
                      <th className="pr-8 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePapers.map((paper) => (
                      <tr key={paper.id} className="transition-colors hover:bg-[#183F73]/5">
                        <td className="pl-8 whitespace-nowrap">{formatDate(paper.created_at)}</td>
                        <td>
                          <span className="inline-flex rounded-full bg-[#E6DCCD] px-2.5 py-0.5 text-xs font-bold text-[#4A4A40]">
                            {paper.exam}
                          </span>
                        </td>
                        <td>
                          <span className="font-semibold">
                            {partLabel(paper.exam, paper.part)}
                          </span>
                          <span className="block text-[#78786C]">
                            {partName(paper.exam, paper.part)}
                          </span>
                        </td>
                        <td className="min-w-60 text-[#78786C]">{paper.title}</td>
                        <td className="font-display font-bold">
                          {paper.score}
                          <span className="text-[#DED8CF]"> / {paper.max_score}</span>
                          <span className="block text-xs font-sans text-[#78786C]">
                            {scorePercent(paper.score, paper.max_score)}%
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <Link href={attemptHref(paper)}>
                              <Button variant="outline" size="sm">
                                {isWritingPart(paper.part) ? "Open feedback" : "Review paper"}
                              </Button>
                            </Link>
                            <Link href={pageHref("mistakes", paper.exam)}>
                              <Button variant="ghost" size="sm">
                                View mistakes
                              </Button>
                            </Link>
                          </div>
                        </td>
                        <td className="pr-8 text-right">
                          <AttemptDeleteButton attemptId={paper.id} title={paper.title} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Section>
      ) : null}
    </>
  );
}

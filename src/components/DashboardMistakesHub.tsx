"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CustomDrillSetSummary, HistoryRow, MistakeRow } from "@/actions/history";
import { AttemptDeleteButton } from "@/components/AttemptDeleteButton";
import { DrillSetDeleteButton } from "@/components/DrillSetDeleteButton";
import { MistakeLibrary } from "@/components/MistakeLibrary";
import { MistakePracticeSession } from "@/components/MistakePracticeSession";
import { SimilarMistakePracticeSession } from "@/components/SimilarMistakePracticeSession";
import { BlobField } from "@/components/ui/BlobField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { PART_NAMES } from "@/lib/exercises/itemDetails";
import { EXAM_CODES, type Exam } from "@/lib/exercises/types";
import { isWritingPart, type WritingPartId, writingExamSpec } from "@/lib/exercises/writing";
import { cn } from "@/lib/utils";

type Mode = "mistakes" | "drill" | "papers";
type PracticeMode = "similar" | "exact" | null;

interface DashboardMistakesHubProps {
  initialMode: Mode;
  initialLevel: Exam | null;
  initialSetId?: string;
  initialPart?: string;
  initialPracticeMode?: PracticeMode;
  mistakeLog: MistakeRow[];
  completedPapers: HistoryRow[];
  drillSets: CustomDrillSetSummary[];
}

const modes: Array<{ id: Mode; label: string }> = [
  { id: "mistakes", label: "Mistakes" },
  { id: "drill", label: "Drill Sets" },
  { id: "papers", label: "Completed Papers" },
];

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

function specForWriting(exam: Exam, part: WritingPartId) {
  return writingExamSpec(exam, part);
}

function partLabel(exam: Exam, part: string) {
  if (isWritingPart(part)) return specForWriting(exam, part).selectorLabel;
  return part.replace("part", "Part ");
}

function partName(exam: Exam, part: string) {
  if (isWritingPart(part)) return specForWriting(exam, part).selectorName;
  return PART_NAMES[part] ?? part;
}

function buildUrl(
  mode: Mode,
  level: Exam | null,
  setId?: string,
  practiceMode?: PracticeMode,
  part?: string,
) {
  const params = new URLSearchParams();
  if (mode !== "mistakes") params.set("mode", mode);
  if (level) params.set("level", level);
  if (setId) params.set("setId", setId);
  if (practiceMode) params.set("practice", practiceMode);
  if (part) params.set("part", part);
  const query = params.toString();
  return `/dashboard/mistakes${query ? `?${query}` : ""}`;
}

function refKey(item: { attemptId: string; itemKey: string }) {
  return `${item.attemptId}::${item.itemKey}`;
}

function HubTabs({
  activeMode,
  onChange,
}: {
  activeMode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-2 rounded-full border border-[#DED8CF]/70 bg-white/65 p-2 shadow-soft backdrop-blur">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={cn(
            "rounded-full px-5 py-2 text-sm font-bold transition",
            activeMode === mode.id
              ? "bg-[#5D7052] text-[#F3F4F1]"
              : "text-[#4A4A40] hover:bg-[#5D7052]/10 hover:text-[#5D7052]",
          )}
          onClick={() => onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function LevelFilter({
  activeLevel,
  onChange,
}: {
  activeLevel: Exam | null;
  onChange: (level: Exam | null) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <button
        type="button"
        className={cn(
          "rounded-full border border-[#DED8CF] px-4 py-2 text-sm font-bold transition",
          !activeLevel
            ? "bg-[#2C2C24] text-[#FDFCF8]"
            : "bg-white/70 text-[#4A4A40] hover:bg-[#E6DCCD]",
        )}
        onClick={() => onChange(null)}
      >
        All levels
      </button>
      {EXAM_CODES.map((exam) => (
        <button
          key={exam}
          type="button"
          className={cn(
            "rounded-full border border-[#DED8CF] px-4 py-2 text-sm font-bold transition",
            activeLevel === exam
              ? "bg-[#2C2C24] text-[#FDFCF8]"
              : "bg-white/70 text-[#4A4A40] hover:bg-[#E6DCCD]",
          )}
          onClick={() => onChange(exam)}
        >
          {exam}
        </button>
      ))}
    </div>
  );
}

export function DashboardMistakesHub({
  initialMode,
  initialLevel,
  initialSetId,
  initialPart,
  initialPracticeMode,
  mistakeLog,
  completedPapers,
  drillSets,
}: DashboardMistakesHubProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [level, setLevel] = useState<Exam | null>(initialLevel);
  const [setId, setSetId] = useState<string | undefined>(initialSetId);
  const [part, setPart] = useState<string | undefined>(initialPart);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(initialPracticeMode ?? null);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextMode = params.get("mode");
      const nextLevel = params.get("level");
      const nextPractice = params.get("practice");
      setMode(nextMode === "drill" || nextMode === "papers" ? nextMode : "mistakes");
      setLevel(EXAM_CODES.includes(nextLevel as Exam) ? (nextLevel as Exam) : null);
      setSetId(params.get("setId") ?? undefined);
      setPart(params.get("part") ?? undefined);
      setPracticeMode(nextPractice === "similar" || nextPractice === "exact" ? nextPractice : null);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (
    nextMode: Mode,
    nextLevel = level,
    nextSetId?: string,
    nextPracticeMode: PracticeMode = null,
    nextPart?: string,
  ) => {
    setMode(nextMode);
    setLevel(nextLevel);
    setSetId(nextSetId);
    setPracticeMode(nextPracticeMode);
    setPart(nextPart);
    window.history.pushState(
      null,
      "",
      buildUrl(nextMode, nextLevel, nextSetId, nextPracticeMode, nextPart),
    );
  };

  const storedMistakes = useMemo(
    () => mistakeLog.filter((mistake) => !mistake.dismissed),
    [mistakeLog],
  );

  const visibleMistakes = useMemo(
    () => (level ? storedMistakes.filter((mistake) => mistake.exam === level) : storedMistakes),
    [level, storedMistakes],
  );

  const visiblePapers = useMemo(
    () => (level ? completedPapers.filter((paper) => paper.exam === level) : completedPapers),
    [completedPapers, level],
  );

  const activeMistakes = useMemo(
    () => visibleMistakes.filter((mistake) => !mistake.resolved),
    [visibleMistakes],
  );

  const resolvedMistakes = useMemo(
    () => visibleMistakes.filter((mistake) => mistake.resolved),
    [visibleMistakes],
  );

  const selectedDrill = drillSets.find((set) => set.id === setId);
  const selectedDrillItems = useMemo(() => {
    if (!selectedDrill) return [];
    const byRef = new Map(storedMistakes.map((mistake) => [refKey(mistake), mistake]));
    return selectedDrill.items
      .map((item) => byRef.get(refKey(item)))
      .filter((mistake): mistake is MistakeRow => Boolean(mistake));
  }, [selectedDrill, storedMistakes]);
  const unavailableCount = selectedDrill
    ? Math.max(0, selectedDrill.items.length - selectedDrillItems.length)
    : 0;
  const groupDrillItems = useMemo(
    () =>
      part
        ? visibleMistakes.filter((mistake) => mistake.part === part)
        : visibleMistakes,
    [part, visibleMistakes],
  );

  if (mode === "drill" && selectedDrill && selectedDrillItems.length > 0) {
    if (practiceMode === "similar") {
      return (
        <SimilarMistakePracticeSession
          mistakes={selectedDrillItems}
          title={selectedDrill.name}
          description={`${selectedDrillItems.length} selected mistake${
            selectedDrillItems.length === 1 ? "" : "s"
          } - fresh exercises from the same weak spots`}
        />
      );
    }

    if (practiceMode === "exact") {
      return (
        <>
          <Section maxWidth="2xl" spacing="sm">
            <p className="eyebrow mb-3">Redo originals</p>
            <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-[#2C2C24] md:text-5xl">
              {selectedDrill.name}
            </h1>
            <p className="lede">
              This mode reuses the original missed questions from completed papers.
            </p>
            <HubTabs activeMode={mode} onChange={(nextMode) => navigate(nextMode, level)} />
            <LevelFilter activeLevel={level} onChange={(nextLevel) => navigate(mode, nextLevel, setId, practiceMode)} />
          </Section>
          {unavailableCount > 0 ? (
            <Section maxWidth="2xl" spacing="sm">
              <Card shapeIndex={2} tone="sand" className="text-[#4A4A40]">
                {unavailableCount} saved item{unavailableCount === 1 ? " is" : "s are"} no longer
                available because the mistake or completed paper was deleted.
              </Card>
            </Section>
          ) : null}
          <MistakePracticeSession
            mistakes={selectedDrillItems}
            drillTitle={selectedDrill.name}
            drillDescription={`${selectedDrillItems.length} selected mistake${
              selectedDrillItems.length === 1 ? "" : "s"
            }`}
            itemLabel="question"
          />
        </>
      );
    }

    return (
      <>
        <Section maxWidth="2xl" spacing="sm">
          <p className="eyebrow mb-3">Drill Sets</p>
          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-[#2C2C24] md:text-5xl">
            {selectedDrill.name}
          </h1>
          <p className="lede">
            Choose whether to practise the same weak spots in fresh contexts or redo the original
            missed questions.
          </p>
          <HubTabs activeMode={mode} onChange={(nextMode) => navigate(nextMode, level)} />
          <LevelFilter activeLevel={level} onChange={(nextLevel) => navigate(mode, nextLevel, setId)} />
        </Section>
        {unavailableCount > 0 ? (
          <Section maxWidth="2xl" spacing="sm">
            <Card shapeIndex={2} tone="sand" className="text-[#4A4A40]">
              {unavailableCount} saved item{unavailableCount === 1 ? " is" : "s are"} no longer
              available because the mistake or completed paper was deleted.
            </Card>
          </Section>
        ) : null}
        <Section maxWidth="xl" spacing="sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Card shapeIndex={1} tone="sand" className="space-y-4">
              <p className="eyebrow">Recommended</p>
              <h2 className="font-display text-3xl text-[#2C2C24]">Practice similar</h2>
              <p className="text-sm text-[#4A4A40]">
                Fresh mini exercises based on the same mistake pattern, word, structure, or reading move.
              </p>
              <Button type="button" onClick={() => navigate("drill", level, setId, "similar")}>
                Practice similar
              </Button>
            </Card>
            <Card shapeIndex={3} className="space-y-4">
              <p className="eyebrow">Review mode</p>
              <h2 className="font-display text-3xl text-[#2C2C24]">Redo originals</h2>
              <p className="text-sm text-[#78786C]">
                Re-answer the exact questions you missed in completed papers.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("drill", level, setId, "exact")}
              >
                Redo originals
              </Button>
            </Card>
          </div>
        </Section>
      </>
    );
  }

  if (mode === "drill" && practiceMode === "similar" && groupDrillItems.length > 0) {
    const groupTitle =
      level && part
        ? `${level} ${partName(level, part)}`
        : level
          ? `${level} mistakes`
          : "Selected mistakes";
    return (
      <SimilarMistakePracticeSession
        mistakes={groupDrillItems}
        title={groupTitle}
        description={`${groupDrillItems.length} mistake${
          groupDrillItems.length === 1 ? "" : "s"
        } from this group`}
      />
    );
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
        <HubTabs activeMode={mode} onChange={(nextMode) => navigate(nextMode, level)} />
        <LevelFilter activeLevel={level} onChange={(nextLevel) => navigate(mode, nextLevel)} />
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => navigate("drill", level, undefined, "similar")}
                disabled={visibleMistakes.length === 0}
              >
                Practice more
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("mistakes", level)}>
                Choose mistakes
              </Button>
            </div>
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
              <Button type="button" onClick={() => navigate("mistakes", level)}>
                Create a drill set
              </Button>
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
                    <Button type="button" size="sm" onClick={() => navigate("drill", level, set.id, "similar")}>
                      Practice similar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("drill", level, set.id, "exact")}
                    >
                      Redo originals
                    </Button>
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
                      <th className="pr-8">Actions</th>
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
                          <span className="font-semibold">{partLabel(paper.exam, paper.part)}</span>
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
                        <td className="pr-8">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={attemptHref(paper)}>
                              <Button variant="outline" size="sm">
                                {isWritingPart(paper.part) ? "Open feedback" : "Review paper"}
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate("mistakes", paper.exam)}
                            >
                              View mistakes
                            </Button>
                            <AttemptDeleteButton attemptId={paper.id} title={paper.title} />
                          </div>
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

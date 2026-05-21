import { getCompletedPapers, getCustomDrillSets, getMistakeLog } from "@/actions/history";
import { DashboardMistakesHub } from "@/components/DashboardMistakesHub";
import { EXAM_CODES, type Exam } from "@/lib/exercises/types";

interface MistakesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type Mode = "mistakes" | "drill" | "papers";
type PracticeMode = "similar" | "exact" | null;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

function practiceModeFromParam(value: string | string[] | undefined): PracticeMode {
  const mode = firstParam(value);
  return mode === "similar" || mode === "exact" ? mode : null;
}

export default async function MistakesPage({ searchParams }: MistakesPageProps) {
  const params = (await searchParams) ?? {};

  const [mistakeLog, completedPapers, drillSets] = await Promise.all([
    getMistakeLog(),
    getCompletedPapers(),
    getCustomDrillSets(),
  ]);

  return (
    <DashboardMistakesHub
      initialMode={modeFromParam(params.mode)}
      initialLevel={levelFromParam(params.level)}
      initialSetId={firstParam(params.setId)}
      initialPart={firstParam(params.part)}
      initialPracticeMode={practiceModeFromParam(params.practice)}
      mistakeLog={mistakeLog}
      completedPapers={completedPapers}
      drillSets={drillSets}
    />
  );
}

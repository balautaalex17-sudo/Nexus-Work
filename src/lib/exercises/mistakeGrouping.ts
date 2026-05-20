import { examSchema, partSchema, type Exam } from "@/lib/exercises/types";

export type MistakeSkillId = "use-of-english" | "reading";

export interface MistakeLike {
  exam: Exam;
  part: string;
  partName: string;
  topic: string;
  created_at: string;
  questionNumber: number;
}

export interface MistakeCluster<T extends MistakeLike> {
  key: string;
  exam: Exam;
  part: string;
  partName: string;
  skill: MistakeSkillId;
  skillLabel: string;
  rows: T[];
  latestDate: string;
  topics: string[];
  questionNumbers: number[];
}

const partOrder: Record<string, number> = {
  part1: 1,
  part2: 2,
  part3: 3,
  part4: 4,
  part5: 5,
  part6: 6,
  part7: 7,
};

const examOrder: Record<string, number> = {
  KET: 1,
  PET: 2,
  FCE: 3,
  CAE: 4,
  CPE: 5,
};

export const skillLabels: Record<MistakeSkillId, string> = {
  "use-of-english": "Use of English",
  reading: "Reading",
};

export const skillDescriptions: Record<MistakeSkillId, string> = {
  "use-of-english": "Grammar, vocabulary, word formation, and sentence transformation.",
  reading: "Text meaning, paragraph logic, inference, and matching.",
};

export function skillForPart(part: string): MistakeSkillId {
  return ["part1", "part2", "part3", "part4"].includes(part) ? "use-of-english" : "reading";
}

export function partLabel(part: string) {
  return part.replace("part", "Part ");
}

export function clusterHref(cluster: Pick<MistakeCluster<MistakeLike>, "exam" | "part">) {
  return `/dashboard/mistakes?level=${cluster.exam}#${cluster.part}`;
}

export function groupMistakesByExamPart<T extends MistakeLike>(mistakes: T[]) {
  const groups = new Map<string, MistakeCluster<T>>();

  for (const mistake of mistakes) {
    const key = `${mistake.exam}-${mistake.part}`;
    const skill = skillForPart(mistake.part);
    const existing =
      groups.get(key) ??
      ({
        key,
        exam: mistake.exam,
        part: mistake.part,
        partName: mistake.partName,
        skill,
        skillLabel: skillLabels[skill],
        rows: [],
        latestDate: mistake.created_at,
        topics: [],
        questionNumbers: [],
      } satisfies MistakeCluster<T>);

    existing.rows.push(mistake);
    if (new Date(mistake.created_at) > new Date(existing.latestDate)) {
      existing.latestDate = mistake.created_at;
    }
    existing.topics = Array.from(new Set([...existing.topics, mistake.topic].filter(Boolean)));
    existing.questionNumbers = Array.from(
      new Set([...existing.questionNumbers, mistake.questionNumber]),
    ).sort((a, b) => a - b);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).sort(
    (a, b) =>
      b.rows.length - a.rows.length ||
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime() ||
      (examOrder[b.exam] ?? 99) - (examOrder[a.exam] ?? 99) ||
      (partOrder[a.part] ?? 99) - (partOrder[b.part] ?? 99),
  );
}

export function groupMistakesBySkill<T extends MistakeLike>(mistakes: T[]) {
  return (Object.keys(skillLabels) as MistakeSkillId[]).map((skill) => {
    const rows = mistakes.filter((mistake) => skillForPart(mistake.part) === skill);
    return {
      skill,
      label: skillLabels[skill],
      description: skillDescriptions[skill],
      rows,
      clusters: groupMistakesByExamPart(rows),
    };
  });
}

export function parseDrillFilter(filter: { exam?: string; part?: string }) {
  const exam = examSchema.safeParse(filter.exam).success ? (filter.exam as Exam) : undefined;
  const part = partSchema.safeParse(filter.part).success ? filter.part : undefined;
  if (!exam || !part) return null;
  return { exam, part };
}

export function filterMistakes<T extends MistakeLike>(
  mistakes: T[],
  filter: { exam: Exam; part: string },
) {
  return mistakes.filter((mistake) => mistake.exam === filter.exam && mistake.part === filter.part);
}

export function drillTitle(filter: { exam: Exam; part: string; partName?: string }) {
  return `${filter.exam} ${partLabel(filter.part)}${filter.partName ? ` - ${filter.partName}` : ""}`;
}

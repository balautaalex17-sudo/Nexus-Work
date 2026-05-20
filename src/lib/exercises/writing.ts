import { z } from "zod";
import type { Exam, PartId } from "@/lib/exercises/types";

export const WRITING_GENRES = [
  "note",
  "story",
  "email",
  "letter",
  "article",
  "essay",
  "discursive_essay",
  "proposal",
  "report",
  "review",
] as const;
export const writingGenreSchema = z.enum(WRITING_GENRES);
export type WritingGenre = z.infer<typeof writingGenreSchema>;

export type WritingPartId = Extract<PartId, "writing_part1" | "writing_part2">;
export const WRITING_PART_IDS = ["writing_part1", "writing_part2"] as const;

export function isWritingPart(part: string): part is WritingPartId {
  return part === "writing_part1" || part === "writing_part2";
}

export function isWritingExerciseType(
  type: string,
): type is "writing_part1" | "writing_part2" {
  return isWritingPart(type);
}

// Fixed genre per level for the compulsory Part 1.
export const WRITING_PART1_GENRE_BY_LEVEL: Record<Exam, WritingGenre> = {
  KET: "note",
  PET: "email",
  FCE: "essay",
  CAE: "essay",
  CPE: "discursive_essay",
};

// User-pickable genres per level for Part 2.
export const WRITING_PART2_GENRES_BY_LEVEL: Record<Exam, WritingGenre[]> = {
  KET: ["story"],
  PET: ["article", "story"],
  FCE: ["email", "letter", "article", "report", "review"],
  CAE: ["email", "letter", "proposal", "report", "review"],
  CPE: ["article", "letter", "report", "review"],
};

// Min / max word count per (level, part).
export const WRITING_WORD_RANGE: Record<Exam, Record<WritingPartId, [number, number]>> = {
  KET: { writing_part1: [25, 999], writing_part2: [35, 999] },
  PET: { writing_part1: [90, 110], writing_part2: [90, 110] },
  FCE: { writing_part1: [140, 190], writing_part2: [140, 190] },
  CAE: { writing_part1: [220, 260], writing_part2: [220, 260] },
  CPE: { writing_part1: [240, 280], writing_part2: [280, 320] },
};

export const WRITING_GENRE_LABEL: Record<WritingGenre, string> = {
  note: "Email / note",
  story: "Short story",
  email: "Email",
  letter: "Letter",
  article: "Article",
  essay: "Essay",
  discursive_essay: "Discursive summary essay",
  proposal: "Proposal",
  report: "Report",
  review: "Review",
};

export interface WritingPartSpec {
  selectorLabel: string;
  selectorName: string;
  examHeading: string;
  taskTypes: string;
  wordTarget: string;
  minimumWords: number;
  allowedGenres: WritingGenre[];
  fixedGenre?: WritingGenre;
  promptInstruction: string;
}

export const WRITING_EXAM_SPECS: Record<Exam, Record<WritingPartId, WritingPartSpec>> = {
  KET: {
    writing_part1: {
      selectorLabel: "Part 6",
      selectorName: "Guided writing",
      examHeading: "READING AND WRITING - PART 6",
      taskTypes: "short email or note",
      wordTarget: "25+ words",
      minimumWords: 25,
      allowedGenres: ["note"],
      fixedGenre: "note",
      promptInstruction:
        "Write a short email or note. Use all the information in the task and write at least 25 words.",
    },
    writing_part2: {
      selectorLabel: "Part 7",
      selectorName: "Picture story",
      examHeading: "READING AND WRITING - PART 7",
      taskTypes: "short story from three picture prompts",
      wordTarget: "35+ words",
      minimumWords: 35,
      allowedGenres: ["story"],
      fixedGenre: "story",
      promptInstruction:
        "Write a short story based on three picture prompts. Use all three pictures and write at least 35 words.",
    },
  },
  PET: {
    writing_part1: {
      selectorLabel: "Part 1",
      selectorName: "Email",
      examHeading: "WRITING - PART 1",
      taskTypes: "email",
      wordTarget: "about 100 words",
      minimumWords: 80,
      allowedGenres: ["email"],
      fixedGenre: "email",
      promptInstruction:
        "Write an email of about 100 words, answering the email and all notes provided.",
    },
    writing_part2: {
      selectorLabel: "Part 2",
      selectorName: "Article or story",
      examHeading: "WRITING - PART 2",
      taskTypes: "article or story",
      wordTarget: "about 100 words",
      minimumWords: 80,
      allowedGenres: ["article", "story"],
      promptInstruction:
        "Choose one task type and write about 100 words, answering the question fully.",
    },
  },
  FCE: {
    writing_part1: {
      selectorLabel: "Part 1",
      selectorName: "Essay",
      examHeading: "WRITING - PART 1",
      taskTypes: "essay",
      wordTarget: "140-190 words",
      minimumWords: 140,
      allowedGenres: ["essay"],
      fixedGenre: "essay",
      promptInstruction:
        "Write an essay giving your opinion, using the two given ideas and adding one idea of your own.",
    },
    writing_part2: {
      selectorLabel: "Part 2",
      selectorName: "Article, email, letter, report or review",
      examHeading: "WRITING - PART 2",
      taskTypes: "article, email, letter, report or review",
      wordTarget: "140-190 words",
      minimumWords: 140,
      allowedGenres: ["email", "letter", "article", "report", "review"],
      promptInstruction:
        "Write the selected text type for the target reader, following the situation and content points.",
    },
  },
  CAE: {
    writing_part1: {
      selectorLabel: "Part 1",
      selectorName: "Essay",
      examHeading: "WRITING - PART 1",
      taskTypes: "essay",
      wordTarget: "220-260 words",
      minimumWords: 220,
      allowedGenres: ["essay"],
      fixedGenre: "essay",
      promptInstruction:
        "Read the input text and write an essay explaining which two points are most important, giving reasons for your opinion.",
    },
    writing_part2: {
      selectorLabel: "Part 2",
      selectorName: "Email, letter, proposal, report or review",
      examHeading: "WRITING - PART 2",
      taskTypes: "email, letter, proposal, report or review",
      wordTarget: "220-260 words",
      minimumWords: 220,
      allowedGenres: ["email", "letter", "proposal", "report", "review"],
      promptInstruction:
        "Write the selected text type for the stated reader, purpose, and situation.",
    },
  },
  CPE: {
    writing_part1: {
      selectorLabel: "Part 1",
      selectorName: "Source-based discursive essay",
      examHeading: "WRITING - PART 1",
      taskTypes: "discursive essay based on two source texts",
      wordTarget: "240-280 words",
      minimumWords: 240,
      allowedGenres: ["discursive_essay"],
      fixedGenre: "discursive_essay",
      promptInstruction:
        "Read the two source texts, summarise and evaluate their key points, and add your own view in a coherent essay.",
    },
    writing_part2: {
      selectorLabel: "Part 2",
      selectorName: "Article, letter, report or review",
      examHeading: "WRITING - PART 2",
      taskTypes: "article, letter, report or review",
      wordTarget: "280-320 words",
      minimumWords: 280,
      allowedGenres: ["article", "letter", "report", "review"],
      promptInstruction:
        "Write the selected text type in response to the given context and target reader.",
    },
  },
};

export function writingExamSpec(exam: Exam, part: WritingPartId): WritingPartSpec {
  return WRITING_EXAM_SPECS[exam][part];
}

export function writingAllowedGenres(exam: Exam, part: WritingPartId): WritingGenre[] {
  return writingExamSpec(exam, part).allowedGenres;
}

export function writingWordTarget(exam: Exam, part: WritingPartId): string {
  return writingExamSpec(exam, part).wordTarget;
}

export function writingMinimumWords(exam: Exam, part: WritingPartId): number {
  return writingExamSpec(exam, part).minimumWords;
}

// Genre-specific shape and register cues used by the grader prompt.
export const WRITING_GENRE_HINTS: Record<WritingGenre, string> = {
  note:
    "Short informal message. Must respond to all bullet points or cues. Friendly register, contractions allowed.",
  story:
    "Short narrative with a clear beginning, middle and end. Past tenses; engagement through descriptive language.",
  email:
    "Email with appropriate greeting and sign-off. Register matched to the recipient (formal vs semi-formal). Cover every content point in the task.",
  letter:
    "Formal letter with conventional opening (Dear Sir/Madam) and closing (Yours faithfully/sincerely). Clear paragraphs, formal register, no contractions.",
  article:
    "Engaging title and opening hook. Personal yet readable register, structured paragraphs, ends with a memorable closing line.",
  essay:
    "Multi-paragraph discursive piece with introduction, balanced body paragraphs, and conclusion. Formal academic register, hedged claims.",
  discursive_essay:
    "Summarises and evaluates the key ideas from two short input texts, then offers the candidate's own evaluation. Tight integration of both sources, formal register, 240-280 words.",
  proposal:
    "Audience-aware (e.g. to a manager / committee). Uses informative headings, clear recommendations, formal register with persuasive elements.",
  report:
    "Objective, factual register with informative headings. Findings before recommendations. Neutral, impersonal tone.",
  review:
    "Personal recommendation about a book, film, restaurant, place etc. Mix of description and evaluation; ends with a clear recommendation.",
};

export const WRITING_LEVEL_RUBRIC: Record<Exam, string> = {
  KET:
    "A2 Key Writing rubric. Anchor bands: 5 = task fully achieved with simple but accurate language; 3 = task minimally achieved with frequent errors; 0 = wholly off-task or below A2.",
  PET:
    "B1 Preliminary Writing rubric. Anchor bands: 5 = clearly addresses task with adequate B1 range; 3 = task mostly attempted with errors that occasionally impede meaning; 0 = wholly off-task or below B1.",
  FCE:
    "B2 First Writing rubric. Anchor bands: 5 = fully achieved, controlled B2 range; 3 = on task with some errors and limited cohesion; 0 = wholly off-task.",
  CAE:
    "C1 Advanced Writing rubric. Anchor bands: 5 = fully achieved with confident C1 range and natural cohesion; 3 = on task with noticeable awkwardness; 0 = off-task.",
  CPE:
    "C2 Proficiency Writing rubric. Anchor bands: 5 = fully achieved with sophisticated C2 control and seamless cohesion; 3 = on task but limited C2 flair; 0 = off-task.",
};

export function writingPartLabel(part: WritingPartId): string {
  return part === "writing_part1" ? "Writing Part 1" : "Writing Part 2";
}

export function writingPartLabelForExam(exam: Exam, part: WritingPartId): string {
  return writingExamSpec(exam, part).selectorLabel;
}

export function writingPartHeading(part: WritingPartId): string {
  return part === "writing_part1" ? "WRITING - PART 1" : "WRITING - PART 2";
}

export function writingPartInstruction(exam: Exam, part: WritingPartId): string {
  return writingExamSpec(exam, part).promptInstruction;
}

import { z } from "zod";

export const EXAM_CODES = ["KET", "PET", "FCE", "CAE", "CPE"] as const;
export const examSchema = z.enum(EXAM_CODES);
export type Exam = z.infer<typeof examSchema>;

export const partSchema = z.enum([
  "part1",
  "part2",
  "part3",
  "part4",
  "part5",
  "part6",
  "part7",
  "writing_part1",
  "writing_part2",
]);
export type PartId = z.infer<typeof partSchema>;

const gap8StringRecord = z.object({
  gap1: z.string(),
  gap2: z.string(),
  gap3: z.string(),
  gap4: z.string(),
  gap5: z.string(),
  gap6: z.string(),
  gap7: z.string(),
  gap8: z.string(),
});

const gap8OptionsRecord = z.object({
  gap1: z.array(z.string()).length(4),
  gap2: z.array(z.string()).length(4),
  gap3: z.array(z.string()).length(4),
  gap4: z.array(z.string()).length(4),
  gap5: z.array(z.string()).length(4),
  gap6: z.array(z.string()).length(4),
  gap7: z.array(z.string()).length(4),
  gap8: z.array(z.string()).length(4),
});

export const part1Zod = z.object({
  type: z.literal("use_of_english_part1"),
  exam: examSchema,
  title: z.string().min(1),
  topic: z.string().min(1),
  text: z.string().min(1),
  options: gap8OptionsRecord,
  correctAnswers: gap8StringRecord,
});

export const part2Zod = z.object({
  type: z.literal("use_of_english_part2"),
  exam: examSchema,
  title: z.string().min(1),
  topic: z.string().min(1),
  text: z.string().min(1),
  correctAnswers: gap8StringRecord,
});

export const part3Zod = z.object({
  type: z.literal("use_of_english_part3"),
  exam: examSchema,
  title: z.string().min(1),
  topic: z.string().min(1),
  text: z.string().min(1),
  baseWords: z.object({
    gap1: z.string(),
    gap2: z.string(),
    gap3: z.string(),
    gap4: z.string(),
    gap5: z.string(),
    gap6: z.string(),
    gap7: z.string(),
    gap8: z.string(),
  }),
  lines: z
    .array(
      z.object({
        text: z.string(),
        gapId: z.string().optional(),
        baseWord: z.string().optional(),
      }),
    )
    .optional(),
  correctAnswers: gap8StringRecord,
});

export const part4ItemZod = z.object({
  id: z.string(),
  originalSentence: z.string().min(1),
  keyWord: z.string().min(1),
  startFragment: z.string(),
  endFragment: z.string(),
  correctAnswer: z.string().min(1),
  wordLimit: z.tuple([z.number().int(), z.number().int()]),
});

export const part4Zod = z.object({
  type: z.literal("use_of_english_part4"),
  exam: examSchema,
  title: z.string().min(1),
  topic: z.string().min(1),
  items: z.array(part4ItemZod).length(6),
});

const questionOptionZod = z.object({
  id: z.string(),
  prompt: z.string().optional(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string(),
});

export const part5Zod = z.object({
  type: z.literal("reading_part5"),
  exam: examSchema,
  title: z.string().min(1),
  topic: z.string().min(1),
  text: z.string().min(1),
  questions: z.array(questionOptionZod).length(6),
});

const gapParagraphZod = z.object({
  id: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
  content: z.string().min(1),
});

export const part6Zod = z.object({
  type: z.literal("reading_part6"),
  exam: examSchema,
  title: z.string().min(1),
  topic: z.string().min(1),
  text: z.string().min(1),
  paragraphs: z.array(gapParagraphZod).length(7),
  correctOrder: z.array(z.enum(["A", "B", "C", "D", "E", "F", "G"])).length(6),
  distractor: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
});

const matchingTextZod = z.object({
  id: z.string(),
  content: z.string().min(1),
});

const matchingPromptZod = z.object({
  id: z.number().int(),
  statement: z.string().min(1),
  correctTextId: z.string(),
});

export const part7Zod = z.object({
  type: z.literal("reading_part7"),
  exam: examSchema,
  title: z.string().min(1),
  topic: z.string().min(1),
  texts: z.array(matchingTextZod).min(4).max(6),
  prompts: z.array(matchingPromptZod).length(10),
});

const writingGenreEnum = z.enum([
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
]);

const writingSourceTextZod = z.object({
  id: z.string(),
  content: z.string().min(1),
});

const writingCommon = {
  exam: examSchema,
  title: z.string().min(1),
  topic: z.string().min(1),
  genre: writingGenreEnum,
  prompt: z.string().min(1),
  wordRange: z.tuple([z.number().int(), z.number().int()]),
  sourceTexts: z.array(writingSourceTextZod).optional(),
  taskTitle: z.string().optional(),
  taskContext: z.string().optional(),
  taskPoints: z.array(z.string()).optional(),
  finalInstruction: z.string().optional(),
  picturePrompts: z.array(z.string()).optional(),
};

export const writingPart1Zod = z.object({
  type: z.literal("writing_part1"),
  ...writingCommon,
});

export const writingPart2Zod = z.object({
  type: z.literal("writing_part2"),
  ...writingCommon,
});

export const exerciseSchema = z.discriminatedUnion("type", [
  part1Zod,
  part2Zod,
  part3Zod,
  part4Zod,
  part5Zod,
  part6Zod,
  part7Zod,
  writingPart1Zod,
  writingPart2Zod,
]);

export type Exercise = z.infer<typeof exerciseSchema>;
export type WritingExercise = z.infer<typeof writingPart1Zod> | z.infer<typeof writingPart2Zod>;

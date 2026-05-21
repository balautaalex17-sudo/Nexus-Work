import { z } from "zod";
import { chatJson } from "@/lib/gemini/client";
import type { Exam } from "@/lib/exercises/types";
import type { WritingExercise } from "@/lib/exercises/types";
import {
  WRITING_GENRE_HINTS,
  WRITING_GENRE_LABEL,
  WRITING_LEVEL_RUBRIC,
  type WritingGenre,
  type WritingPartId,
  writingExamSpec,
  writingWordTarget,
} from "@/lib/exercises/writing";

const bandScore = z.number().int().min(0).max(5);

const notesShape = z.object({
  content: z.array(z.string()).default([]),
  communicativeAchievement: z.array(z.string()).default([]),
  organisation: z.array(z.string()).default([]),
  language: z.array(z.string()).default([]),
});

export const writingFeedbackSchema = z.object({
  content: bandScore,
  communicativeAchievement: bandScore,
  organisation: bandScore,
  language: bandScore,
  overall: z.string(),
  notes: notesShape,
  accepted: z.boolean().default(true),
});

export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

const FEEDBACK_TIMEOUT_MS = Number(process.env.AI_WRITING_TIMEOUT_MS ?? "65000");

function feedbackSignal() {
  const ms = Number.isFinite(FEEDBACK_TIMEOUT_MS) ? FEEDBACK_TIMEOUT_MS : 65000;
  return AbortSignal.timeout(ms);
}

function placeholderFeedback(message: string): WritingFeedback {
  return {
    content: 0,
    communicativeAchievement: 0,
    organisation: 0,
    language: 0,
    overall: message,
    notes: { content: [], communicativeAchievement: [], organisation: [], language: [] },
    accepted: false,
  };
}

function buildFeedbackPrompt(input: {
  exam: Exam;
  part: WritingPartId;
  genre: WritingGenre;
  prompt: string;
  taskTitle?: string;
  taskContext?: string;
  taskPoints?: string[];
  finalInstruction?: string;
  picturePrompts?: string[];
  wordRange: [number, number];
  sourceTexts?: Array<{ id: string; content: string }>;
  essayText: string;
}) {
  const wordCount = input.essayText.trim() ? input.essayText.trim().split(/\s+/).length : 0;
  const spec = writingExamSpec(input.exam, input.part);
  const genreLabel = WRITING_GENRE_LABEL[input.genre];
  const genreHint = WRITING_GENRE_HINTS[input.genre];
  const rubric = WRITING_LEVEL_RUBRIC[input.exam];

  const sources = input.sourceTexts && input.sourceTexts.length > 0
    ? `\nSource texts (the candidate had to summarise these):\n${input.sourceTexts
        .map((text) => `- ${text.id}: ${text.content}`)
        .join("\n")}`
    : "";
  const structuredBrief = [
    input.taskTitle ? `Task title: ${input.taskTitle}` : "",
    input.taskContext ? `Context: ${input.taskContext}` : "",
    input.taskPoints && input.taskPoints.length > 0
      ? `Required points:\n${input.taskPoints.map((point) => `- ${point}`).join("\n")}`
      : "",
    input.picturePrompts && input.picturePrompts.length > 0
      ? `Picture prompts:\n${input.picturePrompts.map((point, index) => `- Picture ${index + 1}: ${point}`).join("\n")}`
      : "",
    input.finalInstruction ? `Final instruction: ${input.finalInstruction}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a senior Cambridge English examiner marking a ${input.exam} ${spec.examHeading} answer.

${rubric}

Genre: ${genreLabel}.
Genre conventions to enforce: ${genreHint}

Task brief shown to the candidate:
"""
${input.prompt}
${structuredBrief ? `\n\n${structuredBrief}` : ""}
"""${sources}

Official word requirement: ${writingWordTarget(input.exam, input.part)}.
Internal word-count bounds: ${input.wordRange[0]}-${input.wordRange[1]} words.
The candidate wrote ${wordCount} words.

Candidate response:
"""
${input.essayText}
"""

Mark on the Cambridge four-criteria rubric, awarding an integer band 0-5 for EACH of:
- Content: did the response answer the task and cover required points?
- Communicative Achievement: appropriate register, conventions, and impact on the target reader.
- Organisation: cohesion, paragraphing, signposting, logical flow.
- Language: range and accuracy of vocabulary and grammar at the target level.

Then write:
- Important detail requirement: make the feedback significantly more specific than a normal summary. The "overall" paragraph must be 120-180 words and name the next two practice priorities.
- For "notes", write exactly 5 detailed notes per criterion unless the response is extremely short; for extremely short responses write at least 3 notes per criterion explaining what is missing.
- Each note must be 45-90 words and include all three parts in one paragraph: Evidence from the response, why it matters for the Cambridge criterion, and a concrete fix or rewrite the learner can use next time.
- Do not write generic notes like "use more vocabulary" or "organise better". Every note needs a quote, paragraph/sentence reference, or missing-task-point reference.
- "overall": one paragraph of 120-180 words summarising the strongest and weakest aspects in plain English. Mention the band ranges, the most consequential weakness, and the next two practice priorities.
- "notes": detailed, criterion-specific feedback. Aim for 4-6 substantive bullets per criterion. Each bullet must:
    * QUOTE the candidate's wording in inline double-quotes (e.g. "...the situation was very bad...") or describe a concrete moment by paragraph/sentence position;
    * EXPLAIN what's strong or weak about it in Cambridge rubric terms;
    * SUGGEST a concrete rewrite, alternative phrase, or technique to apply — not a vague "be clearer" or "vary vocabulary".
  Per-criterion guidance:
    - content: per required brief point, state whether it's addressed, partially addressed, or missing, and quote the line that addresses it (or note where it should have appeared).
    - communicativeAchievement: register slips (over/under-formal), tone for target reader, genre-convention misses, opening/closing effectiveness — quote at least two specific phrases.
    - organisation: paragraph division, topic sentences, cohesive devices used or missing, signposting between paragraphs — quote a linker or transition that worked, and one that didn't.
    - language: grammar errors (quote the exact phrase + give correct form), collocation/word-choice issues (quote + alternative), range-of-structures notes (e.g. all simple past — could vary with present perfect for "...").
  No generic praise; every bullet must be tied to the actual response. Avoid lists of single words — write full sentences with the quote embedded.

Reply with strict JSON only:
{
  "content": <0-5>,
  "communicativeAchievement": <0-5>,
  "organisation": <0-5>,
  "language": <0-5>,
  "overall": "...",
  "notes": {
    "content": ["...", "..."],
    "communicativeAchievement": ["...", "..."],
    "organisation": ["...", "..."],
    "language": ["...", "..."]
  }
}`;
}

export async function gradeWriting(input: {
  exercise: WritingExercise;
  essayText: string;
}): Promise<WritingFeedback> {
  const essayText = input.essayText.trim();
  if (!essayText) {
    return placeholderFeedback("Empty response. Write at least the minimum word count and submit again.");
  }

  try {
    const prompt = buildFeedbackPrompt({
      exam: input.exercise.exam,
      part: input.exercise.type as WritingPartId,
      genre: input.exercise.genre,
      prompt: input.exercise.prompt,
      taskTitle: input.exercise.taskTitle,
      taskContext: input.exercise.taskContext,
      taskPoints: input.exercise.taskPoints,
      finalInstruction: input.exercise.finalInstruction,
      picturePrompts: input.exercise.picturePrompts,
      wordRange: input.exercise.wordRange,
      sourceTexts: input.exercise.sourceTexts,
      essayText,
    });

    const raw = await chatJson<unknown>({
      prompt,
      temperature: 0.2,
      maxTokens: 7000,
      signal: feedbackSignal(),
    });

    const parsed = writingFeedbackSchema.safeParse(raw);
    if (!parsed.success) {
      return placeholderFeedback("Marker returned an unreadable verdict. Re-submit to try again.");
    }
    return parsed.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Marker unavailable.";
    return placeholderFeedback(`AI marker temporarily unavailable: ${message}`);
  }
}

export function writingTotalBand(feedback: WritingFeedback) {
  return feedback.content + feedback.communicativeAchievement + feedback.organisation + feedback.language;
}

export const WRITING_MAX_BAND = 20;

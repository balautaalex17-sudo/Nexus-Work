import type { WritingExercise } from "@/lib/exercises/types";

export interface WritingBriefView {
  taskTitle?: string;
  taskContext?: string;
  taskPoints: string[];
  finalInstruction?: string;
  picturePrompts: string[];
  fallbackParagraphs: string[];
}

export function cleanWritingText(value: string | undefined | null) {
  return String(value ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanListItem(value: string) {
  return cleanWritingText(value.replace(/^\s*[-*\u2022]\s+/, ""));
}

function splitParagraphs(value: string) {
  return cleanWritingText(value)
    .split(/\n\s*\n/)
    .map((part) => cleanWritingText(part))
    .filter(Boolean);
}

function looksLikeTaskTitle(paragraph: string) {
  const wordCount = paragraph.split(/\s+/).filter(Boolean).length;
  return (
    wordCount > 1 &&
    wordCount <= 12 &&
    paragraph.length <= 90 &&
    !paragraph.endsWith(".") &&
    !/^write\b/i.test(paragraph)
  );
}

function looksLikeFinalInstruction(paragraph: string) {
  return /^write\s+(your|an?|the)\b/i.test(paragraph);
}

function fallbackFromPrompt(prompt: string) {
  const points: string[] = [];
  const paragraphs: string[] = [];
  let taskTitle: string | undefined;
  let finalInstruction: string | undefined;

  for (const paragraph of splitParagraphs(prompt)) {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const bulletLines = lines.filter((line) => /^\s*[-*\u2022]\s+/.test(line));

    if (bulletLines.length > 0 && bulletLines.length === lines.length) {
      points.push(...bulletLines.map(cleanListItem).filter(Boolean));
    } else {
      paragraphs.push(paragraph);
    }
  }

  const titleIndex = paragraphs.findIndex((paragraph, index) => index > 0 && looksLikeTaskTitle(paragraph));
  if (titleIndex >= 0) {
    taskTitle = paragraphs.splice(titleIndex, 1)[0];
  }

  const lastParagraph = paragraphs.at(-1);
  if (lastParagraph && looksLikeFinalInstruction(lastParagraph)) {
    finalInstruction = paragraphs.pop();
  }

  return { points, paragraphs, taskTitle, finalInstruction };
}

export function writingBriefView(exercise: WritingExercise): WritingBriefView {
  const fallback = fallbackFromPrompt(exercise.prompt);
  const structuredPoints = (exercise.taskPoints ?? []).map(cleanWritingText).filter(Boolean);

  return {
    taskTitle: cleanWritingText(exercise.taskTitle) || fallback.taskTitle,
    taskContext: cleanWritingText(exercise.taskContext) || undefined,
    taskPoints: structuredPoints.length > 0 ? structuredPoints : fallback.points,
    finalInstruction: cleanWritingText(exercise.finalInstruction) || fallback.finalInstruction,
    picturePrompts: (exercise.picturePrompts ?? []).map(cleanWritingText).filter(Boolean),
    fallbackParagraphs:
      exercise.taskContext || exercise.taskTitle || exercise.finalInstruction
        ? []
        : fallback.paragraphs,
  };
}

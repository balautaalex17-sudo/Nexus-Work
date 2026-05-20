import { chatJson, OpenRouterError } from "@/lib/gemini/client";
import { buildPrompt } from "@/lib/gemini/prompts";
import { buildFallbackExercise } from "@/lib/exercises/fallbacks";
import { exerciseSchema, type Exam, type Exercise, type PartId } from "@/lib/exercises/types";
import {
  WRITING_GENRES,
  WRITING_WORD_RANGE,
  isWritingPart,
  writingAllowedGenres,
  writingExamSpec,
  type WritingGenre,
  type WritingPartId,
} from "@/lib/exercises/writing";
import { cleanWritingText } from "@/lib/exercises/writingBrief";

interface GenerateParams {
  exam: Exam;
  part: PartId;
  excludeTitles: string[];
  excludeTopics: string[];
  genre?: WritingGenre;
}

function generationSignal() {
  const timeoutMs = Number(process.env.AI_GENERATION_TIMEOUT_MS ?? "35000");
  return AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 35000);
}

function stricterSuffix(attempt: number) {
  if (attempt === 1) {
    return "\nFollow the JSON contract exactly. Do not omit required fields.";
  }
  return "\nOutput strictly valid JSON with exact key names, exact discriminator values, and exact item counts.";
}

const exerciseTypeByPart: Record<PartId, Exercise["type"]> = {
  part1: "use_of_english_part1",
  part2: "use_of_english_part2",
  part3: "use_of_english_part3",
  part4: "use_of_english_part4",
  part5: "reading_part5",
  part6: "reading_part6",
  part7: "reading_part7",
  writing_part1: "writing_part1",
  writing_part2: "writing_part2",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function orderKey(key: string) {
  const match = key.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function toArray(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return value;

  if (
    getField(value, ["prompt", "question", "stem", "statement"]) !== undefined ||
    getField(value, ["options", "choices"]) !== undefined ||
    getField(value, ["correctAnswer", "correct", "answer"]) !== undefined
  ) {
    return [value];
  }

  for (const key of [
    "items",
    "item",
    "questions",
    "question",
    "prompts",
    "prompt",
    "lines",
    "line",
    "texts",
    "paragraphs",
    "paragraph",
  ]) {
    if (key in value) return toArray(value[key]);
  }

  return Object.entries(value)
    .sort(([a], [b]) => orderKey(a) - orderKey(b) || a.localeCompare(b))
    .map(([, item]) => item);
}

function getField(record: Record<string, unknown>, names: string[]): unknown {
  const lowerNames = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = key.replace(/[\s_-]/g, "").toLowerCase();
    if (lowerNames.has(normalizedKey)) return value;
  }
  return undefined;
}

function normalizeOptions(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return value;

  const nested = getField(value, ["options", "option", "choices", "choice", "answers", "answer"]);
  if (nested !== undefined && nested !== value) return normalizeOptions(nested);

  return Object.entries(value)
    .sort(([a], [b]) => orderKey(a) - orderKey(b) || a.localeCompare(b))
    .map(([, item]) => item);
}

function normalizeOptionList(value: unknown): string[] | unknown {
  const options = normalizeOptions(value);
  if (!Array.isArray(options)) return options;

  return options.map((option) => {
    if (typeof option === "string") return option;
    if (!isRecord(option)) return String(option ?? "");

    const text =
      getField(option, ["text", "option", "content", "value", "answer", "label"]) ?? option;
    return typeof text === "string" ? text : JSON.stringify(text);
  });
}

function findCollection(root: Record<string, unknown>, names: string[]): unknown {
  return getField(root, names);
}

function isQuestionLike(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    (getField(value, ["prompt", "question", "stem", "statement", "text"]) !== undefined ||
      getField(value, ["options", "choices"]) !== undefined ||
      getField(value, ["correctAnswer", "correct", "answer"]) !== undefined)
  );
}

function collectQuestionLike(root: Record<string, unknown>): unknown[] {
  return Object.entries(root)
    .filter(
      ([key, value]) =>
        /^(q|question|item)[\s_-]?\d+$/i.test(key) || isQuestionLike(value),
    )
    .sort(([a], [b]) => orderKey(a) - orderKey(b) || a.localeCompare(b))
    .map(([, value]) => value)
    .filter(isQuestionLike);
}

function normalizeQuestion(value: unknown, index: number): unknown {
  if (!isRecord(value)) return value;

  const options = normalizeOptionList(
    getField(value, ["options", "option", "choices", "choice", "answers", "answerOptions"]) ??
      value.options,
  );
  let correctAnswer =
    getField(value, ["correctAnswer", "correct", "answer", "correctOption", "correctChoice"]) ??
    value.correctAnswer;
  const prompt =
    getField(value, ["prompt", "question", "stem", "text", "statement"]) ?? value.prompt;
  const id = getField(value, ["id", "number", "questionNumber"]) ?? `q${index + 1}`;
  const promptText =
    typeof prompt === "string"
      ? prompt
      : typeof id === "string" && !/^(q|question|item)?\d+$/i.test(id.trim())
        ? id
        : undefined;

  if (Array.isArray(options) && typeof correctAnswer === "string") {
    const label = correctAnswer.trim().toUpperCase();
    const labelIndex = ["A", "B", "C", "D"].indexOf(label);
    if (labelIndex >= 0 && typeof options[labelIndex] === "string") {
      correctAnswer = options[labelIndex];
    }
  }

  return {
    ...value,
    id: String(id),
    prompt: promptText,
    options: Array.isArray(options) ? options.slice(0, 4) : options,
    correctAnswer: typeof correctAnswer === "string" ? correctAnswer : String(correctAnswer ?? ""),
  };
}

function authoritativeGenre(exam: Exam, part: WritingPartId, requested?: WritingGenre) {
  const fixedGenre = writingExamSpec(exam, part).fixedGenre;
  if (fixedGenre) return fixedGenre;
  const allowed = writingAllowedGenres(exam, part);
  if (requested && allowed.includes(requested)) return requested;
  return allowed[0];
}

function normalizeWordRange(exam: Exam, part: WritingPartId): [number, number] {
  return WRITING_WORD_RANGE[exam][part];
}

function normalizeSourceTexts(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      const id = String(
        getField(entry, ["id", "label", "name"]) ?? String.fromCharCode(65 + index),
      );
      const content = cleanWritingText(String(getField(entry, ["content", "text", "body"]) ?? ""));
      if (!content.trim()) return null;
      return { id, content };
    })
    .filter((entry): entry is { id: string; content: string } => Boolean(entry));
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value.map((entry) => cleanWritingText(String(entry ?? ""))).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeGeneratedPayload(
  payload: unknown,
  exam: Exam,
  part: PartId,
  genre?: WritingGenre,
): unknown {
  const root = isRecord(payload) && isRecord(payload.exercise) ? payload.exercise : payload;
  if (!isRecord(root)) return root;

  const normalized: Record<string, unknown> = {
    ...root,
    // The route the user selected is authoritative; keep validating all generated content.
    type: exerciseTypeByPart[part],
    exam,
  };

  if (part === "part3") {
    normalized.lines = toArray(findCollection(normalized, ["lines", "line"]) ?? normalized.lines);
  }

  if (part === "part4") {
    normalized.items = toArray(findCollection(normalized, ["items", "item", "transformations"]) ?? normalized.items);
  }

  if (part === "part5") {
    normalized.questions = toArray(
      findCollection(normalized, [
        "questions",
        "question",
        "items",
        "item",
        "multipleChoiceQuestions",
        "readingQuestions",
      ]) ?? normalized.questions,
    );
    if (!Array.isArray(normalized.questions)) {
      normalized.questions = collectQuestionLike(normalized);
    }
    if (Array.isArray(normalized.questions)) {
      normalized.questions = normalized.questions
        .filter(isQuestionLike)
        .map(normalizeQuestion)
        .slice(0, 6);
    }
  }

  if (part === "part6") {
    normalized.paragraphs = toArray(
      findCollection(normalized, ["paragraphs", "paragraph", "choices", "options"]) ??
        normalized.paragraphs,
    );
    normalized.correctOrder = toArray(
      findCollection(normalized, ["correctOrder", "order", "answers", "answerKey"]) ??
        normalized.correctOrder,
    );
  }

  if (part === "part7") {
    normalized.texts = toArray(findCollection(normalized, ["texts", "text", "sections"]) ?? normalized.texts);
    normalized.prompts = toArray(
      findCollection(normalized, ["prompts", "prompt", "questions", "statements"]) ??
        normalized.prompts,
    );
  }

  if (isWritingPart(part)) {
    const writingPart = part as WritingPartId;
    normalized.genre = authoritativeGenre(exam, writingPart, genre);
    normalized.wordRange = normalizeWordRange(exam, writingPart);
    normalized.prompt = cleanWritingText(String(normalized.prompt ?? ""));
    normalized.taskTitle = cleanWritingText(String(normalized.taskTitle ?? ""));
    normalized.taskContext = cleanWritingText(String(normalized.taskContext ?? ""));
    normalized.finalInstruction = cleanWritingText(String(normalized.finalInstruction ?? ""));

    if (!normalized.taskTitle) delete normalized.taskTitle;
    if (!normalized.taskContext) delete normalized.taskContext;
    if (!normalized.finalInstruction) delete normalized.finalInstruction;

    const taskPoints = normalizeStringList(normalized.taskPoints);
    if (taskPoints) normalized.taskPoints = taskPoints;
    else delete normalized.taskPoints;

    const picturePrompts = normalizeStringList(normalized.picturePrompts);
    if (exam === "KET" && writingPart === "writing_part2" && picturePrompts) {
      normalized.picturePrompts = picturePrompts.slice(0, 3);
    } else {
      delete normalized.picturePrompts;
    }

    const cleanedSources = normalizeSourceTexts(normalized.sourceTexts);
    if (writingPart === "writing_part1" && exam === "CPE" && normalized.genre === "discursive_essay") {
      normalized.sourceTexts = cleanedSources ?? [];
    } else if (cleanedSources) {
      normalized.sourceTexts = cleanedSources;
    } else {
      delete normalized.sourceTexts;
    }
  }

  return normalized;
}

function containsGapToken(value: string) {
  return /(\[gap\d+\]|\(gap\d+\)|\{gap\d+\}|<gap\d+>|\bgap\d+\b)/i.test(value);
}

function validatePartShape(exercise: Exercise) {
  if (exercise.type === "reading_part5" && containsGapToken(exercise.text)) {
    throw new Error("Part 5 reading text must not contain gap placeholders.");
  }

  if (
    exercise.type === "reading_part7" &&
    exercise.texts.some((text) => containsGapToken(text.content))
  ) {
    throw new Error("Part 7 matching texts must not contain gap placeholders.");
  }

  if (
    (exercise.type === "writing_part1" || exercise.type === "writing_part2") &&
    containsGapToken(exercise.prompt)
  ) {
    throw new Error("Writing prompts must not contain gap placeholders.");
  }

  if (
    exercise.type === "writing_part1" &&
    exercise.exam === "CPE" &&
    exercise.genre === "discursive_essay" &&
    (!exercise.sourceTexts || exercise.sourceTexts.length < 2)
  ) {
    throw new Error("CPE Writing Part 1 must include two source texts.");
  }

  if (
    exercise.type === "writing_part2" &&
    exercise.exam === "KET" &&
    (!exercise.picturePrompts || exercise.picturePrompts.length < 3)
  ) {
    throw new Error("A2 Key Writing Part 7 must include three picture prompt descriptions.");
  }
}

export async function generateExercise({
  exam,
  part,
  excludeTitles,
  excludeTopics,
  genre,
}: GenerateParams): Promise<Exercise> {
  // Sanity guard for callers that pass a malformed writing genre.
  const resolvedGenre = genre && (WRITING_GENRES as readonly string[]).includes(genre) ? genre : undefined;

  let lastError = "Unknown generation error";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const prompt =
        buildPrompt(exam, part, {
          excludeTitles,
          excludeTopics,
          genre: isWritingPart(part) ? authoritativeGenre(exam, part as WritingPartId, resolvedGenre) : undefined,
        }) + stricterSuffix(attempt);
      const parsed = await chatJson<unknown>({
        prompt,
        temperature: 0.75,
        topP: 0.9,
        signal: generationSignal(),
      });
      const exercise = exerciseSchema.parse(
        normalizeGeneratedPayload(parsed, exam, part, resolvedGenre),
      );
      validatePartShape(exercise);
      return exercise;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown generation error";
      if (error instanceof OpenRouterError && (error.status === 401 || error.status === 403)) {
        throw error;
      }
    }
  }

  const fallback = buildFallbackExercise(exam, part, excludeTitles);
  if (fallback) {
    return exerciseSchema.parse(fallback);
  }

  throw new Error(`Failed to generate exercise after retries: ${lastError}`);
}

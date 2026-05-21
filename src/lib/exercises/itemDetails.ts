import type { Exercise } from "@/lib/exercises/types";

export const PART_NAMES: Record<string, string> = {
  part1: "Multiple Choice Cloze",
  part2: "Open Cloze",
  part3: "Word Formation",
  part4: "Key Word Transformation",
  part5: "Reading Multiple Choice",
  part6: "Gapped Text",
  part7: "Multiple Matching",
  writing_part1: "Writing Part 1",
  writing_part2: "Writing Part 2",
};

const PART_RANGE: Record<string, number> = {
  part1: 1,
  part2: 9,
  part3: 17,
  part4: 25,
  part5: 31,
  part6: 37,
  part7: 44,
  writing_part1: 54,
  writing_part2: 55,
};

export function indexFromKey(key: string): number {
  const match = key.match(/\d+/);
  return match ? Number(match[0]) : 1;
}

export function questionNumberForKey(part: string, key: string) {
  return (PART_RANGE[part] ?? 1) + indexFromKey(key) - 1;
}

const GAP_TOKEN_RE_GLOBAL = /(?:\[|\(|\{|<)?\bgap\d+\b(?:\]|\)|\}|>)?/gi;
const BLANK_GLYPH = "  _____  ";

function previewSentenceForGap(text: string, gapKey: string): string | null {
  const tokenRe = new RegExp(`(?:\\[|\\(|\\{|<)?\\b${gapKey}\\b(?:\\]|\\)|\\}|>)?`, "i");
  const match = tokenRe.exec(text);
  if (!match) return null;
  const idx = match.index;
  const sentenceStart = (() => {
    const last = Math.max(
      text.lastIndexOf(". ", idx - 1),
      text.lastIndexOf("! ", idx - 1),
      text.lastIndexOf("? ", idx - 1),
      text.lastIndexOf("\n", idx - 1),
    );
    return last >= 0 ? last + 1 : 0;
  })();
  const afterIdx = idx + match[0].length;
  const remainder = text.slice(afterIdx);
  const tail = remainder.search(/[.!?](?:\s|$)|\n/);
  const sentenceEnd = tail >= 0 ? afterIdx + tail + 1 : text.length;
  const raw = text.slice(sentenceStart, sentenceEnd).trim();
  const withBlank = raw.replace(GAP_TOKEN_RE_GLOBAL, BLANK_GLYPH);
  return withBlank.replace(/\s+/g, " ").trim();
}

export function itemKeysForExercise(exercise: Exercise) {
  switch (exercise.type) {
    case "use_of_english_part1":
    case "use_of_english_part2":
    case "use_of_english_part3":
      return Array.from({ length: 8 }, (_, index) => `gap${index + 1}`);
    case "use_of_english_part4":
      return exercise.items.map((_, index) => `item${index + 1}`);
    case "reading_part5":
      return exercise.questions.map((_, index) => `q${index + 1}`);
    case "reading_part6":
      return exercise.correctOrder.map((_, index) => `gap${index + 1}`);
    case "reading_part7":
      return exercise.prompts.map((_, index) => `prompt${index + 1}`);
    case "writing_part1":
    case "writing_part2":
      return ["essay"];
  }
}

export function describeExerciseItem(
  exercise: Exercise,
  key: string,
): { prompt: string; context?: string; choices?: string[]; correctAnswer: string } | null {
  const idx = indexFromKey(key) - 1;

  switch (exercise.type) {
    case "use_of_english_part1": {
      const correct = exercise.correctAnswers[key as keyof typeof exercise.correctAnswers];
      const preview = previewSentenceForGap(exercise.text, key);
      return {
        prompt: preview ?? "Choose the best word for the blank.",
        context: exercise.text,
        choices: exercise.options[key as keyof typeof exercise.options],
        correctAnswer: correct,
      };
    }
    case "use_of_english_part2":
    case "use_of_english_part3": {
      const correct = exercise.correctAnswers[key as keyof typeof exercise.correctAnswers];
      if (exercise.type === "use_of_english_part3") {
        const base = exercise.baseWords[key as keyof typeof exercise.baseWords];
        return {
          prompt: `Form the correct word from "${base}".`,
          context: exercise.text,
          correctAnswer: correct,
        };
      }
      const preview = previewSentenceForGap(exercise.text, key);
      return {
        prompt: preview ?? "Fill in the missing word.",
        context: exercise.text,
        correctAnswer: correct,
      };
    }
    case "use_of_english_part4": {
      const item = exercise.items[idx];
      if (!item) return null;
      return {
        prompt: `${item.originalSentence} (key word: ${item.keyWord})`,
        context: `${item.startFragment} _____ ${item.endFragment}`,
        correctAnswer: item.correctAnswer,
      };
    }
    case "reading_part5": {
      const question = exercise.questions[idx];
      if (!question) return null;
      return {
        prompt: question.prompt ?? `Question ${idx + 1}`,
        context: exercise.text,
        choices: question.options,
        correctAnswer: question.correctAnswer,
      };
    }
    case "reading_part6": {
      return {
        prompt: "Choose the paragraph that best fits this position in the text.",
        context: exercise.text,
        choices: exercise.paragraphs.map((paragraph) => `${paragraph.id}. ${paragraph.content}`),
        correctAnswer: exercise.correctOrder[idx] ?? "",
      };
    }
    case "reading_part7": {
      const prompt = exercise.prompts[idx];
      if (!prompt) return null;
      return {
        prompt: prompt.statement,
        choices: exercise.texts.map((entry) => `${entry.id}. ${entry.content}`),
        correctAnswer: prompt.correctTextId,
      };
    }
    case "writing_part1":
    case "writing_part2": {
      return {
        prompt: exercise.prompt,
        context: exercise.title,
        correctAnswer: "",
      };
    }
  }
}

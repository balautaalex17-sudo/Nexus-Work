import { EXAM_CODES } from "@/lib/exercises/types";

const examEnum = [...EXAM_CODES];
const gapRequired = Array.from({ length: 8 }, (_, i) => `gap${i + 1}`);
const writingGenres = [
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
];

function gapStringProperties() {
  return Object.fromEntries(gapRequired.map((gap) => [gap, { type: "STRING" }]));
}

function gapOptionsProperties() {
  return Object.fromEntries(
    gapRequired.map((gap) => [gap, { type: "ARRAY", items: { type: "STRING" }, minItems: 4, maxItems: 4 }]),
  );
}

export const part1Schema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["use_of_english_part1"] },
    exam: { type: "STRING", enum: examEnum },
    title: { type: "STRING" },
    topic: { type: "STRING" },
    text: { type: "STRING" },
    options: { type: "OBJECT", properties: gapOptionsProperties(), required: gapRequired },
    correctAnswers: { type: "OBJECT", properties: gapStringProperties(), required: gapRequired },
  },
  required: ["type", "exam", "title", "topic", "text", "options", "correctAnswers"],
};

export const part2Schema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["use_of_english_part2"] },
    exam: { type: "STRING", enum: examEnum },
    title: { type: "STRING" },
    topic: { type: "STRING" },
    text: { type: "STRING" },
    correctAnswers: { type: "OBJECT", properties: gapStringProperties(), required: gapRequired },
  },
  required: ["type", "exam", "title", "topic", "text", "correctAnswers"],
};

export const part3Schema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["use_of_english_part3"] },
    exam: { type: "STRING", enum: examEnum },
    title: { type: "STRING" },
    topic: { type: "STRING" },
    text: { type: "STRING" },
    baseWords: { type: "OBJECT", properties: gapStringProperties(), required: gapRequired },
    lines: {
      type: "ARRAY",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          gapId: { type: "STRING" },
          baseWord: { type: "STRING" },
        },
        required: ["text", "gapId", "baseWord"],
      },
    },
    correctAnswers: { type: "OBJECT", properties: gapStringProperties(), required: gapRequired },
  },
  required: ["type", "exam", "title", "topic", "text", "baseWords", "lines", "correctAnswers"],
};

export const part4Schema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["use_of_english_part4"] },
    exam: { type: "STRING", enum: examEnum },
    title: { type: "STRING" },
    topic: { type: "STRING" },
    items: {
      type: "ARRAY",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          originalSentence: { type: "STRING" },
          keyWord: { type: "STRING" },
          startFragment: { type: "STRING" },
          endFragment: { type: "STRING" },
          correctAnswer: { type: "STRING" },
          wordLimit: {
            type: "ARRAY",
            minItems: 2,
            maxItems: 2,
            items: { type: "NUMBER" },
          },
        },
        required: [
          "id",
          "originalSentence",
          "keyWord",
          "startFragment",
          "endFragment",
          "correctAnswer",
          "wordLimit",
        ],
      },
    },
  },
  required: ["type", "exam", "title", "topic", "items"],
};

export const part5Schema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["reading_part5"] },
    exam: { type: "STRING", enum: examEnum },
    title: { type: "STRING" },
    topic: { type: "STRING" },
    text: { type: "STRING" },
    questions: {
      type: "ARRAY",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          prompt: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" }, minItems: 4, maxItems: 4 },
          correctAnswer: { type: "STRING" },
        },
        required: ["id", "prompt", "options", "correctAnswer"],
      },
    },
  },
  required: ["type", "exam", "title", "topic", "text", "questions"],
};

export const part6Schema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["reading_part6"] },
    exam: { type: "STRING", enum: examEnum },
    title: { type: "STRING" },
    topic: { type: "STRING" },
    text: { type: "STRING" },
    paragraphs: {
      type: "ARRAY",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "OBJECT",
        properties: { id: { type: "STRING" }, content: { type: "STRING" } },
        required: ["id", "content"],
      },
    },
    correctOrder: { type: "ARRAY", minItems: 6, maxItems: 6, items: { type: "STRING" } },
    distractor: { type: "STRING" },
  },
  required: ["type", "exam", "title", "topic", "text", "paragraphs", "correctOrder", "distractor"],
};

export const part7Schema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["reading_part7"] },
    exam: { type: "STRING", enum: examEnum },
    title: { type: "STRING" },
    topic: { type: "STRING" },
    texts: {
      type: "ARRAY",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "OBJECT",
        properties: { id: { type: "STRING" }, content: { type: "STRING" } },
        required: ["id", "content"],
      },
    },
    prompts: {
      type: "ARRAY",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "NUMBER" },
          statement: { type: "STRING" },
          correctTextId: { type: "STRING" },
        },
        required: ["id", "statement", "correctTextId"],
      },
    },
  },
  required: ["type", "exam", "title", "topic", "texts", "prompts"],
};

function writingSchema(typeLiteral: "writing_part1" | "writing_part2") {
  return {
    type: "OBJECT",
    properties: {
      type: { type: "STRING", enum: [typeLiteral] },
      exam: { type: "STRING", enum: examEnum },
      title: { type: "STRING" },
      topic: { type: "STRING" },
      genre: { type: "STRING", enum: writingGenres },
      prompt: { type: "STRING" },
      taskTitle: { type: "STRING" },
      taskContext: { type: "STRING" },
      taskPoints: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      finalInstruction: { type: "STRING" },
      picturePrompts: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      wordRange: {
        type: "ARRAY",
        minItems: 2,
        maxItems: 2,
        items: { type: "NUMBER" },
      },
      sourceTexts: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            content: { type: "STRING" },
          },
          required: ["id", "content"],
        },
      },
    },
    required: ["type", "exam", "title", "topic", "genre", "prompt", "wordRange"],
  } as const;
}

export const writingPart1Schema = writingSchema("writing_part1");
export const writingPart2Schema = writingSchema("writing_part2");

export const schemaByPart = {
  part1: part1Schema,
  part2: part2Schema,
  part3: part3Schema,
  part4: part4Schema,
  part5: part5Schema,
  part6: part6Schema,
  part7: part7Schema,
  writing_part1: writingPart1Schema,
  writing_part2: writingPart2Schema,
} as const;

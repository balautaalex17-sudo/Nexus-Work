import type { PartId } from "@/lib/exercises/types";

export const PART_QUESTION_RANGE: Record<PartId, { start: number; end: number; marks: string }> = {
  part1: { start: 1, end: 8, marks: "1 mark each" },
  part2: { start: 9, end: 16, marks: "1 mark each" },
  part3: { start: 17, end: 24, marks: "1 mark each" },
  part4: { start: 25, end: 30, marks: "2 marks each" },
  part5: { start: 31, end: 36, marks: "2 marks each" },
  part6: { start: 37, end: 43, marks: "2 marks each" },
  part7: { start: 44, end: 53, marks: "1 mark each" },
  writing_part1: { start: 54, end: 54, marks: "AI feedback" },
  writing_part2: { start: 55, end: 55, marks: "AI feedback" },
};

export const PART_INSTRUCTIONS: Record<PartId, { heading: string; instruction: string }> = {
  part1: {
    heading: "PART 1 · MULTIPLE-CHOICE CLOZE",
    instruction:
      "For questions 1-8, read the text below and decide which answer (A, B, C or D) best fits each gap. There is an example at the beginning (0).",
  },
  part2: {
    heading: "PART 2 · OPEN CLOZE",
    instruction:
      "For questions 9-16, read the text below and think of the word which best fits each gap. Use only ONE word in each gap. There is an example at the beginning (0).",
  },
  part3: {
    heading: "PART 3 · WORD FORMATION",
    instruction:
      "For questions 17-24, read the text below. Use the word given in capitals at the end of some of the lines to form a word that fits in the gap in the same line. There is an example at the beginning (0).",
  },
  part4: {
    heading: "PART 4 · KEY WORD TRANSFORMATIONS",
    instruction:
      "For questions 25-30, complete the second sentence so that it has a similar meaning to the first sentence, using the word given. Do not change the word given. You must use between three and eight words, including the word given.",
  },
  part5: {
    heading: "PART 5 · MULTIPLE CHOICE",
    instruction:
      "You are going to read an extract from a novel. For questions 31-36, choose the answer (A, B, C or D) which you think fits best according to the text.",
  },
  part6: {
    heading: "PART 6 · GAPPED TEXT",
    instruction:
      "You are going to read an article. Six paragraphs have been removed from the article. Choose from the paragraphs A-G the one which fits each gap (37-43). There is one extra paragraph which you do not need to use.",
  },
  part7: {
    heading: "PART 7 · MULTIPLE MATCHING",
    instruction:
      "You are going to read an article about researchers. For questions 44-53, choose from the sections (A-D). The sections may be chosen more than once.",
  },
  writing_part1: {
    heading: "WRITING · PART 1",
    instruction:
      "Write a response to the task below. Stay inside the word range. You will receive AI feedback on Content, Communicative Achievement, Organisation, and Language.",
  },
  writing_part2: {
    heading: "WRITING · PART 2",
    instruction:
      "Choose the genre you prepared for, then respond to the task below. Stay inside the word range. You will receive AI feedback on Content, Communicative Achievement, Organisation, and Language.",
  },
};

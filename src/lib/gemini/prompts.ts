import type { Exam, PartId } from "@/lib/exercises/types";
import { schemaByPart } from "@/lib/gemini/schemas";
import {
  WRITING_GENRE_HINTS,
  WRITING_GENRE_LABEL,
  isWritingPart,
  writingAllowedGenres,
  writingExamSpec,
  writingWordTarget,
  type WritingGenre,
  type WritingPartId,
} from "@/lib/exercises/writing";

const ROLE =
  "You are an expert Cambridge English exam writer with 20+ years of experience creating high-validity KET, PET, FCE, CAE, and CPE materials.";

const TOPIC_POOL =
  "science, technology, arts, history, sport, psychology, environment, social issues, business, language and linguistics, literature, philosophy, food and culture, travel, education";

const exerciseTypeByPart: Record<PartId, string> = {
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

function calibration(exam: Exam) {
  switch (exam) {
    case "KET":
      return [
        "Target level is A2 Key (KET).",
        "Use everyday vocabulary, concrete topics, and short clear sentences.",
        "Avoid rare idioms, dense academic language, and long embedded clauses.",
      ].join("\n");
    case "PET":
      return [
        "Target level is B1 Preliminary (PET).",
        "Use familiar school, travel, work, hobbies, and community topics.",
        "Sentence complexity should be moderate, with mostly transparent distractors.",
      ].join("\n");
    case "FCE":
      return [
        "Target level is B2 First (FCE).",
        "Use B1-B2 vocabulary with some B2 collocation pressure.",
        "Register is clear magazine, school, work, or general-interest prose.",
      ].join("\n");
    case "CAE":
      return [
        "Target level is C1 Advanced (CAE).",
        "Vocabulary at the B2-C1 boundary with C1 distractor pressure.",
        "Register is intelligent magazine or popular-academic prose.",
        "Sentence complexity is moderate to high.",
      ].join("\n");
    case "CPE":
      return [
        "Target level is C2 Proficiency (CPE).",
        "Vocabulary at C1-C2 with idiomatic and academic registers.",
        "Complex syntax expected, including inversion and embedding.",
        "Register is formal essay, literary non-fiction, or broadsheet journalism.",
      ].join("\n");
  }
}

function keyWordLimit(exam: Exam) {
  switch (exam) {
    case "KET":
      return "2-4";
    case "PET":
    case "FCE":
      return "2-5";
    case "CAE":
      return "3-6";
    case "CPE":
      return "3-8";
  }
}

function readingWordTarget(exam: Exam) {
  switch (exam) {
    case "KET":
      return "280";
    case "PET":
      return "420";
    case "FCE":
      return "550";
    case "CAE":
      return "700";
    case "CPE":
      return "800";
  }
}

function exclusions(excludeTitles: string[], excludeTopics: string[]) {
  const titleList = excludeTitles.length ? JSON.stringify(excludeTitles) : "[]";
  const topicList = excludeTopics.length ? JSON.stringify(excludeTopics) : "[]";
  return `
You are generating a new exercise for this user.
AVOID these recent titles for this user: ${titleList}
AVOID these recent topics entirely: ${topicList}
Pick a topic the user has not encountered.
If you cannot avoid all topics, choose one semantically furthest from the list.
Rotate topics across this pool: ${TOPIC_POOL}
`;
}

const universalConstraints = `
Output MUST match the JSON contract exactly.
Every field whose contract says ARRAY must be a JSON array, never an object keyed by numbers.
Use only original text.
Do not use living real-person names.
Do not use copyrighted proper nouns.
Title must be concise and specific.
topic must be a canonical lowercase tag of 1-3 words.
When the exercise uses gaps, the passage text MUST contain the exact square-bracket placeholders [gap1], [gap2], and so on. Do not use parentheses, braces, underscores, blanks, or uppercase variants for gap placeholders.
For MC distractors: all options must be grammatically plausible, but only one must fit semantically and collocationally.
`;

const antiDetectionHardening = `
AUTHENTICITY REQUIREMENTS (anti-detection hardening):
The generated exercise must resist AI content detection tools. To achieve this:

1. AVOID AI-predictable text patterns:
- Do NOT start any paragraph with: "In recent years", "Throughout history", "In today's world", "It is widely acknowledged", "It goes without saying", "Needless to say", "Furthermore", "Moreover" as the first word.
- Do NOT use generic abstract topics: avoid "climate change", "social media", "artificial intelligence", "remote work" as the primary subject.
- Do NOT produce text with perfectly parallel sentence structures across more than two consecutive sentences.
- Do NOT end paragraphs with tidy summative statements.

2. ANCHOR in specificity:
- Include at least ONE specific proper noun: a place, a field-specific term, or a named historical period.
- Include at least ONE piece of numerical or statistical texture naturally.

3. REGISTER authenticity:
- Vary sentence length deliberately: include one short sentence (under 10 words) and complex multi-clause sentences.
- When the part has gaps, use at least one non-mainstream but authentic collocation per gap.
- Write with a specific perspective or slight bias, not neutral generic tone.

4. STRUCTURAL unpredictability:
- Do not structure the passage as introduction, main point, example, conclusion.
- Consider opening mid-argument or with a concrete scene.
- Vary paragraph lengths.

5. LEXICAL diversity:
- The first 5 content words of the passage must not include: significant, impact, challenge, issue, aspect, area, approach, development, factor, key.
- If a gap tests a common function word, surrounding context must remain unusual and specific.
`;

const writingConstraints = `
WRITING TASK RULES (you are generating the task brief, NOT the candidate's answer):
- The prompt must be a complete writing task brief, exactly as it would appear in the exam.
- Use plain text only. Do not use Markdown syntax such as **bold**, # headings, block quotes, or backticks.
- Also populate the optional structured fields where they fit: taskTitle, taskContext, taskPoints, finalInstruction, and picturePrompts.
- For email / letter / report / proposal tasks, include a short contextual scenario (1-2 sentences) and 2-4 bullet content points the candidate must address.
- For essay / discursive_essay tasks, include the proposition statement and 2-3 cues the candidate should weave in.
- For article / review tasks, include the publication / outlet context and the angle the candidate should take.
- For story tasks, include the opening sentence the candidate must continue, or the title to use.
- Do NOT write the model answer. Do NOT include sample wording the candidate would copy.
- Do NOT include gap placeholders.
- Set wordRange to the numeric min/max pair for validation. For A2 Key minimum-only tasks, use the official minimum with a generous maximum.
- title must be a short, scenario-appropriate label (e.g. "Festival volunteer brief", "Streaming-service review prompt"), not "Writing Part 2".
- topic is a lowercase 1-3 word tag.
- Only set sourceTexts for CPE Part 1 (discursive_essay). Provide exactly two short source texts (90-110 words each) representing different viewpoints the candidate must summarise. For all other writing tasks, omit sourceTexts.
`;

function writingTaskInstruction(exam: Exam, part: WritingPartId, genre: WritingGenre) {
  const spec = writingExamSpec(exam, part);
  const wordTarget = writingWordTarget(exam, part);
  const label = WRITING_GENRE_LABEL[genre];
  const hint = WRITING_GENRE_HINTS[genre];

  if (exam === "KET" && part === "writing_part1") {
    return [
      `Generate an A2 Key Reading and Writing Part 6 guided writing task (${wordTarget}).`,
      "The task must ask for a short email or note using simple everyday information.",
      "Provide taskContext, 3 short taskPoints, and finalInstruction.",
      spec.promptInstruction,
      hint,
    ].join("\n");
  }

  if (exam === "KET" && part === "writing_part2") {
    return [
      `Generate an A2 Key Reading and Writing Part 7 picture story task (${wordTarget}).`,
      "Provide exactly three picturePrompts as short scene descriptions instead of image files.",
      "The finalInstruction must tell the candidate to write a story using all three pictures.",
      spec.promptInstruction,
      hint,
    ].join("\n");
  }

  if (exam === "CPE" && part === "writing_part1" && genre === "discursive_essay") {
    return [
      `Generate a CPE Writing Part 1 discursive summary essay task brief (${wordTarget}).`,
      "Provide exactly two source texts (90-110 words each) that take different angles on the proposition.",
      "Prompt must instruct the candidate to summarise and evaluate the key points from both texts and add their own view.",
      hint,
    ].join("\n");
  }

  return [
    `Generate a ${exam} ${spec.examHeading} task brief asking for a ${label} of ${wordTarget}.`,
    `Official task shape: ${spec.taskTypes}.`,
    spec.promptInstruction,
    hint,
    "Output ONE complete task brief, not multiple options.",
  ].join("\n");
}

function partInstructions(part: PartId, exam: Exam, genre?: WritingGenre) {
  switch (part) {
    case "part1":
      return "Part 1 Multiple Choice Cloze: 8 gaps, each with 4 options, one correct answer per gap.";
    case "part2":
      return "Part 2 Open Cloze: 8 single-word grammar gaps (articles, prepositions, auxiliaries, pronouns).";
    case "part3":
      return "Part 3 Word Formation: 8 gaps, base words in uppercase, one derived form per gap. Include a lines array of exactly 8 items. Each line item must contain text with its exact [gapN] placeholder, the matching gapId, and the uppercase baseWord for line-by-line rendering.";
    case "part4":
      return `Part 4 Key Word Transformation: 6 items. Key word cannot change form. Word limit is ${keyWordLimit(
        exam,
      )} words including key word. Do not include gap placeholders in this part.`;
    case "part5":
      return `Part 5 Multiple Choice Reading: one complete un-gapped text of about ${readingWordTarget(
        exam,
      )} words and 6 questions with 4 options each. Do not include [gap1], [gap2], blanks, missing-word markers, or cloze placeholders anywhere in the text.`;
    case "part6":
      return "Part 6 Gapped Text: one text with 6 paragraph gaps, 7 candidate paragraphs (A-G), 1 distractor, and correct order.";
    case "part7":
      return "Part 7 Multiple Matching: 4-6 complete short texts and 10 prompts. Every prompt must map to exactly one text. Do not include [gap1], blanks, missing-word markers, or cloze placeholders anywhere in the texts.";
    case "writing_part1":
    case "writing_part2": {
      const resolvedGenre =
        genre ??
        writingExamSpec(exam, part).fixedGenre ??
        writingAllowedGenres(exam, part)[0];
      return writingTaskInstruction(exam, part, resolvedGenre);
    }
  }
}

export interface BuildPromptOptions {
  excludeTitles?: string[];
  excludeTopics?: string[];
  genre?: WritingGenre;
}

export function buildPrompt(exam: Exam, part: PartId, options: BuildPromptOptions = {}) {
  const { excludeTitles = [], excludeTopics = [], genre } = options;
  const requiredType = exerciseTypeByPart[part];
  const responseSchema = JSON.stringify(schemaByPart[part], null, 2);
  const writing = isWritingPart(part);

  return `${ROLE}

Exam level:
${calibration(exam)}

Task:
${partInstructions(part, exam, genre)}

Required discriminator values:
- type must be exactly "${requiredType}"
- exam must be exactly "${exam}"${
    writing && genre
      ? `\n- genre must be exactly "${genre}"`
      : ""
  }

JSON contract:
${responseSchema}

Do not output the JSON contract itself. Output one finished exercise object that satisfies it.

${universalConstraints}
${writing ? writingConstraints : ""}

${exclusions(excludeTitles, excludeTopics)}

${writing ? "" : antiDetectionHardening}

Return strict JSON only.`;
}

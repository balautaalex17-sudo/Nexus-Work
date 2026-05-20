import { chatJson } from "@/lib/gemini/client";
import type { Exercise } from "@/lib/exercises/types";

export interface VerifyItem {
  key: string;
  context: string;
  expected: string;
  userAnswer: string;
  extra?: string;
}

const SYSTEM_PROMPT = `You are a Cambridge English senior examiner marking Use of English answers on Cambridge-style mark schemes for A2 Key (KET), B1 Preliminary (PET), B2 First (FCE), C1 Advanced (CAE), and C2 Proficiency (CPE).

For each item, decide whether the user's answer would receive the mark on the official mark scheme.

Mark CORRECT only when ALL of the following are true:
- The answer is grammatically well-formed in the gap.
- It is the correct part of speech.
- It collocates naturally with the surrounding text.
- The resulting sentence carries the SAME meaning as the expected answer in context, OR a fully natural meaning that an examiner would unambiguously accept.
- For Open Cloze: exactly one word (a contraction such as "wouldn't" is two words and is not allowed).
- For Word Formation: the answer is derived from the given base word, even if spelling differs slightly from the expected answer.
- For Key Word Transformation: the rewrite uses the given key word unchanged, fits the word count, and preserves the original meaning precisely.

Accept obvious spelling tolerance only when an examiner would (very minor typos that do not change the word, e.g. capitalisation, British vs American spelling).

Mark INCORRECT when:
- Wrong part of speech, wrong tense, wrong form, wrong number, wrong agreement.
- Word does not collocate or is unnaturally used.
- Meaning is shifted, weakened, or different.
- Open Cloze with more than one word or contraction.
- Word Formation answer not derived from the base word.
- Key Word Transformation that changes the key word, exceeds the word count, or alters meaning.

Reply with strict JSON only:
{ "verdicts": { "<key>": true|false, ... } }`;

function aiGradeSignal() {
  const timeoutMs = Number(process.env.AI_GRADE_TIMEOUT_MS ?? "4500");
  return AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 4500);
}

export async function verifyAlternativeAnswers(
  items: VerifyItem[],
): Promise<Record<string, boolean>> {
  if (items.length === 0) return {};

  const itemBlock = items
    .map(
      (it) =>
        `- key: ${it.key}\n  context: ${JSON.stringify(it.context)}\n  expectedAnswer: ${JSON.stringify(it.expected)}\n  userAnswer: ${JSON.stringify(it.userAnswer)}${
          it.extra ? `\n  note: ${JSON.stringify(it.extra)}` : ""
        }`,
    )
    .join("\n");

  const prompt = `${SYSTEM_PROMPT}\n\nItems:\n${itemBlock}\n\nReturn strict JSON only.`;

  try {
    const parsed = await chatJson<{ verdicts?: Record<string, unknown> }>({
      prompt,
      temperature: 0.1,
      signal: aiGradeSignal(),
    });
    const verdicts = parsed.verdicts ?? {};
    const out: Record<string, boolean> = {};
    for (const item of items) {
      out[item.key] = verdicts[item.key] === true;
    }
    return out;
  } catch {
    return Object.fromEntries(items.map((i) => [i.key, false]));
  }
}

export function collectVerifyItems(
  exercise: Exercise,
  userAnswers: Record<string, string>,
  exactPerItem: Record<string, boolean>,
): VerifyItem[] {
  const items: VerifyItem[] = [];

  switch (exercise.type) {
    case "use_of_english_part2": {
      for (let i = 1; i <= 8; i += 1) {
        const key = `gap${i}`;
        if (exactPerItem[key]) continue;
        const user = String(userAnswers[key] ?? "").trim();
        if (!user) continue;
        const expected = exercise.correctAnswers[key as keyof typeof exercise.correctAnswers];
        items.push({
          key,
          context: `Open Cloze passage with gap ${key}:\n\n${exercise.text}`,
          expected,
          userAnswer: user,
        });
      }
      break;
    }
    case "use_of_english_part3": {
      for (let i = 1; i <= 8; i += 1) {
        const key = `gap${i}`;
        if (exactPerItem[key]) continue;
        const user = String(userAnswers[key] ?? "").trim();
        if (!user) continue;
        const expected = exercise.correctAnswers[key as keyof typeof exercise.correctAnswers];
        const base = exercise.baseWords[key as keyof typeof exercise.baseWords];
        items.push({
          key,
          context: `Word Formation passage with gap ${key} (base word: ${base}):\n\n${exercise.text}`,
          expected,
          userAnswer: user,
          extra: `Base word: ${base}`,
        });
      }
      break;
    }
    case "use_of_english_part4": {
      exercise.items.forEach((item, index) => {
        const key = `item${index + 1}`;
        if (exactPerItem[key]) return;
        const user = String(userAnswers[key] ?? "").trim();
        if (!user) return;
        items.push({
          key,
          context: `Original sentence: ${item.originalSentence}\nRewrite using key word: ${item.keyWord} (unchanged)\nWord limit: ${item.wordLimit[0]}-${item.wordLimit[1]} words including the key word.\nRewrite frame: "${item.startFragment} _____ ${item.endFragment}"`,
          expected: item.correctAnswer,
          userAnswer: user,
        });
      });
      break;
    }
  }

  return items;
}

export function applyAcceptedAnswers(
  perItem: Record<string, boolean>,
  accepted: Record<string, boolean>,
): Record<string, boolean> {
  const next = { ...perItem };
  for (const key of Object.keys(accepted)) {
    if (accepted[key]) next[key] = true;
  }
  return next;
}

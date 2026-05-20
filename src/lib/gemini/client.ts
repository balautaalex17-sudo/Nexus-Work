export const MODEL_NAME = "google/gemini-2.5-flash";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatRequest {
  prompt: string;
  model?: string;
  json?: boolean;
  temperature?: number;
  topP?: number;
  signal?: AbortSignal;
}

export class OpenRouterError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export async function chatCompletion({
  prompt,
  model = process.env.OPENROUTER_MODEL ?? MODEL_NAME,
  json = false,
  temperature,
  topP,
  signal,
}: ChatRequest): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY is not configured.");
  }

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
  };
  if (json) body.response_format = { type: "json_object" };
  if (temperature !== undefined) body.temperature = temperature;
  if (topP !== undefined) body.top_p = topP;

  const referer = process.env.OPENROUTER_REFERER ?? "http://localhost:3000";

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "Nexus Work",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new OpenRouterError(
      `OpenRouter ${response.status}: ${errorBody.slice(0, 500)}`,
      response.status,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || text.length === 0) {
    throw new OpenRouterError("OpenRouter returned no content.");
  }
  return text;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  return trimmed;
}

export async function chatJson<T = unknown>(request: ChatRequest): Promise<T> {
  const text = await chatCompletion({ ...request, json: true });
  return JSON.parse(stripJsonFence(text)) as T;
}

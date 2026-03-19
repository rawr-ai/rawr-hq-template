import Anthropic from "@anthropic-ai/sdk";
import type { TokenUsage } from "./types.js";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

// Sonnet pricing: $3/MTok input, $15/MTok output
const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

// Cumulative usage tracking
let cumulativeUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

export function getCumulativeUsage(): TokenUsage & { cost: number } {
  return {
    ...cumulativeUsage,
    cost: computeCost(cumulativeUsage),
  };
}

export function computeCost(usage: TokenUsage): number {
  return (
    usage.inputTokens * INPUT_COST_PER_TOKEN +
    usage.outputTokens * OUTPUT_COST_PER_TOKEN
  );
}

function stripMarkdownFences(text: string): string {
  const match = text.match(/^\s*```(?:json|jsonc)?\s*\n?([\s\S]*?)\n?\s*```\s*$/);
  if (match) {
    return match[1]!;
  }
  return text;
}

export async function callLLM(
  system: string,
  userMessage: string
): Promise<{ text: string; usage: TokenUsage }> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const usage: TokenUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  cumulativeUsage.inputTokens += usage.inputTokens;
  cumulativeUsage.outputTokens += usage.outputTokens;

  return { text, usage };
}

export async function callLLMJSON<T>(
  system: string,
  userMessage: string
): Promise<{ data: T; usage: TokenUsage }> {
  const { text, usage } = await callLLM(system, userMessage);

  const stripped = stripMarkdownFences(text);
  try {
    const data = JSON.parse(stripped) as T;
    return { data, usage };
  } catch {
    // Retry once with a nudge
    console.log("  [llm] JSON parse failed, retrying with nudge...");
    const retry = await callLLM(
      system,
      userMessage +
        "\n\nIMPORTANT: Your previous response was not valid JSON. Respond with ONLY a valid JSON object. No markdown fences, no explanation, just the JSON."
    );

    const retryStripped = stripMarkdownFences(retry.text);
    const totalUsage: TokenUsage = {
      inputTokens: usage.inputTokens + retry.usage.inputTokens,
      outputTokens: usage.outputTokens + retry.usage.outputTokens,
    };

    try {
      const data = JSON.parse(retryStripped) as T;
      return { data, usage: totalUsage };
    } catch {
      throw new Error(
        `LLM returned invalid JSON after retry.\nRaw response:\n${retry.text}`
      );
    }
  }
}

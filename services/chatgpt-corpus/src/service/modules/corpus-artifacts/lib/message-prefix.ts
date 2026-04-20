import type { JsonConversationMessage } from "../../source-materials/entities";

function normalizeMessageText(text: string): string {
  return text
    .replace(/Thought for \d+[smh](?: \d+[smh])?/g, " ")
    .replace(/Called tool/g, " ")
    .replace(/Received app response/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function sharedPrefix(
  left: JsonConversationMessage[],
  right: JsonConversationMessage[],
  fuzzy = false,
): number {
  let count = 0;
  const max = Math.min(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftMessage = left[index]!;
    const rightMessage = right[index]!;
    const same = fuzzy
      ? leftMessage.role === rightMessage.role &&
        normalizeMessageText(leftMessage.say) === normalizeMessageText(rightMessage.say)
      : leftMessage.role === rightMessage.role && leftMessage.say === rightMessage.say;
    if (!same) break;
    count += 1;
  }
  return count;
}

export function confidenceForEdge(input: {
  exactPrefixLen: number;
  fuzzyPrefixLen: number;
  childLen: number;
  parentLen: number;
  sameTitle: boolean;
  sameLink: boolean;
  sameFirstPrompt: boolean;
  exactDuplicate: boolean;
}): number {
  if (input.exactDuplicate) return 1;
  const ratio = input.exactPrefixLen / Math.max(1, Math.min(input.childLen, input.parentLen));
  let confidence = 0.4 + ratio * 0.35;
  if (input.fuzzyPrefixLen >= input.exactPrefixLen) confidence += 0.08;
  if (input.sameTitle) confidence += 0.1;
  if (input.sameLink) confidence += 0.1;
  if (input.sameFirstPrompt) confidence += 0.12;
  return Number(Math.min(0.99, confidence).toFixed(2));
}

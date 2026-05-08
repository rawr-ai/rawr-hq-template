import type { SessionSourceRuntime } from "../../../common/ports/session-source-runtime";
import type { SessionFacetFilters, SessionFacets } from "../entities";

type JsonRecord = Record<string, unknown>;

type ScanState = {
  xmlBlockTags: Set<string>;
  directives: Set<string>;
};

type StackEntry = {
  tag: string;
  hidden: boolean;
};

const hiddenScaffoldingTags = new Set([
  "environment_context",
  "permissions_instructions",
  "user_instructions",
]);

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" ? value as JsonRecord : null;
}

export function normalizeFacetToken(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function addNormalized(target: Set<string>, input: unknown): void {
  if (typeof input !== "string") return;
  const normalized = normalizeFacetToken(input);
  if (normalized) target.add(normalized);
}

function extractMessageTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");

  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      parts.push(item);
      continue;
    }
    const data = asRecord(item);
    const type = data?.type;
    if (data && (type === "input_text" || type === "output_text" || type === "text")) {
      parts.push(String(data.text ?? ""));
    }
  }
  return parts.join("\n");
}

function hasHiddenAncestor(stack: StackEntry[]): boolean {
  return stack.some((entry) => entry.hidden);
}

function scanTextForMarkers(text: string, state: ScanState): void {
  if (!text) return;

  const stack: StackEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const open = /^<([a-zA-Z0-9][a-zA-Z0-9_\- ]*)>$/.exec(line);
    if (open) {
      const tag = normalizeFacetToken(open[1]!);
      stack.push({
        tag,
        hidden: hiddenScaffoldingTags.has(tag) || hasHiddenAncestor(stack),
      });
      continue;
    }

    const close = /^<\/([a-zA-Z0-9][a-zA-Z0-9_\- ]*)>$/.exec(line);
    if (close) {
      const tag = normalizeFacetToken(close[1]!);
      const current = stack.at(-1);
      if (current?.tag === tag) {
        stack.pop();
        if (!current.hidden) state.xmlBlockTags.add(tag);
      }
      continue;
    }

    if (hasHiddenAncestor(stack)) continue;

    const directive = /^::([a-zA-Z0-9_-]+)\{/.exec(line);
    if (directive) addNormalized(state.directives, directive[1]);
  }
}

export async function extractSessionFacets(
  runtime: SessionSourceRuntime,
  filePath: string,
): Promise<SessionFacets> {
  const xmlBlockTags = new Set<string>();
  const directives = new Set<string>();
  const toolCalls = new Set<string>();
  const topLevelTypes = new Set<string>();
  const payloadTypes = new Set<string>();
  const scanState: ScanState = { xmlBlockTags, directives };

  for await (const obj of runtime.readJsonlObjects({ path: filePath })) {
    const data = asRecord(obj);
    if (!data) continue;

    const topLevelType = data.type;
    addNormalized(topLevelTypes, topLevelType);

    const payload = asRecord(data.payload);
    const payloadType = payload?.type;
    addNormalized(payloadTypes, payloadType);

    if (payload && (payloadType === "function_call" || payloadType === "custom_tool_call")) {
      addNormalized(toolCalls, payload.name);
    }

    if (payload && payloadType === "message") {
      const text = extractMessageTextContent(payload.content).trim();
      if (text) scanTextForMarkers(text, scanState);
    }

    if (topLevelType === "event_msg" && payload) {
      if (typeof payload.message === "string") scanTextForMarkers(payload.message, scanState);
      if (typeof payload.text === "string") scanTextForMarkers(payload.text, scanState);
      continue;
    }

    if (topLevelType === "user" || topLevelType === "assistant" || topLevelType === "tool") {
      const message = asRecord(data.message);
      const text = extractMessageTextContent(message?.content).trim();
      if (text) scanTextForMarkers(text, scanState);
    }
  }

  const sorted = (set: Set<string>) => [...set].sort();
  return {
    xmlBlockTags: sorted(xmlBlockTags),
    directives: sorted(directives),
    toolCalls: sorted(toolCalls),
    topLevelTypes: sorted(topLevelTypes),
    payloadTypes: sorted(payloadTypes),
  };
}

export function normalizeFacetFilters(filters?: SessionFacetFilters): SessionFacetFilters {
  const normalizeList = (values?: string[]) => {
    const normalized = [...new Set((values ?? []).map(normalizeFacetToken).filter(Boolean))].sort();
    return normalized.length ? normalized : undefined;
  };

  return {
    tags: normalizeList(filters?.tags),
    directives: normalizeList(filters?.directives),
    tools: normalizeList(filters?.tools),
    payloadTypes: normalizeList(filters?.payloadTypes),
    topTypes: normalizeList(filters?.topTypes),
  };
}

export function facetFiltersHaveValues(filters?: SessionFacetFilters): boolean {
  const normalized = normalizeFacetFilters(filters);
  return Boolean(
    normalized.tags?.length ||
      normalized.directives?.length ||
      normalized.tools?.length ||
      normalized.payloadTypes?.length ||
      normalized.topTypes?.length,
  );
}

export function facetsMatchAll(facets: SessionFacets, filters?: SessionFacetFilters): boolean {
  const normalized = normalizeFacetFilters(filters);
  const containsAll = (actual: string[], expected?: string[]) => !expected?.length || expected.every((value) => actual.includes(value));

  return (
    containsAll(facets.xmlBlockTags, normalized.tags) &&
    containsAll(facets.directives, normalized.directives) &&
    containsAll(facets.toolCalls, normalized.tools) &&
    containsAll(facets.payloadTypes, normalized.payloadTypes) &&
    containsAll(facets.topLevelTypes, normalized.topTypes)
  );
}

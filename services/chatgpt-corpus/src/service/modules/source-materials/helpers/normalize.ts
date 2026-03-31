import { Value } from "typebox/value";
import { CorpusWorkspaceError } from "../../../shared/errors";
import type { RawSourceMaterials, WorkspaceTextEntry } from "../../../../orpc/ports/workspace-store";
import type {
  JsonConversationSourceRecord,
  MarkdownDocumentSourceRecord,
  RawConversationExport,
  SourceRecord,
  SourceSnapshot,
} from "../schemas";
import { RawConversationExportSchema } from "../schemas";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function filenameStem(relativePath: string): string {
  const filename = relativePath.split("/").at(-1) ?? relativePath;
  return filename.endsWith(".json") || filename.endsWith(".md")
    ? filename.slice(0, filename.lastIndexOf("."))
    : filename;
}

function branchDepthFromTitle(title: string): number {
  return (title.match(/Branch \u00b7/g) ?? []).length;
}

function normalizeTitle(title: string): string {
  return title.replace(/^(Branch \u00b7\s*)+/, "").trim();
}

function shortSummary(text: string, limit = 180): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed.length <= limit ? collapsed : `${collapsed.slice(0, limit - 3)}...`;
}

function textSizeBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

async function sha256Hex(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable in this runtime.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildSourceId(prefix: "json" | "md", relativePath: string, hash: string): string {
  return `src-${prefix}-${slugify(relativePath)}-${hash.slice(0, 12)}`;
}

function parseConversationExport(source: WorkspaceTextEntry): RawConversationExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source.contents) as unknown;
  } catch (error) {
    throw new CorpusWorkspaceError(
      "INVALID_CONVERSATION_JSON",
      source.relativePath,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (Value.Check(RawConversationExportSchema, parsed)) {
    return parsed;
  }

  const [issue] = [...Value.Errors(RawConversationExportSchema, parsed)];
  throw new CorpusWorkspaceError(
    "INVALID_CONVERSATION_EXPORT",
    source.relativePath,
    issue?.message ?? "Conversation export does not match the expected shape.",
  );
}

async function createConversationRecord(source: WorkspaceTextEntry): Promise<JsonConversationSourceRecord> {
  const parsed = parseConversationExport(source);
  const metadata = parsed.metadata ?? {};
  const title = typeof metadata.title === "string" && metadata.title.trim() !== ""
    ? metadata.title
    : filenameStem(source.relativePath);
  const firstPrompt = parsed.messages.find((message) => message.role === "Prompt")?.say ?? "";
  const lastResponse = [...parsed.messages].reverse().find((message) => message.role === "Response")?.say ?? "";
  const dates = metadata.dates ?? {};
  const normalizedContents = normalizeLineEndings(source.contents);
  const hash = await sha256Hex(normalizedContents);

  return {
    sourceId: buildSourceId("json", source.relativePath, hash),
    relativePath: source.relativePath,
    type: "json_conversation",
    hash,
    sizeBytes: textSizeBytes(source.contents),
    title,
    summary: shortSummary(firstPrompt || lastResponse || title),
    created: typeof dates.created === "string" ? dates.created : undefined,
    updated: typeof dates.updated === "string" ? dates.updated : undefined,
    exported: typeof dates.exported === "string" ? dates.exported : undefined,
    link: typeof metadata.link === "string" ? metadata.link : undefined,
    messages: parsed.messages,
    messagesHash: await sha256Hex(JSON.stringify(parsed.messages)),
    normalizedTitle: normalizeTitle(title),
    branchDepth: branchDepthFromTitle(title),
  };
}

async function createDocumentRecord(source: WorkspaceTextEntry): Promise<MarkdownDocumentSourceRecord> {
  const normalizedContents = normalizeLineEndings(source.contents);
  const lines = normalizedContents.split("\n");
  const title = filenameStem(source.relativePath);
  const hash = await sha256Hex(normalizedContents);

  return {
    sourceId: buildSourceId("md", source.relativePath, hash),
    relativePath: source.relativePath,
    type: "markdown_document",
    hash,
    sizeBytes: textSizeBytes(source.contents),
    title,
    summary: shortSummary(
      lines
        .slice(0, 10)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ") || title,
    ),
    lineCount: lines.length,
    headings: lines
      .filter((line) => line.startsWith("#"))
      .map((line) => line.replace(/^#+\s*/, ""))
      .slice(0, 8),
    branchDepth: 0,
  };
}

export async function buildSourceSnapshot(workspaceRef: string, materials: RawSourceMaterials): Promise<SourceSnapshot> {
  const conversationRecords = await Promise.all(
    [...materials.conversations]
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
      .map(createConversationRecord),
  );
  const documentRecords = await Promise.all(
    [...materials.documents]
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
      .map(createDocumentRecord),
  );
  const records: SourceRecord[] = [...conversationRecords, ...documentRecords].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );

  return {
    workspaceRef,
    records,
    jsonRecords: conversationRecords,
    markdownDocCount: documentRecords.length,
  };
}

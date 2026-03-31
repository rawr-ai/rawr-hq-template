import { CorpusWorkspaceError } from "../../../shared/errors";
import type { RawSourceMaterials, WorkspaceTextEntry } from "../../../shared/workspace-store";
import type {
  JsonConversationMessage,
  SourceRecord,
  SourceSnapshot,
} from "../schemas";

type ConversationExport = {
  metadata?: {
    title?: string;
    link?: string;
    dates?: {
      created?: string;
      updated?: string;
      exported?: string;
    };
  };
  messages?: unknown;
};

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

function hashText(text: string): string {
  let hash = 0x811c9dc5;
  const data = new TextEncoder().encode(text);
  for (const byte of data) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function parseConversationExport(source: WorkspaceTextEntry): ConversationExport {
  try {
    return JSON.parse(source.contents) as ConversationExport;
  } catch (error) {
    throw new CorpusWorkspaceError(
      "INVALID_CONVERSATION_JSON",
      source.relativePath,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function assertConversationMessageArray(value: unknown, sourcePath: string): JsonConversationMessage[] {
  if (!Array.isArray(value)) {
    throw new CorpusWorkspaceError(
      "INVALID_CONVERSATION_EXPORT",
      sourcePath,
      "`messages` must be an array",
    );
  }

  return value.map((message, index) => {
    if (!message || typeof message !== "object") {
      throw new CorpusWorkspaceError(
        "INVALID_CONVERSATION_EXPORT",
        sourcePath,
        `message ${index} must be an object`,
      );
    }

    const role = (message as Record<string, unknown>).role;
    const say = (message as Record<string, unknown>).say;
    if (typeof role !== "string" || role.trim() === "") {
      throw new CorpusWorkspaceError(
        "INVALID_CONVERSATION_EXPORT",
        sourcePath,
        `message ${index} must include a string role`,
      );
    }
    if (typeof say !== "string") {
      throw new CorpusWorkspaceError(
        "INVALID_CONVERSATION_EXPORT",
        sourcePath,
        `message ${index} must include a string say payload`,
      );
    }

    return { role, say };
  });
}

function createConversationRecord(source: WorkspaceTextEntry): SourceRecord {
  const parsed = parseConversationExport(source);
  const messages = assertConversationMessageArray(parsed.messages, source.relativePath);
  const metadata = parsed.metadata ?? {};
  const title = typeof metadata.title === "string" && metadata.title.trim() !== ""
    ? metadata.title
    : filenameStem(source.relativePath);
  const firstPrompt = messages.find((message) => message.role === "Prompt")?.say ?? "";
  const lastResponse = [...messages].reverse().find((message) => message.role === "Response")?.say ?? "";
  const dates = metadata.dates ?? {};
  const normalizedContents = normalizeLineEndings(source.contents);

  return {
    sourceId: `src-json-${slugify(filenameStem(source.relativePath))}`,
    relativePath: source.relativePath,
    type: "json_conversation",
    hash: hashText(normalizedContents),
    sizeBytes: textSizeBytes(source.contents),
    title,
    summary: shortSummary(firstPrompt || lastResponse || title),
    created: typeof dates.created === "string" ? dates.created : undefined,
    updated: typeof dates.updated === "string" ? dates.updated : undefined,
    exported: typeof dates.exported === "string" ? dates.exported : undefined,
    link: typeof metadata.link === "string" ? metadata.link : undefined,
    messages,
    messagesHash: hashText(JSON.stringify(messages)),
    normalizedTitle: normalizeTitle(title),
    branchDepth: branchDepthFromTitle(title),
  };
}

function createDocumentRecord(source: WorkspaceTextEntry): SourceRecord {
  const lines = normalizeLineEndings(source.contents).split("\n");
  const title = filenameStem(source.relativePath);
  return {
    sourceId: `src-md-${slugify(title)}`,
    relativePath: source.relativePath,
    type: "markdown_document",
    hash: hashText(normalizeLineEndings(source.contents)),
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

export function buildSourceSnapshot(workspaceRef: string, materials: RawSourceMaterials): SourceSnapshot {
  const conversationRecords = materials.conversations
    .slice()
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    .map(createConversationRecord);
  const documentRecords = materials.documents
    .slice()
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    .map(createDocumentRecord);
  const records = [...conversationRecords, ...documentRecords].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );

  return {
    workspaceRef,
    records,
    jsonRecords: conversationRecords,
    markdownDocCount: documentRecords.length,
  };
}

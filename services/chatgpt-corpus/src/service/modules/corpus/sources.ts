import { createHash } from "node:crypto";
import path from "node:path";
import { CorpusWorkspaceError } from "../../shared/errors";
import type { ConversationExport, CorpusWorkspacePaths, JsonConversationMessage, SourceRecord } from "./types";
import type { createRepository } from "./repository";

type CorpusRepository = ReturnType<typeof createRepository>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function shortSummary(text: string, limit = 180): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed.length <= limit ? collapsed : `${collapsed.slice(0, limit - 3)}...`;
}

function branchDepthFromTitle(title: string): number {
  return (title.match(/Branch ·/g) ?? []).length;
}

function normalizeTitle(title: string): string {
  return title.replace(/^(Branch ·\s*)+/, "").trim();
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

async function readConversationExport(repo: CorpusRepository, sourcePath: string): Promise<ConversationExport> {
  const raw = await repo.readText(sourcePath);
  try {
    return JSON.parse(raw) as ConversationExport;
  } catch (error) {
    throw new CorpusWorkspaceError(
      "INVALID_CONVERSATION_JSON",
      sourcePath,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function fileSha256(repo: CorpusRepository, filePath: string): Promise<string> {
  const contents = await repo.readBytes(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

export async function loadSources(
  repo: CorpusRepository,
  paths: CorpusWorkspacePaths,
): Promise<SourceRecord[]> {
  const records: SourceRecord[] = [];
  const jsonPaths = await repo.listFiles(paths.sourceJsonDir, ".json");
  const markdownPaths = await repo.listFiles(paths.sourceDocsDir, ".md");

  for (const jsonPath of jsonPaths) {
    const parsed = await readConversationExport(repo, jsonPath);
    const messages = assertConversationMessageArray(parsed.messages, jsonPath);
    const metadata = parsed.metadata ?? {};
    const title = typeof metadata.title === "string" && metadata.title.trim() !== ""
      ? metadata.title
      : path.parse(jsonPath).name;
    const firstPrompt = messages.find((message) => message.role === "Prompt")?.say ?? "";
    const lastResponse = [...messages].reverse().find((message) => message.role === "Response")?.say ?? "";
    const dates = metadata.dates ?? {};
    const stats = await repo.stat(jsonPath);

    records.push({
      sourceId: `src-json-${slugify(path.parse(jsonPath).name)}`,
      path: jsonPath,
      type: "json_conversation",
      hash: await fileSha256(repo, jsonPath),
      sizeBytes: stats.size,
      title,
      summary: shortSummary(firstPrompt || lastResponse || title),
      created: typeof dates.created === "string" ? dates.created : undefined,
      updated: typeof dates.updated === "string" ? dates.updated : undefined,
      exported: typeof dates.exported === "string" ? dates.exported : undefined,
      link: typeof metadata.link === "string" ? metadata.link : undefined,
      messages,
      messagesHash: sha256Text(JSON.stringify(messages)),
      normalizedTitle: normalizeTitle(title),
      branchDepth: branchDepthFromTitle(title),
    });
  }

  for (const markdownPath of markdownPaths) {
    const text = await repo.readText(markdownPath);
    const lines = text.split(/\r?\n/);
    const stats = await repo.stat(markdownPath);

    records.push({
      sourceId: `src-md-${slugify(path.parse(markdownPath).name)}`,
      path: markdownPath,
      type: "markdown_document",
      hash: await fileSha256(repo, markdownPath),
      sizeBytes: stats.size,
      title: path.parse(markdownPath).name,
      summary: shortSummary(lines.slice(0, 10).map((line) => line.trim()).filter(Boolean).join(" ") || path.parse(markdownPath).name),
      lineCount: lines.length,
      headings: lines.filter((line) => line.startsWith("#")).map((line) => line.replace(/^#+\s*/, "")).slice(0, 8),
      branchDepth: 0,
    });
  }

  return records;
}

export function buildInventory(records: SourceRecord[]): Array<Record<string, unknown>> {
  return records.map((record) => {
    const base: Record<string, unknown> = {
      source_id: record.sourceId,
      type: record.type,
      path: path.resolve(record.path),
      filename: path.basename(record.path),
      hash_sha256: record.hash,
      size_bytes: record.sizeBytes,
      title: record.title,
      summary: record.summary,
    };

    if (record.type === "json_conversation") {
      return {
        ...base,
        normalized_title: record.normalizedTitle,
        branch_depth: record.branchDepth,
        message_count: record.messages?.length ?? 0,
        messages_hash: record.messagesHash,
        created: record.created,
        updated: record.updated,
        exported: record.exported,
        link: record.link,
        first_prompt: record.messages?.find((message) => message.role === "Prompt")?.say ?? "",
        last_response: [...(record.messages ?? [])].reverse().find((message) => message.role === "Response")?.say ?? "",
      };
    }

    return {
      ...base,
      line_count: record.lineCount,
      headings: record.headings ?? [],
    };
  });
}

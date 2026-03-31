import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { CorpusWorkspaceError } from "../../shared/errors";
import type {
  ConversationExport,
  CorpusWorkspacePaths,
  InitWorkspaceResult,
  JsonConversationMessage,
  LoadedWorkspaceInputs,
  SourceRecord,
  StagedCorpusArtifacts,
} from "./schemas";

const WORKSPACE_README = `# ChatGPT Corpus Workspace

This workspace holds a small, disposable corpus derived from exported ChatGPT
conversation JSON files.

Inputs:
- \`source-material/conversations/raw-json/*.json\`
- \`work/docs/source/*.md\` (optional hand-curated source docs)

Generated outputs:
- \`work/generated/corpus/inventory.json\`
- \`work/generated/corpus/family-graphs.json\`
- \`work/generated/corpus/intermediate-graph.json\`
- \`work/generated/corpus/corpus-manifest.json\`
- \`work/generated/corpus/normalized-threads/*.json\`
- \`work/generated/reports/anomalies.json\`
- \`work/generated/reports/ambiguity-flags.json\`
- \`work/generated/reports/canonicality-summary.md\`
- \`work/generated/reports/decision-log.md\`
- \`work/generated/reports/mental-map.md\`
- \`work/generated/reports/validation-report.json\`

Working rule:
- keep raw exports and generated outputs in this workspace
- use \`rawr corpus init\` and \`rawr corpus consolidate\` as the canonical tooling
`;

const WORKSPACE_GITIGNORE = `__pycache__/
source-material/conversations/raw-json/*
!source-material/conversations/raw-json/.gitkeep
work/docs/source/*
!work/docs/source/.gitkeep
work/generated/
work/README.md
`;

function normalizeWorkspaceRoot(workspaceRoot: string): string {
  return path.resolve(workspaceRoot);
}

function getWorkspacePaths(workspaceRoot: string): CorpusWorkspacePaths {
  const root = normalizeWorkspaceRoot(workspaceRoot);
  const workDir = path.join(root, "work");
  const generatedDir = path.join(workDir, "generated");
  const corpusDir = path.join(generatedDir, "corpus");
  return {
    workspaceRoot: root,
    sourceJsonDir: path.join(root, "source-material", "conversations", "raw-json"),
    workDir,
    sourceDocsDir: path.join(workDir, "docs", "source"),
    generatedDir,
    corpusDir,
    reportsDir: path.join(generatedDir, "reports"),
    normalizedDir: path.join(corpusDir, "normalized-threads"),
    readmePath: path.join(workDir, "README.md"),
    gitignorePath: path.join(root, ".gitignore"),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function fileSha256(filePath: string): Promise<string> {
  const contents = await fs.readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
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

async function ensureDirectory(dirPath: string): Promise<"created" | "existing"> {
  try {
    await fs.mkdir(dirPath, { recursive: false });
    return "created";
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      await fs.mkdir(dirPath, { recursive: true });
      return "created";
    }
    if (err.code === "EEXIST") {
      return "existing";
    }
    throw error;
  }
}

async function writeFileIfChanged(filePath: string, contents: string): Promise<"created" | "existing"> {
  try {
    const existing = await fs.readFile(filePath, "utf8");
    if (existing === contents) {
      return "existing";
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw error;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
  return "created";
}

async function listFiles(dirPath: string, extension: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => path.join(dirPath, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
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

async function readConversationExport(sourcePath: string): Promise<ConversationExport> {
  const raw = await fs.readFile(sourcePath, "utf8");
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

async function loadSourceRecords(paths: CorpusWorkspacePaths): Promise<SourceRecord[]> {
  const records: SourceRecord[] = [];
  const jsonPaths = await listFiles(paths.sourceJsonDir, ".json");
  const markdownPaths = await listFiles(paths.sourceDocsDir, ".md");

  for (const jsonPath of jsonPaths) {
    const parsed = await readConversationExport(jsonPath);
    const messages = assertConversationMessageArray(parsed.messages, jsonPath);
    const metadata = parsed.metadata ?? {};
    const title = typeof metadata.title === "string" && metadata.title.trim() !== ""
      ? metadata.title
      : path.parse(jsonPath).name;
    const firstPrompt = messages.find((message) => message.role === "Prompt")?.say ?? "";
    const lastResponse = [...messages].reverse().find((message) => message.role === "Response")?.say ?? "";
    const dates = metadata.dates ?? {};
    records.push({
      sourceId: `src-json-${slugify(path.parse(jsonPath).name)}`,
      path: jsonPath,
      type: "json_conversation",
      hash: await fileSha256(jsonPath),
      sizeBytes: (await fs.stat(jsonPath)).size,
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
    const text = await fs.readFile(markdownPath, "utf8");
    const lines = text.split(/\r?\n/);
    records.push({
      sourceId: `src-md-${slugify(path.parse(markdownPath).name)}`,
      path: markdownPath,
      type: "markdown_document",
      hash: await fileSha256(markdownPath),
      sizeBytes: (await fs.stat(markdownPath)).size,
      title: path.parse(markdownPath).name,
      summary: shortSummary(lines.slice(0, 10).map((line) => line.trim()).filter(Boolean).join(" ") || path.parse(markdownPath).name),
      lineCount: lines.length,
      headings: lines.filter((line) => line.startsWith("#")).map((line) => line.replace(/^#+\s*/, "")).slice(0, 8),
      branchDepth: 0,
    });
  }

  return records;
}

export function createRepository() {
  return {
    async initWorkspace(workspaceRoot: string): Promise<InitWorkspaceResult> {
      const paths = getWorkspacePaths(workspaceRoot);
      const createdPaths: string[] = [];
      const existingPaths: string[] = [];

      const trackDirectory = async (dirPath: string) => {
        const status = await ensureDirectory(dirPath);
        if (status === "created") createdPaths.push(dirPath);
        else existingPaths.push(dirPath);
      };

      const trackFile = async (filePath: string, contents: string) => {
        const status = await writeFileIfChanged(filePath, `${contents.trimEnd()}\n`);
        if (status === "created") createdPaths.push(filePath);
        else existingPaths.push(filePath);
      };

      await trackDirectory(paths.workspaceRoot);
      await trackDirectory(paths.sourceJsonDir);
      await trackDirectory(paths.sourceDocsDir);
      await trackFile(paths.readmePath, WORKSPACE_README);
      await trackFile(paths.gitignorePath, WORKSPACE_GITIGNORE);

      return {
        workspaceRoot: paths.workspaceRoot,
        createdPaths: [...new Set(createdPaths)],
        existingPaths: [...new Set(existingPaths)],
        files: {
          readmePath: paths.readmePath,
          gitignorePath: paths.gitignorePath,
        },
      };
    },

    async loadWorkspaceInputs(workspaceRoot: string): Promise<LoadedWorkspaceInputs> {
      const paths = getWorkspacePaths(workspaceRoot);
      const records = await loadSourceRecords(paths);
      const jsonRecords = records.filter((record): record is SourceRecord & { type: "json_conversation"; messages: JsonConversationMessage[] } =>
        record.type === "json_conversation" && Array.isArray(record.messages),
      );
      const markdownDocCount = records.filter((record) => record.type === "markdown_document").length;

      return {
        workspaceRoot: paths.workspaceRoot,
        paths,
        records,
        jsonRecords,
        markdownDocCount,
      };
    },

    async writeCorpusArtifacts(workspaceRoot: string, stagedArtifacts: StagedCorpusArtifacts): Promise<void> {
      const paths = getWorkspacePaths(workspaceRoot);
      if (paths.workspaceRoot !== stagedArtifacts.paths.workspaceRoot) {
        throw new Error("Workspace root mismatch while writing corpus artifacts");
      }

      await fs.mkdir(paths.normalizedDir, { recursive: true });
      await fs.mkdir(paths.reportsDir, { recursive: true });

      const writeJson = async (filePath: string, payload: unknown) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      };

      const writeMarkdown = async (filePath: string, text: string) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, `${text.trimEnd()}\n`, "utf8");
      };

      await Promise.all([
        writeJson(path.join(paths.corpusDir, "inventory.json"), stagedArtifacts.inventory),
        writeJson(path.join(paths.corpusDir, "family-graphs.json"), stagedArtifacts.familyGraphs),
        writeJson(path.join(paths.corpusDir, "intermediate-graph.json"), stagedArtifacts.intermediateGraph),
        writeJson(path.join(paths.corpusDir, "corpus-manifest.json"), stagedArtifacts.manifest),
        writeJson(path.join(paths.reportsDir, "anomalies.json"), stagedArtifacts.anomalies),
        writeJson(path.join(paths.reportsDir, "ambiguity-flags.json"), stagedArtifacts.ambiguityFlags),
        writeJson(path.join(paths.reportsDir, "validation-report.json"), stagedArtifacts.validationReport),
        ...stagedArtifacts.normalizedThreads.map((thread) =>
          writeJson(path.join(paths.normalizedDir, `${String(thread.thread_id)}.json`), thread),
        ),
        writeMarkdown(path.join(paths.reportsDir, "canonicality-summary.md"), stagedArtifacts.canonicalitySummary),
        writeMarkdown(path.join(paths.reportsDir, "decision-log.md"), stagedArtifacts.decisionLog),
        writeMarkdown(path.join(paths.reportsDir, "mental-map.md"), stagedArtifacts.mentalMap),
        writeMarkdown(paths.readmePath, WORKSPACE_README),
      ]);
    },
  };
}

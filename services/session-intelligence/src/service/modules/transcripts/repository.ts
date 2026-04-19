import { detectSessionFormat, extractClaudeMessages, extractCodexMessages, getClaudeSessionMetadata, getCodexSessionMetadata } from "../../shared/normalization";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import type { ExtractedSession, ExtractOptions } from "./schemas";

async function extractSession(input: {
  runtime: SessionSourceRuntime;
  filePath: string;
  options: ExtractOptions;
}): Promise<ExtractedSession | { error: string }> {
  const format = await detectSessionFormat(input.runtime, input.filePath);
  if (format !== "claude" && format !== "codex") return { error: `Unknown session format: ${input.filePath}` };
  let messages =
    format === "claude"
      ? await extractClaudeMessages(input.runtime, input.filePath, input.options.roles, input.options.includeTools)
      : await extractCodexMessages(input.runtime, input.filePath, input.options.roles, input.options.includeTools);

  if (input.options.dedupe) {
    const seen = new Set<string>();
    messages = messages.filter((message) => {
      const key = `${message.role}:${message.content.slice(0, 100)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (input.options.offset > 0) messages = messages.slice(input.options.offset);
  if (input.options.maxMessages > 0) messages = messages.slice(0, input.options.maxMessages);

  if (format === "claude") {
    const meta = await getClaudeSessionMetadata(input.runtime, input.filePath);
    return {
      source: "claude",
      sessionId: meta.sessionId,
      file: input.filePath,
      cwd: meta.cwd,
      gitBranch: meta.gitBranch,
      model: meta.model,
      modelProvider: meta.modelProvider,
      started: meta.timestamp,
      messageCount: messages.length,
      messages,
    };
  }

  const meta = await getCodexSessionMetadata(input.runtime, input.filePath);
  return {
    source: "codex",
    sessionId: meta.sessionId,
    file: input.filePath,
    cwd: meta.cwd,
    gitBranch: meta.gitBranch,
    model: meta.model,
    modelProvider: meta.modelProvider,
    modelContextWindow: meta.modelContextWindow,
    sessionMetaCount: meta.sessionMetaCount,
    cwdFirst: meta.cwdFirst,
    gitBranchFirst: meta.gitBranchFirst,
    started: meta.timestamp,
    messageCount: messages.length,
    messages,
  };
}

export function createRepository(runtime: SessionSourceRuntime) {
  return {
    async detect(path: string) {
      return detectSessionFormat(runtime, path);
    },
    async extract(path: string, options: ExtractOptions) {
      return extractSession({ runtime, filePath: path, options });
    },
  };
}

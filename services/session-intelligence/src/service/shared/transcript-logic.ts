import type { SessionSourceRuntime } from "./ports/session-source-runtime";
import { detectSessionFormat, extractClaudeMessages, extractCodexMessages, getClaudeSessionMetadata, getCodexSessionMetadata } from "./normalization";
import type { ExtractedSession, ExtractOptions } from "./schemas";

export async function extractSession(input: {
  runtime: SessionSourceRuntime;
  filePath: string;
  options: ExtractOptions;
}): Promise<ExtractedSession | { error: string }> {
  const fmt = await detectSessionFormat(input.runtime, input.filePath);
  if (fmt !== "claude" && fmt !== "codex") return { error: `Unknown session format: ${input.filePath}` };
  let messages =
    fmt === "claude"
      ? await extractClaudeMessages(input.runtime, input.filePath, input.options.roles, input.options.includeTools)
      : await extractCodexMessages(input.runtime, input.filePath, input.options.roles, input.options.includeTools);

  if (input.options.dedupe) {
    const seen = new Set<string>();
    messages = messages.filter((m) => {
      const key = `${m.role}:${m.content.slice(0, 100)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (input.options.offset > 0) messages = messages.slice(input.options.offset);
  if (input.options.maxMessages > 0) messages = messages.slice(0, input.options.maxMessages);

  if (fmt === "claude") {
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

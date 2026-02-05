import { detectSessionFormat } from "./detect";
import { extractClaudeMessages, getClaudeSessionMetadata } from "./claude/parse";
import { extractCodexMessages, getCodexSessionMetadata } from "./codex/parse";
import type { ExtractOptions, ExtractedSession } from "./types";

export async function extractSession(filePath: string, options: ExtractOptions): Promise<ExtractedSession | { error: string }> {
  const fmt = await detectSessionFormat(filePath);
  if (fmt !== "claude" && fmt !== "codex") return { error: `Unknown session format: ${filePath}` };

  const messagesRaw =
    fmt === "claude"
      ? await extractClaudeMessages(filePath, options.roles, options.includeTools)
      : await extractCodexMessages(filePath, options.roles, options.includeTools);

  let messages = messagesRaw;
  if (options.dedupe) {
    const seen = new Set<string>();
    const unique = [];
    for (const m of messages) {
      const key = `${m.role}:${m.content.slice(0, 100)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(m);
    }
    messages = unique;
  }

  if (options.offset > 0) messages = messages.slice(options.offset);
  if (options.maxMessages > 0) messages = messages.slice(0, options.maxMessages);

  if (fmt === "claude") {
    const meta = await getClaudeSessionMetadata(filePath);
    return {
      source: "claude",
      sessionId: meta.sessionId,
      file: filePath,
      cwd: meta.cwd,
      gitBranch: meta.gitBranch,
      model: meta.model,
      modelProvider: meta.modelProvider,
      started: meta.timestamp,
      messageCount: messages.length,
      messages,
    };
  }

  const meta = await getCodexSessionMetadata(filePath);
  return {
    source: "codex",
    sessionId: meta.sessionId,
    file: filePath,
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


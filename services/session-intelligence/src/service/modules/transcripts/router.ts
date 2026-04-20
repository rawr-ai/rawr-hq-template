import { module } from "./module";
import type { SessionMessage } from "../../shared/schemas";

function dedupeMessages(messages: SessionMessage[]): SessionMessage[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    const key = `${message.role}:${message.content.slice(0, 100)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const detect = module.detect.handler(async ({ context, input }) => {
  return { source: await context.repo.detect(input.path) };
});

const extract = module.extract.handler(async ({ context, input, errors }) => {
  const format = await context.repo.detect(input.path);
  if (format !== "claude" && format !== "codex") {
    const message = `Unknown session format: ${input.path}`;
    throw errors.UNKNOWN_SESSION_FORMAT({
      message,
      data: { message },
    });
  }

  let messages = await context.repo.extractMessages(input.path, format, input.options.roles, input.options.includeTools);
  if (input.options.dedupe) messages = dedupeMessages(messages);
  if (input.options.offset > 0) messages = messages.slice(input.options.offset);
  if (input.options.maxMessages > 0) messages = messages.slice(0, input.options.maxMessages);

  if (format === "claude") {
    const meta = await context.repo.readClaudeMetadata(input.path);
    return {
      source: "claude" as const,
      sessionId: meta.sessionId,
      file: input.path,
      cwd: meta.cwd,
      gitBranch: meta.gitBranch,
      model: meta.model,
      modelProvider: meta.modelProvider,
      started: meta.timestamp,
      messageCount: messages.length,
      messages,
    };
  }

  const meta = await context.repo.readCodexMetadata(input.path);
  return {
    source: "codex" as const,
    sessionId: meta.sessionId,
    file: input.path,
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
});

export const router = module.router({
  detect,
  extract,
});

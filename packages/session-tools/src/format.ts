import type { ExtractedSession, OutputFormat, SessionListItem, SessionMessage } from "./types";

export function chunkMessages<T>(messages: T[], chunkSize: number, chunkOverlap: number): T[][] {
  if (chunkSize <= 0) return [messages];
  const overlap = Math.max(0, Math.min(chunkOverlap, chunkSize - 1));
  const step = Math.max(1, chunkSize - overlap);
  const out: T[][] = [];
  for (let i = 0; i < messages.length; i += step) {
    out.push(messages.slice(i, i + chunkSize));
  }
  return out;
}

export function formatRelativeTime(isoTimestamp: string): string {
  const dt = new Date(isoTimestamp);
  if (Number.isNaN(dt.getTime())) return isoTimestamp ? isoTimestamp.slice(0, 19) : "?";
  const deltaMs = Date.now() - dt.getTime();
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export function formatSessionTable(sessions: SessionListItem[]): string {
  const lines: string[] = [];
  lines.push(
    `${"#".padEnd(3)} ${"Source".padEnd(7)} ${"ID (short)".padEnd(12)} ${"Model".padEnd(18)} ${"Project".padEnd(20)} ${"Title/First Message".padEnd(40)} ${"Modified".padEnd(12)}`,
  );
  lines.push("-".repeat(100));
  sessions.forEach((s, idx) => {
    const source = (s.source ?? "?").padEnd(7);
    const sessionId = s.sessionId ? `${s.sessionId.slice(0, 10)}...` : "?";
    const provider = s.modelProvider;
    const model = (provider && s.model ? `${provider}:${s.model}` : s.model ?? "?").slice(0, 16).padEnd(18);
    const project = (s.project ?? "?").slice(0, 18).padEnd(20);
    const title = (s.title ?? "").slice(0, 38).padEnd(40);
    const modified = formatRelativeTime(s.modified).padEnd(12);
    lines.push(`${String(idx + 1).padEnd(3)} ${source} ${sessionId.padEnd(12)} ${model} ${project} ${title} ${modified}`);
  });
  return lines.join("\n");
}

export function formatTranscript(session: ExtractedSession, format: OutputFormat): string {
  if (format === "json") return JSON.stringify(session, null, 2);
  if (format === "text") return formatTranscriptText(session);
  return formatTranscriptMarkdown(session);
}

export function formatTranscriptMessagesOnly(
  session: Pick<ExtractedSession, "messages" | "messageCount"> & Partial<ExtractedSession>,
  format: OutputFormat,
  opts: { includeHeader: boolean; chunkTitle?: string },
): string {
  if (format === "json") return JSON.stringify(session, null, 2);
  if (format === "text") return formatTranscriptTextMessagesOnly(session.messages ?? [], opts);
  return formatTranscriptMarkdownMessagesOnly(session, opts);
}

function formatTranscriptText(session: ExtractedSession): string {
  const lines: string[] = [];
  lines.push(`# Session: ${session.sessionId ?? "unknown"}`);
  lines.push(`# Source: ${session.source}`);
  lines.push(`# CWD: ${session.cwd ?? "unknown"}`);
  if (session.model || session.modelProvider) lines.push(`# Model: ${(session.modelProvider ?? "unknown")}:${(session.model ?? "unknown")}`);
  lines.push(`# Messages: ${session.messageCount}`);
  lines.push("");
  for (const msg of session.messages) {
    lines.push(`[${msg.role.toUpperCase()}]`);
    lines.push(msg.content);
    lines.push("");
  }
  return lines.join("\n");
}

function formatTranscriptTextMessagesOnly(messages: SessionMessage[], opts: { includeHeader: boolean; chunkTitle?: string }): string {
  const lines: string[] = [];
  if (opts.includeHeader) {
    lines.push("");
  }
  if (opts.chunkTitle) {
    lines.push(`# ${opts.chunkTitle}`);
    lines.push("");
  }
  for (const msg of messages) {
    lines.push(`[${msg.role.toUpperCase()}]`);
    lines.push(msg.content);
    lines.push("");
  }
  return lines.join("\n");
}

function formatTranscriptMarkdown(session: ExtractedSession): string {
  const lines: string[] = [];
  lines.push("# Session Transcript");
  lines.push("");
  lines.push(`**Session ID:** \`${session.sessionId ?? "unknown"}\``);
  lines.push(`**Source:** ${session.source}`);
  lines.push(`**CWD:** \`${session.cwd ?? "unknown"}\``);
  lines.push(`**Git Branch:** ${session.gitBranch ?? "unknown"}`);
  if (session.model || session.modelProvider) lines.push(`**Model:** \`${(session.modelProvider ?? "unknown")}:${(session.model ?? "unknown")}\``);
  if (session.modelContextWindow) lines.push(`**Model Context Window:** \`${session.modelContextWindow}\``);
  if (session.sessionMetaCount && session.sessionMetaCount !== 1) lines.push(`**Session Meta Records:** \`${session.sessionMetaCount}\``);
  lines.push(`**Messages:** ${session.messageCount}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const msg of session.messages) {
    lines.push(msg.role === "user" ? "## User" : msg.role === "assistant" ? "## Assistant" : "## Tool");
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

function formatTranscriptMarkdownMessagesOnly(
  session: Pick<ExtractedSession, "messages" | "messageCount"> & Partial<ExtractedSession>,
  opts: { includeHeader: boolean; chunkTitle?: string },
): string {
  const lines: string[] = [];
  if (opts.includeHeader) {
    lines.push("# Session Transcript");
    lines.push("");
    lines.push(`**Session ID:** \`${session.sessionId ?? "unknown"}\``);
    lines.push(`**Source:** ${session.source ?? "unknown"}`);
    lines.push(`**CWD:** \`${session.cwd ?? "unknown"}\``);
    lines.push(`**Git Branch:** ${session.gitBranch ?? "unknown"}`);
    if (session.model || session.modelProvider) lines.push(`**Model:** \`${(session.modelProvider ?? "unknown")}:${(session.model ?? "unknown")}\``);
    if (session.modelContextWindow) lines.push(`**Model Context Window:** \`${session.modelContextWindow}\``);
    if (session.sessionMetaCount && session.sessionMetaCount !== 1) lines.push(`**Session Meta Records:** \`${session.sessionMetaCount}\``);
    lines.push(`**Messages:** ${session.messageCount ?? session.messages?.length ?? 0}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  if (opts.chunkTitle) {
    lines.push(`## ${opts.chunkTitle}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  for (const msg of session.messages ?? []) {
    lines.push(msg.role === "user" ? "## User" : msg.role === "assistant" ? "## Assistant" : "## Tool");
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

export function writeTranscriptFileName(format: OutputFormat, chunkIndex?: number): string {
  const ext = format === "json" ? "json" : format === "text" ? "txt" : "md";
  if (chunkIndex != null) return `transcript.chunk-${String(chunkIndex).padStart(3, "0")}.${ext}`;
  return `transcript.${ext}`;
}


import path from "node:path";
import { readFirstJsonlObject, readJsonlObjects } from "./jsonl";
import type {
  ClaudeSessionMetadata,
  CodexSessionMetadata,
  RoleFilter,
  SessionMessage,
  SessionSource,
  SessionStatus,
} from "./types";

export async function detectSessionFormat(filePath: string): Promise<SessionSource | "unknown"> {
  const obj = await readFirstJsonlObject(filePath);
  if (!obj || typeof obj !== "object") return "unknown";
  const data = obj as any;
  const t = data.type;
  if (t === "summary" || t === "user" || t === "assistant" || t === "file-history-snapshot") return "claude";
  if (t === "session_meta" || t === "response_item" || t === "event_msg" || t === "turn_context") return "codex";
  if ("payload" in data) return "codex";
  if ("message" in data && "uuid" in data) return "claude";
  return "unknown";
}

export async function getClaudeSessionMetadata(filePath: string): Promise<ClaudeSessionMetadata> {
  const metadata: ClaudeSessionMetadata = {
    sessionId: path.basename(filePath).replace(/\.jsonl$/, ""),
    summaries: [],
    modelProvider: "anthropic",
  };

  try {
    for await (const obj of readJsonlObjects(filePath)) {
      if (!obj || typeof obj !== "object") continue;
      const data = obj as any;
      if (data.type === "summary") {
        const summary = typeof data.summary === "string" ? data.summary : "";
        if (summary && !metadata.summaries!.includes(summary)) metadata.summaries!.push(summary);
      } else if (data.type === "user" && metadata.cwd == null) {
        if (typeof data.cwd === "string") metadata.cwd = data.cwd;
        if (typeof data.gitBranch === "string") metadata.gitBranch = data.gitBranch;
        if (typeof data.sessionId === "string") metadata.sessionId = data.sessionId;
        if (typeof data.timestamp === "string") metadata.timestamp = data.timestamp;
        metadata.firstUserMessage ??= extractClaudeTextContent(data.message?.content, "input_text").slice(0, 100) || undefined;
      }

      if (data.message && typeof data.message === "object" && typeof data.message.model === "string") metadata.model = data.message.model;
      if (typeof data.timestamp === "string") metadata.lastTimestamp = data.timestamp;
    }
  } catch (err) {
    metadata.error = err instanceof Error ? err.message : String(err);
  }

  return metadata;
}

export function inferSessionIdFromFilename(filePath: string): string | undefined {
  const stem = path.basename(filePath).replace(/\.(jsonl|json)$/, "");
  const parts = stem.split("-");
  if (parts.length < 5) return undefined;
  const candidate = parts.slice(-5).join("-");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate) ? candidate : undefined;
}

export async function getCodexSessionMetadata(filePath: string): Promise<CodexSessionMetadata> {
  const metadata: CodexSessionMetadata = {
    sessionMetaCount: 0,
    compactionCount: 0,
    compactionAutoWatcherCount: 0,
  };

  try {
    for await (const obj of readJsonlObjects(filePath)) {
      if (!obj || typeof obj !== "object") continue;
      const data = obj as any;
      if (data.type === "session_meta") {
        const payload = data.payload ?? {};
        metadata.sessionMetaCount = (metadata.sessionMetaCount ?? 0) + 1;
        if (!metadata.sessionId && typeof payload.id === "string") metadata.sessionId = payload.id;
        if (!metadata.cwdFirst && typeof payload.cwd === "string") metadata.cwdFirst = payload.cwd;
        if (!metadata.timestampFirst && typeof payload.timestamp === "string") metadata.timestampFirst = payload.timestamp;
        if (!metadata.gitBranchFirst && typeof payload.git?.branch === "string") metadata.gitBranchFirst = payload.git.branch;
        if (typeof payload.cwd === "string") metadata.cwd = payload.cwd;
        if (typeof payload.timestamp === "string") metadata.timestamp = payload.timestamp;
        if (typeof payload.git?.branch === "string") metadata.gitBranch = payload.git.branch;
        if (typeof payload.model === "string") metadata.model = payload.model;
        if (typeof payload.model_provider === "string") metadata.modelProvider = payload.model_provider;
        if (typeof payload.info?.model_context_window === "number") metadata.modelContextWindow = payload.info.model_context_window;
      } else if (data.type === "turn_context" && typeof data.payload?.model === "string") {
        metadata.model = data.payload.model;
      } else if (data.type === "event_msg" && data.payload?.type === "user_message" && metadata.firstUserMessage == null) {
        const message = typeof data.payload.message === "string" ? data.payload.message : "";
        if (message && !message.startsWith("# Context from my IDE")) metadata.firstUserMessage = message.slice(0, 100);
      } else if (data.type === "event_msg" && data.payload?.type === "token_count") {
        if (typeof data.payload.info?.model_context_window === "number") metadata.modelContextWindow = data.payload.info.model_context_window;
      } else if (data.type === "compacted") {
        metadata.compactionCount = (metadata.compactionCount ?? 0) + 1;
        if (typeof data.timestamp === "string") metadata.compactionLastTimestamp = data.timestamp;
        if (data.payload?.trigger?.type === "auto_watcher") {
          metadata.compactionAutoWatcherCount = (metadata.compactionAutoWatcherCount ?? 0) + 1;
        }
      }

      if (typeof data.timestamp === "string") metadata.lastTimestamp = data.timestamp;
    }
  } catch (err) {
    metadata.error = err instanceof Error ? err.message : String(err);
  }

  metadata.sessionId ??= inferSessionIdFromFilename(filePath);
  return metadata;
}

function extractClaudeTextContent(content: unknown, itemType: "input_text" | "text"): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") parts.push(item);
    else if (item && typeof item === "object" && (item as any).type === itemType) parts.push(String((item as any).text ?? ""));
  }
  return parts.join("\n");
}

function extractCodexTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") parts.push(item);
    else if (item && typeof item === "object") {
      const t = (item as any).type;
      if (t === "input_text" || t === "output_text" || t === "text") parts.push(String((item as any).text ?? ""));
    }
  }
  return parts.join("\n");
}

export async function extractClaudeMessages(filePath: string, roles: RoleFilter[], includeTools: boolean): Promise<SessionMessage[]> {
  const out: SessionMessage[] = [];
  for await (const obj of readJsonlObjects(filePath)) {
    if (!obj || typeof obj !== "object") continue;
    const data = obj as any;
    if (data.type === "user") {
      if (!roles.includes("all") && !roles.includes("user")) continue;
      const text = extractClaudeTextContent(data.message?.content, "input_text").trim();
      if (text) out.push({ role: "user", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
    } else if (data.type === "assistant") {
      if (!roles.includes("all") && !roles.includes("assistant")) continue;
      const text = extractClaudeTextContent(data.message?.content, "text").trim();
      if (text) out.push({ role: "assistant", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
    } else if (includeTools && (roles.includes("all") || roles.includes("tool")) && data.type === "tool") {
      const content = data.message?.content;
      const text = typeof content === "string" ? content.trim() : JSON.stringify(content, null, 2);
      if (text) out.push({ role: "tool", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
    }
  }
  return out;
}

export async function extractCodexMessages(filePath: string, roles: RoleFilter[], includeTools: boolean): Promise<SessionMessage[]> {
  const out: SessionMessage[] = [];
  for await (const obj of readJsonlObjects(filePath)) {
    if (!obj || typeof obj !== "object") continue;
    const data = obj as any;
    if (data.type === "response_item") {
      const payload = data.payload ?? {};
      if (payload.type === "function_call" || payload.type === "function_call_output" || payload.type === "reasoning") {
        if (!includeTools || (!roles.includes("all") && !roles.includes("tool"))) continue;
        const text = JSON.stringify(payload, null, 2).slice(0, 20000).trim();
        if (text) out.push({ role: "tool", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
      } else if (payload.type === "message" && (payload.role === "user" || payload.role === "assistant")) {
        if (!roles.includes("all") && !roles.includes(payload.role)) continue;
        const text = extractCodexTextContent(payload.content).trim();
        if (text && !text.includes("<environment_context>") && !text.includes("<user_instructions>")) {
          out.push({ role: payload.role, content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
        }
      }
    } else if (data.type === "event_msg" && data.payload?.type === "user_message" && typeof data.payload.message === "string") {
      if (!roles.includes("all") && !roles.includes("user")) continue;
      const text = data.payload.message.trim();
      if (text) out.push({ role: "user", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
    } else if (data.type === "compacted" && includeTools && (roles.includes("all") || roles.includes("tool"))) {
      const payload = typeof data.payload === "object" && data.payload ? data.payload : {};
      const trigger = typeof payload.trigger === "object" && payload.trigger ? payload.trigger : {};
      const text = JSON.stringify({
        type: "compacted",
        trigger_type: typeof trigger.type === "string" ? trigger.type : null,
        timestamp: typeof data.timestamp === "string" ? data.timestamp : "",
      });
      out.push({ role: "tool", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
    }
  }
  return out;
}

export function inferProjectFromCwd(cwd?: string): string | undefined {
  if (!cwd) return undefined;
  try {
    return path.basename(cwd);
  } catch {
    return undefined;
  }
}

export function inferStatusFromPath(filePath: string): SessionStatus | undefined {
  const p = filePath.replace(/\\/g, "/");
  if (p.includes("/archived_sessions/")) return "archived";
  if (p.includes("/sessions/")) return "live";
  return undefined;
}

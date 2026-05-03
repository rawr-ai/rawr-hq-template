import type { SessionSourceRuntime } from "./ports/session-source-runtime";
import { basename, inferProjectFromCwd, inferStatusFromPath, stem, stripKnownSessionExtension } from "./path-utils";
import type { ClaudeSessionMetadata, CodexSessionMetadata, RoleFilter, SessionMessage, SessionSource } from "./entities";

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" ? (value as Record<string, any>) : null;
}

async function readFirstJsonlObject(runtime: SessionSourceRuntime, filePath: string): Promise<unknown | null> {
  for await (const obj of runtime.readJsonlObjects({ path: filePath })) return obj;
  return null;
}

export async function detectSessionFormat(runtime: SessionSourceRuntime, filePath: string): Promise<SessionSource | "unknown"> {
  const data = asRecord(await readFirstJsonlObject(runtime, filePath));
  if (!data) return "unknown";
  const t = data.type;
  if (t === "summary" || t === "user" || t === "assistant" || t === "file-history-snapshot") return "claude";
  if (t === "session_meta" || t === "response_item" || t === "event_msg" || t === "turn_context") return "codex";
  if ("payload" in data) return "codex";
  if ("message" in data && "uuid" in data) return "claude";
  return "unknown";
}

export function inferSessionIdFromCodexFilename(filePath: string): string | undefined {
  const parts = stem(filePath).split("-");
  if (parts.length < 5) return undefined;
  const candidate = parts.slice(-5).join("-");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate) ? candidate : undefined;
}

export async function getClaudeSessionMetadata(runtime: SessionSourceRuntime, filePath: string): Promise<ClaudeSessionMetadata> {
  const metadata: ClaudeSessionMetadata = {
    sessionId: stripKnownSessionExtension(basename(filePath)),
    summaries: [],
    modelProvider: "anthropic",
  };
  try {
    for await (const obj of runtime.readJsonlObjects({ path: filePath })) {
      const data = asRecord(obj);
      if (!data) continue;
      if (data.type === "summary") {
        const summary = typeof data.summary === "string" ? data.summary : "";
        if (summary && !metadata.summaries?.includes(summary)) metadata.summaries?.push(summary);
      } else if (data.type === "user" && metadata.cwd == null) {
        if (typeof data.cwd === "string") metadata.cwd = data.cwd;
        if (typeof data.gitBranch === "string") metadata.gitBranch = data.gitBranch;
        if (typeof data.sessionId === "string") metadata.sessionId = data.sessionId;
        if (typeof data.timestamp === "string") metadata.timestamp = data.timestamp;
        const content = asRecord(data.message)?.content;
        if (typeof content === "string") metadata.firstUserMessage = content.slice(0, 100);
        else if (Array.isArray(content)) {
          const firstText = content.map(asRecord).find((item) => item?.type === "input_text");
          if (firstText) metadata.firstUserMessage = String(firstText.text ?? "").slice(0, 100);
        }
      }
      const model = asRecord(data.message)?.model;
      if (typeof model === "string") metadata.model = model;
      if (typeof data.timestamp === "string") metadata.lastTimestamp = data.timestamp;
    }
  } catch (err) {
    metadata.error = err instanceof Error ? err.message : String(err);
  }
  return metadata;
}

function extractClaudeTextContent(content: unknown, itemType: "input_text" | "text"): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  return content
    .map((item) => (typeof item === "string" ? item : asRecord(item)?.type === itemType ? String(asRecord(item)?.text ?? "") : ""))
    .filter(Boolean)
    .join("\n");
}

export async function extractClaudeMessages(runtime: SessionSourceRuntime, filePath: string, roles: RoleFilter[], includeTools: boolean): Promise<SessionMessage[]> {
  const out: SessionMessage[] = [];
  for await (const obj of runtime.readJsonlObjects({ path: filePath })) {
    const data = asRecord(obj);
    if (!data) continue;
    if (data.type === "user") {
      if (!roles.includes("all") && !roles.includes("user")) continue;
      const text = extractClaudeTextContent(asRecord(data.message)?.content, "input_text").trim();
      if (text) out.push({ role: "user", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
    } else if (data.type === "assistant") {
      if (!roles.includes("all") && !roles.includes("assistant")) continue;
      const text = extractClaudeTextContent(asRecord(data.message)?.content, "text").trim();
      if (text) out.push({ role: "assistant", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
    } else if (includeTools && (roles.includes("all") || roles.includes("tool")) && data.type === "tool") {
      const content = asRecord(data.message)?.content;
      const text = typeof content === "string" ? content.trim() : JSON.stringify(content, null, 2);
      if (text) out.push({ role: "tool", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
    }
  }
  return out;
}

export async function getCodexSessionMetadata(runtime: SessionSourceRuntime, filePath: string): Promise<CodexSessionMetadata> {
  const metadata: CodexSessionMetadata = { sessionMetaCount: 0, compactionCount: 0, compactionAutoWatcherCount: 0 };
  try {
    for await (const obj of runtime.readJsonlObjects({ path: filePath })) {
      const data = asRecord(obj);
      if (!data) continue;
      if (data.type === "session_meta") {
        const payload = asRecord(data.payload) ?? {};
        metadata.sessionMetaCount = (metadata.sessionMetaCount ?? 0) + 1;
        if (!metadata.sessionId && typeof payload.id === "string") metadata.sessionId = payload.id;
        if (!metadata.cwdFirst && typeof payload.cwd === "string") metadata.cwdFirst = payload.cwd;
        if (!metadata.timestampFirst && typeof payload.timestamp === "string") metadata.timestampFirst = payload.timestamp;
        const gitFirst = asRecord(payload.git) ?? {};
        if (!metadata.gitBranchFirst && typeof gitFirst.branch === "string") metadata.gitBranchFirst = gitFirst.branch;
        if (typeof payload.cwd === "string") metadata.cwd = payload.cwd;
        if (typeof payload.timestamp === "string") metadata.timestamp = payload.timestamp;
        const gitInfo = asRecord(payload.git) ?? {};
        if (typeof gitInfo.branch === "string") metadata.gitBranch = gitInfo.branch;
        if (typeof payload.model === "string") metadata.model = payload.model;
        if (typeof payload.model_provider === "string") metadata.modelProvider = payload.model_provider;
        const info = asRecord(payload.info) ?? {};
        if (typeof info.model_context_window === "number") metadata.modelContextWindow = info.model_context_window;
      } else if (data.type === "turn_context") {
        const model = asRecord(data.payload)?.model;
        if (typeof model === "string") metadata.model = model;
      } else if (data.type === "event_msg" && metadata.firstUserMessage == null) {
        const payload = asRecord(data.payload) ?? {};
        if (payload.type === "user_message" && typeof payload.message === "string" && !payload.message.startsWith("# Context from my IDE")) metadata.firstUserMessage = payload.message.slice(0, 100);
      } else if (data.type === "compacted") {
        metadata.compactionCount = (metadata.compactionCount ?? 0) + 1;
        if (typeof data.timestamp === "string") metadata.compactionLastTimestamp = data.timestamp;
        const trigger = asRecord(asRecord(data.payload)?.trigger) ?? {};
        if (trigger.type === "auto_watcher") metadata.compactionAutoWatcherCount = (metadata.compactionAutoWatcherCount ?? 0) + 1;
      }
      if (typeof data.timestamp === "string") metadata.lastTimestamp = data.timestamp;
    }
  } catch (err) {
    metadata.error = err instanceof Error ? err.message : String(err);
  }
  if (!metadata.sessionId) metadata.sessionId = inferSessionIdFromCodexFilename(filePath);
  return metadata;
}

function extractCodexMessageTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      const data = asRecord(item);
      return data?.type === "input_text" || data?.type === "output_text" || data?.type === "text" ? String(data.text ?? "") : "";
    })
    .filter(Boolean)
    .join("\n");
}

export async function extractCodexMessages(runtime: SessionSourceRuntime, filePath: string, roles: RoleFilter[], includeTools: boolean): Promise<SessionMessage[]> {
  const out: SessionMessage[] = [];
  for await (const obj of runtime.readJsonlObjects({ path: filePath })) {
    const data = asRecord(obj);
    if (!data) continue;
    if (data.type === "response_item") {
      const payload = asRecord(data.payload) ?? {};
      if (payload.type === "function_call" || payload.type === "function_call_output" || payload.type === "reasoning") {
        if (!includeTools || (!roles.includes("all") && !roles.includes("tool"))) continue;
        const tool = payload.type === "reasoning" ? { type: payload.type, summary: payload.summary } : { type: payload.type, name: payload.name, arguments: payload.arguments, output: payload.output };
        const text = JSON.stringify(tool, null, 2).slice(0, 20000).trim();
        if (text) out.push({ role: "tool", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
      } else if (payload.type === "message") {
        const role = payload.role;
        const text = extractCodexMessageTextContent(payload.content).trim();
        if (!text || text.includes("<environment_context>") || text.includes("<user_instructions>")) continue;
        if ((role === "user" || role === "assistant") && (roles.includes("all") || roles.includes(role))) out.push({ role, content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
      }
    } else if (data.type === "event_msg") {
      const payload = asRecord(data.payload) ?? {};
      if (payload.type === "user_message" && typeof payload.message === "string" && (roles.includes("all") || roles.includes("user"))) {
        const msg = payload.message.trim();
        if (msg) out.push({ role: "user", content: msg, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
      }
    } else if (data.type === "compacted" && includeTools && (roles.includes("all") || roles.includes("tool"))) {
      const payload = asRecord(data.payload) ?? {};
      const trigger = asRecord(payload.trigger) ?? {};
      const message = typeof payload.message === "string" ? payload.message : "";
      out.push({
        role: "tool",
        timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined,
        content: JSON.stringify({
          type: "compacted",
          trigger_type: typeof trigger.type === "string" ? trigger.type : null,
          timestamp: typeof data.timestamp === "string" ? data.timestamp : "",
          summary_preview: message ? message.replace(/\n/g, " ").slice(0, 500) : null,
          replacement_history_items: Array.isArray(payload.replacement_history) ? payload.replacement_history.length : null,
        }, null, 2),
      });
    }
  }
  return out;
}

export { inferProjectFromCwd, inferStatusFromPath };

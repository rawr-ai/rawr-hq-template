import path from "node:path";
import { readJsonlObjects } from "../util/jsonl";
import type { CodexSessionMetadata, RoleFilter, SessionMessage, SessionStatus } from "../types";

export function inferSessionIdFromFilename(filePath: string): string | undefined {
  const stem = path.basename(filePath).replace(/\\.(jsonl|json)$/, "");
  const parts = stem.split("-");
  if (parts.length >= 5) {
    const candidate = parts.slice(-5).join("-");
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)) return candidate;
  }
  return undefined;
}

export async function getCodexSessionMetadata(filePath: string): Promise<CodexSessionMetadata> {
  const metadata: CodexSessionMetadata = {
    sessionId: undefined,
    firstUserMessage: undefined,
    cwd: undefined,
    gitBranch: undefined,
    timestamp: undefined,
    lastTimestamp: undefined,
    model: undefined,
    modelProvider: undefined,
    modelContextWindow: undefined,
    sessionMetaCount: 0,
    cwdFirst: undefined,
    gitBranchFirst: undefined,
    timestampFirst: undefined,
    compactionCount: 0,
    compactionAutoWatcherCount: 0,
    compactionLastTimestamp: undefined,
  };

  try {
    for await (const obj of readJsonlObjects(filePath)) {
      if (!obj || typeof obj !== "object") continue;
      const data = obj as any;
      const msgType = data.type;

      if (msgType === "session_meta") {
        const payload = data.payload ?? {};
        metadata.sessionMetaCount = (metadata.sessionMetaCount ?? 0) + 1;
        if (!metadata.sessionId && typeof payload.id === "string") metadata.sessionId = payload.id;
        if (!metadata.cwdFirst && typeof payload.cwd === "string") metadata.cwdFirst = payload.cwd;
        if (!metadata.timestampFirst && typeof payload.timestamp === "string") metadata.timestampFirst = payload.timestamp;
        const gitFirst = payload.git ?? {};
        if (!metadata.gitBranchFirst && typeof gitFirst.branch === "string") metadata.gitBranchFirst = gitFirst.branch;

        if (typeof payload.cwd === "string") metadata.cwd = payload.cwd;
        if (typeof payload.timestamp === "string") metadata.timestamp = payload.timestamp;
        const gitInfo = payload.git ?? {};
        if (typeof gitInfo.branch === "string") metadata.gitBranch = gitInfo.branch;

        if (typeof payload.model === "string") metadata.model = payload.model;
        if (typeof payload.model_provider === "string") metadata.modelProvider = payload.model_provider;
        const info = payload.info ?? {};
        if (typeof info.model_context_window === "number") metadata.modelContextWindow = info.model_context_window;
      } else if (msgType === "turn_context") {
        const payload = data.payload ?? {};
        if (typeof payload.model === "string") metadata.model = payload.model;
      } else if (msgType === "event_msg" && metadata.firstUserMessage == null) {
        const payload = data.payload ?? {};
        if (payload.type === "user_message" && typeof payload.message === "string") {
          const msg = payload.message;
          if (!msg.startsWith("# Context from my IDE")) metadata.firstUserMessage = msg.slice(0, 100);
        }
      } else if (msgType === "event_msg") {
        const payload = data.payload ?? {};
        if (payload.type === "token_count") {
          const info = payload.info ?? {};
          if (typeof info.model_context_window === "number") metadata.modelContextWindow = info.model_context_window;
        }
      } else if (msgType === "compacted") {
        metadata.compactionCount = (metadata.compactionCount ?? 0) + 1;
        if (typeof data.timestamp === "string") metadata.compactionLastTimestamp = data.timestamp;
        const payload = data.payload ?? {};
        const trigger = typeof payload.trigger === "object" && payload.trigger ? payload.trigger : {};
        if (trigger.type === "auto_watcher") metadata.compactionAutoWatcherCount = (metadata.compactionAutoWatcherCount ?? 0) + 1;
      }

      if (typeof data.timestamp === "string") metadata.lastTimestamp = data.timestamp;
    }
  } catch (err) {
    metadata.error = err instanceof Error ? err.message : String(err);
  }

  if (!metadata.sessionId) metadata.sessionId = inferSessionIdFromFilename(filePath);
  return metadata;
}

function extractMessageTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
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
  return String(content ?? "");
}

export async function extractCodexMessages(
  filePath: string,
  roles: RoleFilter[],
  includeTools: boolean,
): Promise<SessionMessage[]> {
  const out: SessionMessage[] = [];
  for await (const obj of readJsonlObjects(filePath)) {
    if (!obj || typeof obj !== "object") continue;
    const data = obj as any;
    const msgType = data.type;

    if (msgType === "response_item") {
      const payload = data.payload ?? {};
      const payloadType = payload.type;

      if (payloadType === "function_call" || payloadType === "function_call_output" || payloadType === "reasoning") {
        if (!includeTools) continue;
        if (!roles.includes("all") && !roles.includes("tool")) continue;
        const outObj: any = { type: payloadType };
        if (payloadType === "function_call") {
          outObj.name = payload.name;
          outObj.arguments = payload.arguments;
        } else if (payloadType === "function_call_output") {
          outObj.name = payload.name;
          outObj.output = payload.output;
        } else if (payloadType === "reasoning") {
          outObj.summary = payload.summary;
        }
        const text = JSON.stringify(outObj, null, 2).slice(0, 20000).trim();
        if (!text) continue;
        out.push({ role: "tool", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
        continue;
      }

      if (payloadType === "message") {
        const role = payload.role;
        const text = extractMessageTextContent(payload.content).trim();
        if (!text) continue;
        if (text.includes("<environment_context>") || text.includes("<user_instructions>")) continue;
        if (role === "user" || role === "assistant") {
          if (!roles.includes("all") && !roles.includes(role)) continue;
          out.push({ role, content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
        }
        continue;
      }
    }

    if (msgType === "event_msg") {
      const payload = data.payload ?? {};
      if (payload.type === "user_message" && typeof payload.message === "string") {
        if (!roles.includes("all") && !roles.includes("user")) continue;
        const msg = payload.message.trim();
        if (!msg) continue;
        out.push({ role: "user", content: msg, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
        continue;
      }
    }

    if (msgType === "compacted") {
      if (!includeTools) continue;
      if (!roles.includes("all") && !roles.includes("tool")) continue;
      const payload = typeof data.payload === "object" && data.payload ? data.payload : {};
      const trigger = typeof payload.trigger === "object" && payload.trigger ? payload.trigger : {};
      const triggerType = typeof trigger.type === "string" ? trigger.type : null;
      const message = typeof payload.message === "string" ? payload.message : "";
      const outObj = {
        type: "compacted",
        trigger_type: triggerType,
        timestamp: typeof data.timestamp === "string" ? data.timestamp : "",
        summary_preview: message ? message.replace(/\\n/g, " ").slice(0, 500) : null,
        replacement_history_items: Array.isArray(payload.replacement_history) ? payload.replacement_history.length : null,
      };
      out.push({ role: "tool", content: JSON.stringify(outObj, null, 2), timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
      continue;
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

export async function inferStatusFromPath(filePath: string): Promise<SessionStatus | undefined> {
  const p = filePath.replace(/\\\\/g, "/");
  if (p.includes("/archived_sessions/")) return "archived";
  if (p.includes("/sessions/")) return "live";
  return undefined;
}


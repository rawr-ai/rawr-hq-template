import path from "node:path";
import { readJsonlObjects } from "../util/jsonl";
import type { ClaudeSessionMetadata, RoleFilter, SessionMessage } from "../types";

export async function getClaudeSessionMetadata(filePath: string): Promise<ClaudeSessionMetadata> {
  const metadata: ClaudeSessionMetadata = {
    sessionId: path.basename(filePath).replace(/\\.jsonl$/, ""),
    summaries: [],
    firstUserMessage: undefined,
    cwd: undefined,
    gitBranch: undefined,
    timestamp: undefined,
    lastTimestamp: undefined,
    model: undefined,
    modelProvider: "anthropic",
  };

  try {
    for await (const obj of readJsonlObjects(filePath)) {
      if (!obj || typeof obj !== "object") continue;
      const data = obj as any;
      const msgType = data.type;
      if (msgType === "summary") {
        const summary = typeof data.summary === "string" ? data.summary : "";
        if (summary && !metadata.summaries!.includes(summary)) metadata.summaries!.push(summary);
      } else if (msgType === "user" && metadata.cwd == null) {
        if (typeof data.cwd === "string") metadata.cwd = data.cwd;
        if (typeof data.gitBranch === "string") metadata.gitBranch = data.gitBranch;
        if (typeof data.sessionId === "string") metadata.sessionId = data.sessionId;
        if (typeof data.timestamp === "string") metadata.timestamp = data.timestamp;

        if (metadata.firstUserMessage == null) {
          const msg = data.message ?? {};
          const content = msg.content;
          if (typeof content === "string") metadata.firstUserMessage = content.slice(0, 100);
          else if (Array.isArray(content)) {
            for (const item of content) {
              if (item && typeof item === "object" && item.type === "input_text") {
                metadata.firstUserMessage = String(item.text ?? "").slice(0, 100);
                break;
              }
            }
          }
        }
      }

      const msg = data.message;
      if (msg && typeof msg === "object" && typeof msg.model === "string") metadata.model = msg.model;

      if (typeof data.timestamp === "string") metadata.lastTimestamp = data.timestamp;
    }
  } catch (err) {
    metadata.error = err instanceof Error ? err.message : String(err);
  }

  return metadata;
}

function extractClaudeTextContent(content: unknown, itemType: "input_text" | "text"): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content) {
      if (typeof item === "string") parts.push(item);
      else if (item && typeof item === "object" && (item as any).type === itemType) parts.push(String((item as any).text ?? ""));
    }
    return parts.join("\n");
  }
  return String(content ?? "");
}

export async function extractClaudeMessages(
  filePath: string,
  roles: RoleFilter[],
  includeTools: boolean,
): Promise<SessionMessage[]> {
  const out: SessionMessage[] = [];
  for await (const obj of readJsonlObjects(filePath)) {
    if (!obj || typeof obj !== "object") continue;
    const data = obj as any;
    const msgType = data.type;

    if (msgType === "user") {
      if (!roles.includes("all") && !roles.includes("user")) continue;
      const msg = data.message ?? {};
      const text = extractClaudeTextContent(msg.content, "input_text").trim();
      if (!text) continue;
      out.push({ role: "user", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
      continue;
    }

    if (msgType === "assistant") {
      if (!roles.includes("all") && !roles.includes("assistant")) continue;
      const msg = data.message ?? {};
      const text = extractClaudeTextContent(msg.content, "text").trim();
      if (!text) continue;
      out.push({ role: "assistant", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
      continue;
    }

    if (includeTools && (roles.includes("all") || roles.includes("tool"))) {
      if (msgType === "tool") {
        const msg = data.message ?? {};
        const content = msg.content;
        const text = typeof content === "string" ? content.trim() : JSON.stringify(content, null, 2);
        if (!text) continue;
        out.push({ role: "tool", content: text, timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined });
        continue;
      }
    }
  }
  return out;
}


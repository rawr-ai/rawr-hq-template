import type { SessionSource } from "./types";
import { readFirstJsonlObject } from "./util/jsonl";

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


import { normalizeCoordinationId } from "../../../domain/ids";
import type { JsonValue } from "../../../domain/types";

export type ParsedRunId =
  | {
      ok: true;
      runId: string;
    }
  | {
      ok: false;
      message: string;
      value: unknown;
    };

export function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export function parseRunId(value: unknown): ParsedRunId {
  if (value === undefined || value === null) return { ok: true, runId: generateRunId() };
  if (typeof value !== "string") {
    return { ok: false, message: "runId must be a string when provided", value };
  }

  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, runId: generateRunId() };
  const normalized = normalizeCoordinationId(value);
  if (!normalized) {
    return { ok: false, message: `Invalid runId format: ${trimmed}`, value: trimmed };
  }
  return { ok: true, runId: normalized };
}

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

import { loadRawrConfig } from "@rawr/control-plane";
import {
  coordinationFailure,
  isCoordinationFailure,
  type CoordinationEnvelope,
  type JsonValue,
} from "@rawr/coordination";
import { findWorkspaceRoot } from "./workspace-plugins";

export type CoordinationApiResponse<TPayload extends Record<string, unknown>> = {
  status: number;
  ok: boolean;
  data: CoordinationEnvelope<TPayload>;
};

function toJsonValue(value: unknown): JsonValue {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
  } catch {
    return null;
  }
}

function asEnvelope<TPayload extends Record<string, unknown>>(input: {
  value: unknown;
  status: number;
  statusText: string;
  url: string;
  raw: string;
}): CoordinationEnvelope<TPayload> {
  const value = input.value;
  if (value && typeof value === "object" && "ok" in value) {
    const maybeEnvelope = value as { ok?: unknown };
    if (maybeEnvelope.ok === true) {
      return value as CoordinationEnvelope<TPayload>;
    }
    if (maybeEnvelope.ok === false && isCoordinationFailure(value)) {
      return value;
    }
  }

  return coordinationFailure({
    code: "INTERNAL_ERROR",
    message: `Unexpected response from coordination API (${input.status} ${input.statusText})`,
    retriable: input.status >= 500,
    details: toJsonValue({
      url: input.url,
      status: input.status,
      statusText: input.statusText,
      raw: input.raw.slice(0, 500),
    }),
  });
}

export async function resolveServerBaseUrl(cwd = process.cwd()): Promise<string> {
  const fromEnv = process.env.RAWR_SERVER_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim() !== "") return fromEnv.trim();

  const workspaceRoot = await findWorkspaceRoot(cwd);
  if (!workspaceRoot) return "http://localhost:3000";

  const loaded = await loadRawrConfig(workspaceRoot);
  const fromConfig = loaded.config?.server?.baseUrl;
  if (typeof fromConfig === "string" && fromConfig.trim() !== "") return fromConfig.trim();

  const port = loaded.config?.server?.port ?? 3000;
  return `http://localhost:${port}`;
}

export async function coordinationFetch<TPayload extends Record<string, unknown>>(input: {
  baseUrl: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}): Promise<CoordinationApiResponse<TPayload>> {
  const url = `${input.baseUrl.replace(/\/$/, "")}${input.path}`;
  const response = await fetch(url, {
    method: input.method ?? "GET",
    headers: input.body ? { "content-type": "application/json" } : undefined,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw.trim() !== "") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  const envelope = asEnvelope<TPayload>({
    value: parsed,
    status: response.status,
    statusText: response.statusText,
    url,
    raw,
  });

  return {
    status: response.status,
    ok: response.ok && envelope.ok === true,
    data: envelope,
  };
}

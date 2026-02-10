import { loadRawrConfig } from "@rawr/control-plane";
import { findWorkspaceRoot } from "./workspace-plugins";

export type CoordinationApiResponse<T> = {
  status: number;
  ok: boolean;
  data: T;
};

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

export async function coordinationFetch<T>(input: {
  baseUrl: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}): Promise<CoordinationApiResponse<T>> {
  const url = `${input.baseUrl.replace(/\/$/, "")}${input.path}`;
  const response = await fetch(url, {
    method: input.method ?? "GET",
    headers: input.body ? { "content-type": "application/json" } : undefined,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const json = (await response.json()) as T;
  return { status: response.status, ok: response.ok, data: json };
}

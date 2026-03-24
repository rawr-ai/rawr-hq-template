import { ORPCError } from "@orpc/client";
import {
  type CoordinationWorkflowV1,
  type JsonValue,
  type RunStatusV1,
  type ValidationResultV1,
} from "@rawr/coordination";
import {
  coordinationFailure,
  type CoordinationFailure,
} from "@rawr/coordination/compat/http";
import { loadRawrConfig } from "@rawr/control-plane";
import { createCliRpcLink } from "@rawr/orpc-client";
import { createCoordinationApiClient, type CoordinationApiClient } from "@rawr/plugin-api-coordination";
import {
  createCoordinationWorkflowClient,
  type CoordinationWorkflowClient,
} from "@rawr/plugin-workflows-coordination";
import { findWorkspaceRoot } from "./workspace-plugins";

export type CoordinationProcedureResult<TPayload extends Record<string, unknown>> =
  | { ok: true; data: TPayload }
  | { ok: false; error: CoordinationFailure };

function resolveRpcUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/rpc`;
}

const apiClientCache = new Map<string, CoordinationApiClient>();
const workflowClientCache = new Map<string, CoordinationWorkflowClient>();

function getCoordinationApiClient(baseUrl: string): CoordinationApiClient {
  const rpcUrl = resolveRpcUrl(baseUrl);
  const cached = apiClientCache.get(rpcUrl);
  if (cached) {
    return cached;
  }

  const client = createCoordinationApiClient(
    createCliRpcLink({
      url: rpcUrl,
    }),
  );

  apiClientCache.set(rpcUrl, client);
  return client;
}

function getCoordinationWorkflowClient(baseUrl: string): CoordinationWorkflowClient {
  const rpcUrl = resolveRpcUrl(baseUrl);
  const cached = workflowClientCache.get(rpcUrl);
  if (cached) {
    return cached;
  }

  const client = createCoordinationWorkflowClient(
    createCliRpcLink({
      url: rpcUrl,
    }),
  );

  workflowClientCache.set(rpcUrl, client);
  return client;
}

function toJsonValue(value: unknown): JsonValue {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
  } catch {
    return null;
  }
}

export function coordinationFailureFromError(error: unknown, fallback: string): CoordinationFailure {
  if (error instanceof ORPCError) {
    return coordinationFailure({
      code: error.code ?? "INTERNAL_ERROR",
      message: error.message || fallback,
      retriable: error.status >= 500,
      details: toJsonValue(error.data),
    });
  }

  if (error instanceof Error) {
    return coordinationFailure({
      code: "INTERNAL_ERROR",
      message: error.message || fallback,
      retriable: false,
    });
  }

  return coordinationFailure({
    code: "INTERNAL_ERROR",
    message: fallback,
    retriable: false,
    details: toJsonValue(error),
  });
}

async function coordinationCall<TPayload extends Record<string, unknown>>(input: {
  baseUrl: string;
  fallback: string;
  invoke: (client: CoordinationApiClient) => Promise<TPayload>;
}): Promise<CoordinationProcedureResult<TPayload>> {
  const client = getCoordinationApiClient(input.baseUrl);

  try {
    const data = await input.invoke(client);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: coordinationFailureFromError(error, input.fallback),
    };
  }
}

async function coordinationWorkflowCall<TPayload extends Record<string, unknown>>(input: {
  baseUrl: string;
  fallback: string;
  invoke: (client: CoordinationWorkflowClient) => Promise<TPayload>;
}): Promise<CoordinationProcedureResult<TPayload>> {
  const client = getCoordinationWorkflowClient(input.baseUrl);

  try {
    const data = await input.invoke(client);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: coordinationFailureFromError(error, input.fallback),
    };
  }
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

export function coordinationProcedurePath(procedure: string): string {
  return `/rpc/${procedure.replace(/\./g, "/")}`;
}

export function coordinationSaveWorkflow(input: {
  baseUrl: string;
  workflow: CoordinationWorkflowV1;
}) {
  return coordinationCall<{ workflow: CoordinationWorkflowV1 }>({
    baseUrl: input.baseUrl,
    fallback: "Failed to create coordination workflow",
    invoke: (client) => client.saveWorkflow({ workflow: input.workflow }),
  });
}

export function coordinationValidateWorkflow(input: { baseUrl: string; workflowId: string }) {
  return coordinationCall<{ workflowId: string; validation: ValidationResultV1 }>({
    baseUrl: input.baseUrl,
    fallback: "Failed to validate workflow",
    invoke: (client) => client.validateWorkflow({ workflowId: input.workflowId }),
  });
}

export function coordinationQueueRun(input: {
  baseUrl: string;
  workflowId: string;
  runInput: JsonValue;
}) {
  return coordinationWorkflowCall<{ run: RunStatusV1; eventIds: string[] }>({
    baseUrl: input.baseUrl,
    fallback: "Workflow run failed",
    invoke: (client) =>
      client.queueRun({
        workflowId: input.workflowId,
        input: input.runInput,
      }),
  });
}

export function coordinationGetRunStatus(input: { baseUrl: string; runId: string }) {
  return coordinationWorkflowCall<{ run: RunStatusV1 }>({
    baseUrl: input.baseUrl,
    fallback: "Run not found",
    invoke: (client) =>
      client.getRunStatus({
        runId: input.runId,
      }),
  });
}

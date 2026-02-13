import { createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import {
  coordinationFailure,
  type CoordinationFailure,
  type CoordinationWorkflowV1,
  type JsonValue,
  type RunStatusV1,
  type ValidationResultV1,
} from "@rawr/coordination";
import { loadRawrConfig } from "@rawr/control-plane";
import { hqContract } from "@rawr/core/orpc";
import { findWorkspaceRoot } from "./workspace-plugins";

type HqClient = ContractRouterClient<typeof hqContract>;
type CoordinationClient = HqClient["coordination"];

export type CoordinationProcedureResult<TPayload extends Record<string, unknown>> =
  | { ok: true; data: TPayload }
  | { ok: false; error: CoordinationFailure };

function resolveRpcUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/rpc`;
}

const clientCache = new Map<string, CoordinationClient>();

function getCoordinationClient(baseUrl: string): CoordinationClient {
  const rpcUrl = resolveRpcUrl(baseUrl);
  const cached = clientCache.get(rpcUrl);
  if (cached) {
    return cached;
  }

  const client = createORPCClient<HqClient>(
    new RPCLink({
      url: rpcUrl,
    }),
  );

  clientCache.set(rpcUrl, client.coordination);
  return client.coordination;
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
  invoke: (client: CoordinationClient) => Promise<TPayload>;
}): Promise<CoordinationProcedureResult<TPayload>> {
  const client = getCoordinationClient(input.baseUrl);

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
  return coordinationCall<{ run: RunStatusV1; eventIds: string[] }>({
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
  return coordinationCall<{ run: RunStatusV1 }>({
    baseUrl: input.baseUrl,
    fallback: "Run not found",
    invoke: (client) =>
      client.getRunStatus({
        runId: input.runId,
      }),
  });
}

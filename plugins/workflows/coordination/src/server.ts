import type { Inngest } from "inngest";
import { defineWorkflowPlugin, type WorkflowRuntimeInput } from "@rawr/hq-sdk/workflows";
import {
  appendRunTimelineEvent,
  getRunStatus,
  readDeskMemory,
  saveRunStatus,
  writeDeskMemory,
} from "@rawr/coordination/node";
import { coordinationWorkflowContract } from "./contract";
import {
  createCoordinationInngestFunction,
  createInngestServeHandler,
  type CoordinationRuntimeAdapter,
} from "./inngest";
import { createCoordinationWorkflowRouter } from "./router";

export {
  coordinationWorkflowContract,
  type CoordinationWorkflowContract,
} from "./contract";
export {
  createCoordinationWorkflowRouter,
  type CoordinationWorkflowRouter,
} from "./router";
export {
  compileWorkflowToInngest,
  createCoordinationInngestFunction,
  createInngestClient,
  createInngestServeHandler,
  processCoordinationRunEvent,
  queueCoordinationRunWithInngest,
  type CoordinationFinishedHook,
  type CoordinationFinishedHookContext,
  type CoordinationFunctionBundle,
  type CoordinationRunEventData,
  type CoordinationRunProcessorOptions,
  type CoordinationRuntimeAdapter,
  type InngestCompileResult,
  type QueueCoordinationRunOptions,
  type QueueCoordinationRunResult,
} from "./inngest";
export type { CoordinationWorkflowContext } from "./context";

export type CoordinationWorkflowRuntimeInput = Readonly<{
  client: Inngest;
  runtime: CoordinationRuntimeAdapter;
}>;

export type CoordinationWorkflowRuntimeAdapterInput = Readonly<{
  repoRoot: string;
  inngestBaseUrl?: string;
}>;

export function createCoordinationWorkflowRuntimeAdapter(
  input: CoordinationWorkflowRuntimeAdapterInput,
): CoordinationRuntimeAdapter {
  return {
    readMemory: async (workflow, deskId) => {
      const record = await readDeskMemory(input.repoRoot, workflow.workflowId, workflow.version, deskId);
      return record?.data ?? null;
    },
    writeMemory: async (workflow, desk, value) => {
      await writeDeskMemory(
        input.repoRoot,
        workflow.workflowId,
        workflow.version,
        desk.deskId,
        "default",
        value,
        desk.memoryScope.ttlSeconds,
      );
    },
    getRunStatus: async (runId) => getRunStatus(input.repoRoot, runId),
    saveRunStatus: async (run) => {
      await saveRunStatus(input.repoRoot, run);
    },
    appendTimeline: async (runId, event) => {
      await appendRunTimelineEvent(input.repoRoot, runId, event);
    },
    inngestBaseUrl: input.inngestBaseUrl,
  };
}

export function createCoordinationWorkflowInngestFunctions(input: CoordinationWorkflowRuntimeInput): readonly unknown[] {
  return createCoordinationInngestFunction(input).functions;
}

export function registerCoordinationWorkflowPlugin() {
  const surface = {
    contract: coordinationWorkflowContract,
    router: createCoordinationWorkflowRouter(),
  } as const;

  return defineWorkflowPlugin({
    capability: "coordination" as const,
    internal: surface,
    published: {
      routeBase: "/coordination" as const,
      ...surface,
    },
    runtime: {
      createInngestFunctions(
        input: WorkflowRuntimeInput<CoordinationRuntimeAdapter>,
      ) {
        return createCoordinationWorkflowInngestFunctions(input);
      },
    },
  });
}

export type CoordinationWorkflowPluginRegistration = ReturnType<typeof registerCoordinationWorkflowPlugin>;

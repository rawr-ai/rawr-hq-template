import { coordinationWorkflowPlugin } from "./plugin";
import type { CoordinationRuntimeAdapter } from "./inngest";
import {
  appendRunTimelineEvent,
  getRunStatus,
  getRunTimeline,
  readDeskMemory,
  saveRunStatus,
  writeDeskMemory,
} from "@rawr/coordination/node";

export {
  coordinationWorkflowContract,
  type CoordinationWorkflowContract,
  GetRunStatusInputSchema,
  GetRunStatusOutputSchema,
  GetRunTimelineInputSchema,
  GetRunTimelineOutputSchema,
  QueueRunInputSchema,
  QueueRunOutputSchema,
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
export {
  coordinationWorkflowPlugin,
  type CoordinationWorkflowPluginBound,
  type CoordinationWorkflowPluginRegistration,
  type CoordinationWorkflowRuntimeInput,
} from "./plugin";

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
    getRunTimeline: async (runId) => getRunTimeline(input.repoRoot, runId),
    saveRunStatus: async (run) => {
      await saveRunStatus(input.repoRoot, run);
    },
    appendTimeline: async (runId, event) => {
      await appendRunTimelineEvent(input.repoRoot, runId, event);
    },
    inngestBaseUrl: input.inngestBaseUrl,
  };
}

/** @deprecated Temporary compatibility shim; import `coordinationWorkflowPlugin` from `./plugin` instead. */
export function registerCoordinationWorkflowPlugin() {
  return coordinationWorkflowPlugin;
}

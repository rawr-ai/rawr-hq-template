import {
  appendRunTimelineEvent,
  getRunStatus,
  readDeskMemory,
  saveRunStatus,
  writeDeskMemory,
} from "@rawr/coordination/node";
import type { CoordinationRuntimeAdapter } from "@rawr/coordination-inngest";

export function createCoordinationRuntimeAdapter(input: {
  repoRoot: string;
  inngestBaseUrl?: string;
}): CoordinationRuntimeAdapter {
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

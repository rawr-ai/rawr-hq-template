import type {
  CoordinationWorkflowV1,
  DeskRunEventV1,
  RunStatusV1,
} from "../../../domain/types";
import {
  appendRunTimelineEvent,
  getRunStatus,
  getRunTimeline,
  getWorkflow,
  saveRunStatus,
} from "../../../storage";

export function createRepository(repoRoot: string) {
  return {
    async getWorkflow(workflowId: string): Promise<CoordinationWorkflowV1 | null> {
      return await getWorkflow(repoRoot, workflowId);
    },

    async getRunStatus(runId: string): Promise<RunStatusV1 | null> {
      return await getRunStatus(repoRoot, runId);
    },

    async getRunTimeline(runId: string): Promise<DeskRunEventV1[]> {
      return await getRunTimeline(repoRoot, runId);
    },

    async saveRunStatus(run: RunStatusV1): Promise<void> {
      await saveRunStatus(repoRoot, run);
    },

    async appendRunTimelineEvent(runId: string, event: DeskRunEventV1): Promise<void> {
      await appendRunTimelineEvent(repoRoot, runId, event);
    },
  };
}

export type RunRepository = ReturnType<typeof createRepository>;

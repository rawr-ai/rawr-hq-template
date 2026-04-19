import type { CoordinationWorkflowV1 } from "../../../domain/types";
import {
  getWorkflow,
  listWorkflows,
  saveWorkflow,
} from "../../../storage";

export function createRepository(repoRoot: string) {
  return {
    async listWorkflows(): Promise<CoordinationWorkflowV1[]> {
      return await listWorkflows(repoRoot);
    },

    async getWorkflow(workflowId: string): Promise<CoordinationWorkflowV1 | null> {
      return await getWorkflow(repoRoot, workflowId);
    },

    async saveWorkflow(workflow: CoordinationWorkflowV1): Promise<void> {
      await saveWorkflow(repoRoot, workflow);
    },
  };
}

export type WorkflowRepository = ReturnType<typeof createRepository>;

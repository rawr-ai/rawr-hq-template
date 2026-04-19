import type { AgentConfigSyncResources } from "../../shared/resources";
import type {
  AssessWorkspaceSyncInput,
  FullSyncPolicyInput,
  PlanWorkspaceSyncInput,
} from "./contract";
import {
  assessWorkspaceSync,
  evaluateFullSyncPolicy,
  planWorkspaceSync,
} from "./workspace-planning";

export function createRepository(resources: AgentConfigSyncResources) {
  return {
    planWorkspaceSync(input: PlanWorkspaceSyncInput) {
      return planWorkspaceSync({ request: input, resources });
    },
    assessWorkspaceSync(input: AssessWorkspaceSyncInput) {
      return assessWorkspaceSync({ request: input, resources });
    },
    evaluateFullSyncPolicy(input: FullSyncPolicyInput) {
      return evaluateFullSyncPolicy(input);
    },
  };
}

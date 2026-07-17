import type { ProviderMutationAction, ProviderMutationPostState, ProviderTargetPlan } from "../domain/state";
import type { DeploymentResult, ProviderDeploymentIssue } from "../domain/result";

export interface ProviderUndoCandidate {
  readonly protocol: "agent-plugin-lifecycle/provider-undo@v1";
  readonly plans: readonly ProviderTargetPlan[];
}

export interface ProviderAppliedObservation {
  readonly action: ProviderMutationAction;
  readonly post: ProviderMutationPostState;
}

export interface ProviderUndoSession {
  stage(action: ProviderMutationAction): Promise<DeploymentResult<null>>;
  applied(observation: ProviderAppliedObservation): Promise<DeploymentResult<null>>;
  fail(issues: readonly ProviderDeploymentIssue[]): Promise<DeploymentResult<null>>;
  settle(): Promise<DeploymentResult<null>>;
}

export interface ProviderUndoWriter {
  preflight(candidate: ProviderUndoCandidate): Promise<DeploymentResult<null>>;
  begin(candidate: ProviderUndoCandidate): Promise<DeploymentResult<ProviderUndoSession>>;
}

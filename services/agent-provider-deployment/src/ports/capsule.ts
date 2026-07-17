import type { ProviderMutationAction, ProviderMutationPostState, ProviderTargetPlan } from "../domain/state";
import type { DeploymentResult, ProviderDeploymentIssue } from "../domain/result";

export interface ProviderCapsuleCandidate {
  readonly protocol: "agent-provider-deployment@v1";
  readonly plans: readonly ProviderTargetPlan[];
}

export interface ProviderAppliedObservation {
  readonly action: ProviderMutationAction;
  readonly post: ProviderMutationPostState;
}

export interface ProviderCapsuleSession {
  stage(action: ProviderMutationAction): Promise<DeploymentResult<null>>;
  applied(observation: ProviderAppliedObservation): Promise<DeploymentResult<null>>;
  fail(issues: readonly ProviderDeploymentIssue[]): Promise<DeploymentResult<null>>;
  settle(): Promise<DeploymentResult<null>>;
}

export interface ProviderCapsuleWriter {
  preflight(candidate: ProviderCapsuleCandidate): Promise<DeploymentResult<null>>;
  begin(candidate: ProviderCapsuleCandidate): Promise<DeploymentResult<ProviderCapsuleSession>>;
}

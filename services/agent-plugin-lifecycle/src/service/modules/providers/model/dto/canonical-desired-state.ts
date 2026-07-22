import type { AgentProviderProjection } from "../policy/projection";
import type { ProviderId } from "./provider-target";
import type { CanonicalChannelSelection } from "../../../../model/dto/current-main-selection";
import type { NonEmptyReadonlyArray, ProviderDeploymentIssue } from "../errors/deployment-result";

/** One governance selection paired with its artifact-verified provider projection. */
export interface CanonicalDesiredState<TProvider extends ProviderId = ProviderId> {
  readonly selection: CanonicalChannelSelection;
  readonly projection: Readonly<
    Omit<AgentProviderProjection, "provider"> & { readonly provider: TProvider }
  >;
}

export type CanonicalDesiredStateResolution =
  | Readonly<{
      status: "RESOLVED";
      desired: readonly [CanonicalDesiredState<"claude">, CanonicalDesiredState<"codex">];
    }>
  | Readonly<{
      status: "BLOCKED_SELECTION";
      issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
    }>;

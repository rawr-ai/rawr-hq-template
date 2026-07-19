import type {
  AdapterProtocol,
  AgentProviderProjection,
  CapabilityObservation,
} from "../policy/projection";
import type { ContentAuthority } from "../../../../shared/release";
import type { VerifiedMemberIdentity, VisibleFingerprint } from "../policy/receipt";
import type {
  DeploymentResult,
  NonEmptyReadonlyArray,
  ProviderDeploymentIssue,
} from "../errors/deployment-result";
import type {
  NativeProviderMutationAction,
  ProviderInventory,
} from "../policy/state-machine";
import type { ProviderTarget } from "../dto/provider-target";

export type { NativeProviderMutationAction } from "../policy/state-machine";

export interface ProviderVisibilityObservation {
  readonly visibleFingerprint: VisibleFingerprint;
  readonly members: readonly VerifiedMemberIdentity[];
}

export type NativeMutationAttempt =
  | Readonly<{ kind: "applied" }>
  | Readonly<{
    kind: "not-applied";
    issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
  }>
  | Readonly<{
    kind: "uncertain";
    lastKnown: "bridge-invoked" | "bridge-returned";
    issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
  }>;

export interface ProviderTargetReader {
  projectionAdapterProtocol(target: ProviderTarget): DeploymentResult<AdapterProtocol>;
  inspectCapabilities(
    target: ProviderTarget,
    contentAuthority?: ContentAuthority,
  ): Promise<DeploymentResult<CapabilityObservation>>;
  readInventory(
    target: ProviderTarget,
    contentAuthority?: ContentAuthority,
  ): Promise<DeploymentResult<ProviderInventory>>;
  verifyProjection(target: ProviderTarget, projection: AgentProviderProjection): Promise<DeploymentResult<ProviderVisibilityObservation>>;
}

export interface ProviderTargetMutator {
  apply(action: NativeProviderMutationAction): Promise<NativeMutationAttempt>;
}

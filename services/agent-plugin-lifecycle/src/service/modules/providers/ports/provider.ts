import type {
  AdapterProtocol,
  AgentProviderProjection,
  CapabilityObservation,
} from "../model/policy/projection";
import type { ContentAuthority } from "../../../shared/release";
import type { VerifiedMemberIdentity, VisibleFingerprint } from "../model/policy/receipt";
import type {
  DeploymentResult,
  NonEmptyReadonlyArray,
  ProviderDeploymentIssue,
} from "../model/errors/deployment-result";
import type {
  NativeProviderMutationAction,
  ProviderInventory,
} from "../model/policy/state-machine";
import type { ProviderTarget } from "../model/dto/provider-target";

export type { NativeProviderMutationAction } from "../model/policy/state-machine";

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

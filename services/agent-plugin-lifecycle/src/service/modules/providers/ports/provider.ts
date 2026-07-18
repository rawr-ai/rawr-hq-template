import type {
  AdapterProtocol,
  AgentProviderProjection,
  CapabilityObservation,
} from "../model/policy/projection";
import type { ContentAuthority } from "../../../shared/release";
import type {
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
} from "../model/policy/marketplace";
import type { VerifiedMemberIdentity, VisibleFingerprint } from "../model/policy/receipt";
import type { DeploymentResult } from "../model/errors/deployment-result";
import type { NativeMemberObservation, ProviderInventory, ProviderMutationAction } from "../model/policy/state-machine";
import type { ProviderTarget } from "../model/dto/provider-target";
import type { ProviderMarketplaceSource } from "./state";

export type NativeProviderMutationAction = Extract<
  ProviderMutationAction,
  { kind: "EnableMember" | "InstallMember" | "RetireMember" | "SetMarketplace" }
>;

export interface ProviderVisibilityObservation {
  readonly visibleFingerprint: VisibleFingerprint;
  readonly members: readonly VerifiedMemberIdentity[];
}

export type NativeMutationObservation =
  | Readonly<{
    actionKind: "SetMarketplace";
    postMarketplace: ProviderMarketplaceObservation;
  }>
  | Readonly<{
    actionKind: Exclude<NativeProviderMutationAction["kind"], "SetMarketplace">;
    postMember: NativeMemberObservation | null;
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
  apply(action: NativeProviderMutationAction): Promise<DeploymentResult<NativeMutationObservation>>;
}

export interface NativeMemberRestorationPort {
  readMarketplace(
    target: ProviderTarget,
  ): Promise<DeploymentResult<ProviderMarketplaceObservation>>;
  setMarketplaceExact(input: Readonly<{
    target: ProviderTarget;
    expected: ProviderMarketplaceObservation;
    registration: ProviderMarketplaceRegistration | null;
    source: ProviderMarketplaceSource | null;
  }>): Promise<DeploymentResult<null>>;
  readMember(
    target: ProviderTarget,
    nativeIdentity: string,
  ): Promise<DeploymentResult<NativeMemberObservation | null>>;
  restoreExact(input: Readonly<{
    target: ProviderTarget;
    expected: NativeMemberObservation | null;
    prior: NativeMemberObservation | null;
  }>): Promise<DeploymentResult<null>>;
}

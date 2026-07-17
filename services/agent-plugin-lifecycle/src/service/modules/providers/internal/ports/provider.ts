import type {
  AdapterProtocol,
  AgentProviderProjection,
  CapabilityObservation,
} from "../domain/projection";
import type { ContentAuthority } from "../../../../shared/release";
import type {
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
} from "../domain/marketplace";
import type { VerifiedMemberIdentity, VisibleFingerprint } from "../domain/receipt";
import type { DeploymentResult } from "../domain/result";
import type { NativeMemberObservation, ProviderInventory, ProviderMutationAction } from "../domain/state";
import type { ProviderTarget } from "../domain/target";
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

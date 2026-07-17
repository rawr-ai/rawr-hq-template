import type {
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
} from "../domain/marketplace";
import type { ProjectionDigest } from "../domain/projection";
import type { DeploymentResult } from "../domain/result";
import type {
  NativeMemberObservation,
  ReceiptObservation,
  TargetIdentityObservation,
  TargetIdentitySidecar,
} from "../domain/state";
import type { ProviderTarget } from "../domain/target";

export type ProviderMemberRestoreContext =
  | Readonly<{
    kind: "InstallMember";
    priorMarketplace: null;
    activeMarketplace: ProviderMarketplaceRegistration | null;
  }>
  | Readonly<{
    kind: "EnableMember" | "RetireMember";
    priorMarketplace: ProviderMarketplaceRegistration | null;
    activeMarketplace: ProviderMarketplaceRegistration | null;
    priorProjectionDigest: ProjectionDigest;
  }>;

export interface ProviderOwnerRuntime {
  readIdentity(target: ProviderTarget): Promise<DeploymentResult<TargetIdentityObservation>>;
  removeIdentityExact(input: Readonly<{
    target: ProviderTarget;
    expected: TargetIdentitySidecar;
  }>): Promise<DeploymentResult<null>>;
  readMarketplace(target: ProviderTarget): Promise<DeploymentResult<ProviderMarketplaceObservation>>;
  restoreMarketplaceExact(input: Readonly<{
    target: ProviderTarget;
    expected: ProviderMarketplaceObservation;
    prior: ProviderMarketplaceObservation;
    priorRegistration: ProviderMarketplaceRegistration | null;
  }>): Promise<DeploymentResult<null>>;
  readMember(target: ProviderTarget, nativeIdentity: string): Promise<DeploymentResult<NativeMemberObservation | null>>;
  restoreMemberExact(input: Readonly<{
    context: ProviderMemberRestoreContext;
    target: ProviderTarget;
    expected: NativeMemberObservation | null;
    prior: NativeMemberObservation | null;
  }>): Promise<DeploymentResult<null>>;
  readReceipt(target: ProviderTarget): Promise<DeploymentResult<ReceiptObservation>>;
  restoreReceiptExact(input: Readonly<{
    target: ProviderTarget;
    expected: ReceiptObservation;
    prior: ReceiptObservation;
  }>): Promise<DeploymentResult<null>>;
}

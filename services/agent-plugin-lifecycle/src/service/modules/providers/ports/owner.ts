import type {
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
} from "../model/policy/marketplace";
import type { ProjectionDigest } from "../model/policy/projection";
import type { DeploymentResult } from "../model/errors/deployment-result";
import type {
  NativeMemberObservation,
  ReceiptObservation,
  TargetIdentityObservation,
  TargetIdentitySidecar,
} from "../model/policy/state-machine";
import type { ContentAuthority } from "../../../shared/release";
import type { ProviderTarget } from "../model/dto/provider-target";

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
  readMarketplace(
    target: ProviderTarget,
    contentAuthority: ContentAuthority,
  ): Promise<DeploymentResult<ProviderMarketplaceObservation>>;
  restoreMarketplaceExact(input: Readonly<{
    target: ProviderTarget;
    contentAuthority: ContentAuthority;
    expected: ProviderMarketplaceObservation;
    prior: ProviderMarketplaceObservation;
    priorRegistration: ProviderMarketplaceRegistration | null;
  }>): Promise<DeploymentResult<null>>;
  readMember(
    target: ProviderTarget,
    nativeIdentity: string,
    contentAuthority: ContentAuthority,
  ): Promise<DeploymentResult<NativeMemberObservation | null>>;
  restoreMemberExact(input: Readonly<{
    context: ProviderMemberRestoreContext;
    target: ProviderTarget;
    contentAuthority: ContentAuthority;
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

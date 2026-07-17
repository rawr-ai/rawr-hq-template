import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorRecordBinding,
  type VendorSourceDeclaration,
  type VendorSourceIdentity,
} from "./model/dto/vendor-records";
import type { ContentWorkspaceAsyncPort } from "@rawr/resource-content-workspace";

export {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorRecordBinding,
  type VendorSourceDeclaration,
  type VendorSourceIdentity,
} from "./model/dto/vendor-records";

export interface VendorContentWorkspaceRef {
  readonly locator: string;
  readonly repositoryIdentity: string;
  readonly contentAuthority: string;
  readonly refName: string;
  readonly sourceCommit: string;
  readonly sourceTree: string;
  readonly releaseInputPath: string;
}

export interface VendorStatusRequest {
  readonly contentWorkspace: VendorContentWorkspaceRef;
}

export interface VendorUpdateRequest extends VendorStatusRequest {
  readonly sourceIds: readonly string[];
}

export interface VendorSourceStatus {
  readonly sourceId: string;
  readonly classification:
    | "Current"
    | "UpdateAvailable"
    | "Held"
    | "Diverged"
    | "Invalid"
    | "Unavailable";
  readonly admitted: VendorSourceIdentity | null;
  readonly observed: VendorSourceIdentity | null;
  readonly detail?: string;
}

export interface VendorUpdateIssue {
  readonly code:
    | "UndeclaredSource"
    | "HeldSource"
    | "WrongRepository"
    | "WrongRef"
    | "NonFastForward"
    | "UnsupportedLayout"
    | "PayloadMismatch"
    | "LocalDrift"
    | "AuthoringFailed"
    | "RestorationFailed"
    | "CleanupFailed"
    | "RuntimeFailure";
  readonly detail: string;
  readonly sourceId?: string;
}

export type VendorStatusResult =
  | Readonly<{
    kind: "VendorStatus";
    sources: readonly VendorSourceStatus[];
  }>
  | Readonly<{
    kind: "Rejected";
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
  }>;

export type VendorUpdateResult =
  | Readonly<{
    kind: "ReadOnlyConverged";
    sourceIds: readonly string[];
  }>
  | Readonly<{
    kind: "AuthoredReviewableChanges";
    sourceIds: readonly string[];
    changedPaths: readonly string[];
  }>
  | Readonly<{
    kind: "Rejected";
    sourceIds: readonly string[];
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
  }>
  | Readonly<{
    kind: "FailedRestored";
    sourceIds: readonly string[];
    restoredPaths: readonly string[];
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
  }>
  | Readonly<{
    kind: "RestorationFailed";
    sourceIds: readonly string[];
    unsettledPaths: readonly string[];
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
  }>;

export interface VendorClock {
  readonly now: () => Date;
}

export interface VendorLifecycleRuntime {
  readonly contentWorkspace: ContentWorkspaceAsyncPort;
  readonly clock: VendorClock;
}

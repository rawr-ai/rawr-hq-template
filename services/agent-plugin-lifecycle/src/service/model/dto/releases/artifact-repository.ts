import type {
  ArtifactRef,
  VerifiedArtifactSnapshotV1,
} from "../../../shared/release";

export interface ArtifactReadIssue {
  readonly code:
    | "InvalidStoreRoot"
    | "MissingEntry"
    | "UnexpectedEntry"
    | "InvalidEntryType"
    | "SharedInode"
    | "ModeMismatch"
    | "DigestMismatch"
    | "MalformedEnvelope"
    | "ReferenceMismatch"
    | "ReadFailure";
  readonly detail: string;
}

export type ArtifactReadResult =
  | Readonly<{ kind: "Verified"; snapshot: VerifiedArtifactSnapshotV1 }>
  | Readonly<{ kind: "Missing"; ref: ArtifactRef }>
  | Readonly<{
    kind: "Mismatch";
    ref: ArtifactRef;
    issues: readonly [ArtifactReadIssue, ...ArtifactReadIssue[]];
  }>;

export type ArtifactStoreFailpointEvent =
  | Readonly<{ kind: "AfterStagingFile"; path: string }>
  | Readonly<{ kind: "AfterStagingFlush" }>
  | Readonly<{ kind: "AfterStagingVerification" }>
  | Readonly<{ kind: "BeforeNoReplacePublication" }>
  | Readonly<{ kind: "AfterNoReplacePublication" }>
  | Readonly<{ kind: "AfterFinalVerification" }>;

export type ArtifactStoreFailpoint = (event: ArtifactStoreFailpointEvent) => void | Promise<void>;

export type PublicationGuardResult =
  | Readonly<{ kind: "Allowed" }>
  | Readonly<{ kind: "Rejected"; failure: string }>;

export interface ArtifactPublicationOptions {
  readonly failpoint?: ArtifactStoreFailpoint;
  readonly beforePublication?: () => Promise<PublicationGuardResult>;
}

export type ArtifactPublicationResult =
  | Readonly<{ kind: "Published"; ref: ArtifactRef }>
  | Readonly<{ kind: "ReadOnlyConverged"; ref: ArtifactRef }>
  | Readonly<{
    kind: "Rejected";
    ref: ArtifactRef;
    failure: string;
    cleanupFailure?: string;
  }>
  | Readonly<{
    kind: "Unsettled";
    ref: ArtifactRef;
    failure: string;
    observation: "Verified" | "Missing" | "Mismatch" | "Unknown";
    cleanupFailure?: string;
  }>;

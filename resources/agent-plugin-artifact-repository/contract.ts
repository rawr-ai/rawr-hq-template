import type { Effect } from "effect";

export type ArtifactFileMode = 0o444 | 0o644 | 0o755;

/** Mechanical address inside one explicit immutable artifact repository. */
export interface ArtifactObjectAddress {
  readonly repositoryRoot: string;
  readonly namespace: readonly [string, ...string[]];
  readonly objectId: string;
}

export interface ArtifactTreeEntry {
  readonly path: string;
  readonly mode: ArtifactFileMode;
  readonly bytes: Uint8Array;
}

export interface ArtifactTreeSnapshot {
  readonly address: ArtifactObjectAddress;
  readonly entries: readonly ArtifactTreeEntry[];
}

export interface ArtifactRepositoryIssue {
  readonly code:
    | "UnexpectedEntry"
    | "InvalidEntryType"
    | "AliasedEntry"
    | "SharedInode"
    | "ModeMismatch"
    | "LimitExceeded"
    | "IdentityChanged"
    | "ReadFailure";
  readonly path?: string;
  readonly detail: string;
}

export type ArtifactTreeObservation =
  | Readonly<{ kind: "Missing"; address: ArtifactObjectAddress }>
  | Readonly<{ kind: "Present"; snapshot: ArtifactTreeSnapshot }>
  | Readonly<{
    kind: "Mismatch";
    address: ArtifactObjectAddress;
    issues: readonly [ArtifactRepositoryIssue, ...ArtifactRepositoryIssue[]];
  }>;

export type ArtifactEvidenceObservation =
  | Readonly<{ kind: "Missing"; address: ArtifactObjectAddress }>
  | Readonly<{ kind: "Present"; address: ArtifactObjectAddress; bytes: Uint8Array }>
  | Readonly<{
    kind: "Mismatch";
    address: ArtifactObjectAddress;
    issues: readonly [ArtifactRepositoryIssue, ...ArtifactRepositoryIssue[]];
  }>;

export type ArtifactPublicationObservation = "Present" | "Missing" | "Mismatch" | "Unknown";

export type ArtifactPublicationResult =
  | Readonly<{ kind: "Published"; address: ArtifactObjectAddress }>
  | Readonly<{ kind: "ReadOnlyConverged"; address: ArtifactObjectAddress }>
  | Readonly<{
    kind: "Occupied";
    address: ArtifactObjectAddress;
    observation: Exclude<ArtifactPublicationObservation, "Unknown">;
  }>
  | Readonly<{ kind: "Rejected"; address: ArtifactObjectAddress; failure: string }>
  | Readonly<{
    kind: "Unsettled";
    address: ArtifactObjectAddress;
    failure: string;
    observation: ArtifactPublicationObservation;
  }>;

export type ArtifactCommitDecision =
  | Readonly<{ kind: "Proceed" }>
  | Readonly<{ kind: "Reject"; failure: string }>;

export type ArtifactRepositoryFailureReason =
  | "InvalidInput"
  | "Aliased"
  | "UnsupportedEntry"
  | "LimitExceeded"
  | "IdentityChanged"
  | "FilesystemFailed"
  | "NoReplaceUnsupported";

export interface ArtifactRepositoryFailure {
  readonly _tag: "ArtifactRepositoryFailure";
  readonly operation: "read-tree" | "publish-tree" | "read-evidence" | "publish-evidence" | "cleanup";
  readonly reason: ArtifactRepositoryFailureReason;
  readonly path?: string;
  readonly detail: string;
}

export interface ArtifactReadLimits {
  readonly maxEntries: number;
  readonly maxBytes: number;
}

export interface ArtifactPublicationControl {
  /** Runs after private staging verifies and immediately before no-replace publication. */
  readonly beforeCommit?: () => Promise<ArtifactCommitDecision>;
}

export interface ArtifactRepositoryResource<R = never> {
  readonly readTree: (input: Readonly<{
    address: ArtifactObjectAddress;
    limits: ArtifactReadLimits;
  }>) => Effect.Effect<ArtifactTreeObservation, ArtifactRepositoryFailure, R>;

  readonly publishTree: (input: Readonly<{
    address: ArtifactObjectAddress;
    entries: readonly ArtifactTreeEntry[];
    limits: ArtifactReadLimits;
    control?: ArtifactPublicationControl;
  }>) => Effect.Effect<ArtifactPublicationResult, ArtifactRepositoryFailure, R>;

  readonly readEvidence: (input: Readonly<{
    address: ArtifactObjectAddress;
    maxBytes: number;
  }>) => Effect.Effect<ArtifactEvidenceObservation, ArtifactRepositoryFailure, R>;

  readonly publishEvidence: (input: Readonly<{
    address: ArtifactObjectAddress;
    bytes: Uint8Array;
    maxBytes: number;
    control?: ArtifactPublicationControl;
  }>) => Effect.Effect<ArtifactPublicationResult, ArtifactRepositoryFailure, R>;
}

export interface ArtifactRepositoryAsyncPort {
  readonly readTree: (
    input: Parameters<ArtifactRepositoryResource["readTree"]>[0],
  ) => Promise<ArtifactTreeObservation>;
  readonly publishTree: (
    input: Parameters<ArtifactRepositoryResource["publishTree"]>[0],
  ) => Promise<ArtifactPublicationResult>;
  readonly readEvidence: (
    input: Parameters<ArtifactRepositoryResource["readEvidence"]>[0],
  ) => Promise<ArtifactEvidenceObservation>;
  readonly publishEvidence: (
    input: Parameters<ArtifactRepositoryResource["publishEvidence"]>[0],
  ) => Promise<ArtifactPublicationResult>;
}

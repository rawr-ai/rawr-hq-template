import type { Effect } from "effect";

export type PackageArchiveEntryMode = 0o644 | 0o755;

/** Already-selected and already-ordered archive entry supplied by the semantic owner. */
export interface PackageArchiveEntry {
  readonly path: string;
  readonly mode: PackageArchiveEntryMode;
  readonly bytes: Uint8Array;
}

export interface CoworkV1ArchiveEncodingRequest {
  readonly entries: readonly PackageArchiveEntry[];
  readonly comment: string;
  readonly fixedTimestamp: string;
  readonly compression: "store";
  readonly zip64: false;
}

export interface PackageOutputPublicationRequest {
  readonly outputPath: string;
  readonly bytes: Uint8Array;
  /** Bound selected by the semantic owner for observing a prior output. */
  readonly maxPriorOutputBytes: number;
  readonly control?: PackageOutputPublicationControl;
}

export type PackageOutputPublicationPoint =
  | "AfterOutputObserved"
  | "BeforeCommit"
  | "AfterCommit"
  | "BeforeFinalVerification";

export interface PackageOutputPublicationEvent {
  readonly point: PackageOutputPublicationPoint;
  readonly outputPath: string;
  readonly temporaryPath?: string;
}

export interface PackageOutputPublicationControl {
  readonly onEvent?: (event: PackageOutputPublicationEvent) => Promise<void>;
}

export type PackageOutputFailureReason =
  | "InvalidInput"
  | "ArchiveEncodingFailed"
  | "OutputParentUnsafe"
  | "OutputUnsafe"
  | "OutputChanged"
  | "TemporaryFailed"
  | "OutputCommitFailed"
  | "OutputVerifyFailed"
  | "FilesystemFailed";

export interface PackageOutputFailure {
  readonly _tag: "PackageOutputFailure";
  readonly operation: "encode-archive" | "publish-output" | "cleanup";
  readonly reason: PackageOutputFailureReason;
  readonly phase: string;
  readonly path?: string;
  readonly detail: string;
}

export type PackageOutputPublicationResult =
  | Readonly<{ kind: "ReadOnlyConverged" }>
  | Readonly<{
      kind: "OutputReplacedVerified";
      priorOutput: "Absent" | "Replaced";
    }>
  | Readonly<{
      kind: "RejectedBeforeOutputMutation";
      primaryFailure: PackageOutputFailure;
      cleanupFailure?: PackageOutputFailure;
    }>
  | Readonly<{
      kind: "OutputUnsettled";
      primaryFailure: PackageOutputFailure;
      cleanupFailure?: PackageOutputFailure;
    }>;

/** Mechanical archive encoding and package-output publication capability. */
export interface AgentPluginPackageOutputResource<R = never> {
  readonly encodeCoworkV1: (
    input: CoworkV1ArchiveEncodingRequest
  ) => Effect.Effect<Uint8Array, PackageOutputFailure, R>;

  readonly publish: (
    input: PackageOutputPublicationRequest
  ) => Effect.Effect<PackageOutputPublicationResult, PackageOutputFailure, R>;
}

/** Promise projection for callers that bind the provider runtime at their edge. */
export interface AgentPluginPackageOutputAsyncPort {
  readonly encodeCoworkV1: (
    input: Parameters<AgentPluginPackageOutputResource["encodeCoworkV1"]>[0]
  ) => Promise<Uint8Array>;
  readonly publish: (
    input: Parameters<AgentPluginPackageOutputResource["publish"]>[0]
  ) => Promise<PackageOutputPublicationResult>;
}

import type { ArtifactRef } from "../../../../shared/release/index";

export const COWORK_PACKAGE_FORMAT = "cowork-v1" as const;

export type PackageDigest = `pkg1_${string}`;

export interface PackageAgentPluginRequest {
  readonly artifactRef: ArtifactRef;
  readonly format: typeof COWORK_PACKAGE_FORMAT;
  readonly outputPath: string;
}

export type PackagingFailureCode =
  | "InvalidRequest"
  | "ArtifactMissing"
  | "ArtifactMismatch"
  | "ArtifactSnapshotMismatch"
  | "PackageRenderFailed"
  | "OutputParentUnsafe"
  | "OutputUnsafe"
  | "OutputChanged"
  | "TemporaryCreateFailed"
  | "TemporaryWriteFailed"
  | "TemporaryVerifyFailed"
  | "TemporaryCleanupBlocked"
  | "TemporaryCleanupFailed"
  | "OutputCommitFailed"
  | "OutputVerifyFailed"
  | "FailpointFailed";

export interface PackagingFailure {
  readonly code: PackagingFailureCode;
  readonly phase: string;
  readonly message: string;
}

interface PackageResultIdentity {
  readonly artifactRef: ArtifactRef;
  readonly format: typeof COWORK_PACKAGE_FORMAT;
  readonly outputPath: string;
  readonly packageDigest: PackageDigest;
}

export type PackageAgentPluginResult =
  | {
    readonly kind: "RejectedBeforeOutputMutation";
    readonly primaryFailure: PackagingFailure;
    readonly cleanupFailure?: PackagingFailure;
  }
  | ({ readonly kind: "ReadOnlyConverged" } & PackageResultIdentity)
  | ({
    readonly kind: "OutputReplacedVerified";
    readonly priorOutput: "Absent" | "Replaced";
  } & PackageResultIdentity)
  | ({
    readonly kind: "OutputUnsettled";
    readonly primaryFailure: PackagingFailure;
    readonly cleanupFailure?: PackagingFailure;
  } & PackageResultIdentity);

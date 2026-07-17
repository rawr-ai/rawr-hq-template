import type { PackageDigest, PackagingFailure } from "./contract";

export type PackageOutputFailpoint =
  | "AfterOutputCaptured"
  | "AfterTemporaryCreated"
  | "AfterTemporaryWritten"
  | "AfterTemporaryVerified"
  | "BeforeOutputCommit"
  | "AfterTemporaryPrecommitRead"
  | "AfterParentPrecommitRead"
  | "AfterOutputPrecommitRead"
  | "BeforePublicationLinkUnlink"
  | "AfterOutputCommit"
  | "BeforeFinalVerification";

export interface PackageOutputFailpointContext {
  readonly outputPath: string;
  readonly temporaryPath?: string;
}

export interface PackageOutputFailpoints {
  hit(point: PackageOutputFailpoint, context: PackageOutputFailpointContext): Promise<void>;
}

export interface AtomicPackageOutputRequest {
  readonly outputPath: string;
  readonly bytes: Uint8Array;
  readonly packageDigest: PackageDigest;
}

export type AtomicPackageOutputResult =
  | { readonly kind: "ReadOnlyConverged" }
  | {
    readonly kind: "OutputReplacedVerified";
    readonly priorOutput: "Absent" | "Replaced";
  }
  | {
    readonly kind: "RejectedBeforeOutputMutation";
    readonly primaryFailure: PackagingFailure;
    readonly cleanupFailure?: PackagingFailure;
  }
  | {
    readonly kind: "OutputUnsettled";
    readonly primaryFailure: PackagingFailure;
    readonly cleanupFailure?: PackagingFailure;
  };

export interface AtomicPackageOutput {
  publish(request: AtomicPackageOutputRequest): Promise<AtomicPackageOutputResult>;
}

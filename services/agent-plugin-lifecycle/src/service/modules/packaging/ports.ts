import type {
  ArtifactReadIssue,
  ArtifactReader,
  ArtifactReadResult,
} from "./internal/artifact-reader";
import type {
  AtomicPackageOutput,
  AtomicPackageOutputRequest,
  AtomicPackageOutputResult,
  PackageOutputFailpoint,
  PackageOutputFailpointContext,
  PackageOutputFailpoints,
} from "./internal/atomic-output";
import type {
  PackageAgentPluginRequest,
  PackageAgentPluginResult,
  PackageDigest,
  PackagingFailure,
  PackagingFailureCode,
} from "./internal/contract";
import type {
  CoworkV1ArchiveEntry,
  CoworkV1ArchiveRequest,
  CoworkV1Runtime,
} from "./internal/cowork-v1";

/** Construction-time capabilities used by the packaging module. */
export interface PackagingLifecycleRuntime {
  readonly artifactReader: ArtifactReader;
  readonly output: AtomicPackageOutput;
  readonly coworkV1: CoworkV1Runtime;
}

export type {
  ArtifactReadIssue,
  ArtifactReader,
  ArtifactReadResult,
  AtomicPackageOutput,
  AtomicPackageOutputRequest,
  AtomicPackageOutputResult,
  CoworkV1ArchiveEntry,
  CoworkV1ArchiveRequest,
  CoworkV1Runtime,
  PackageAgentPluginRequest,
  PackageAgentPluginResult,
  PackageDigest,
  PackageOutputFailpoint,
  PackageOutputFailpointContext,
  PackageOutputFailpoints,
  PackagingFailure,
  PackagingFailureCode,
};

export type { ResourcePackageOutputOptions } from "./internal/resource-package-output";

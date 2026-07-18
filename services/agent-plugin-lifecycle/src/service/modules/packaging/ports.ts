import type {
  ArtifactReadIssue,
  ArtifactReader,
  ArtifactReadResult,
} from "./model/dto/artifact-reader";
import type {
  AtomicPackageOutput,
  AtomicPackageOutputRequest,
  AtomicPackageOutputResult,
  PackageOutputFailpoint,
  PackageOutputFailpointContext,
  PackageOutputFailpoints,
} from "./model/dto/atomic-output";
import type {
  PackageAgentPluginRequest,
  PackageAgentPluginResult,
  PackageDigest,
  PackagingFailure,
  PackagingFailureCode,
} from "./model/dto/packaging-lifecycle";
import type {
  CoworkV1ArchiveEntry,
  CoworkV1ArchiveRequest,
  CoworkV1Runtime,
} from "./model/helpers/cowork-v1";

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

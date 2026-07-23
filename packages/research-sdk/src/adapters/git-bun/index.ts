export {
  BunPackages,
  type BunPackagesShape,
  makeBunPackagesLayer,
} from "./bun-adapter.js";
export {
  type ArtifactPathMapping,
  ArtifactPathMappingSchema,
  type BunPackageConfig,
  BunPackageConfigSchema,
  type BunPackageSubstrateIdentity,
  BunPackageSubstrateIdentitySchema,
  type ExactGitRevision,
  ExactGitRevisionSchema,
  type GitArtifactConfig,
  GitArtifactConfigSchema,
  type GitPatchSubstrateIdentity,
  GitPatchSubstrateIdentitySchema,
  type PackedPackageDescriptor,
  PackedPackageDescriptorSchema,
  type PatchDescriptor,
  PatchDescriptorSchema,
} from "./contracts.js";
export { gitRepositoryIdentity } from "./git.js";
export {
  type ApplyPatchRequest,
  type CapturedPatchResult,
  type CapturePatchRequest,
  GitArtifacts,
  type GitArtifactsShape,
  type MaterializeRevisionRequest,
  makeGitArtifactsLayer,
} from "./git-adapter.js";
export type {
  GitBunError,
  GitBunIdentityMismatch,
  GitBunInvalidInput,
  GitBunOperationFailed,
} from "./internal.js";
export type {
  PackSdkPackageRequest,
  VerifyInstalledSdkPackageRequest,
} from "./package.js";

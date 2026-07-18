import type {
  CompleteSetArtifactRef,
  ReleaseArtifactRef,
} from "./artifact-ref";
import type { AgentPluginRelease } from "./release";
import type { AgentPluginReleaseSet } from "./release-set";
import type {
  ContentDigest,
  NormalizedFileMode,
  ReleaseRelativePath,
} from "./primitives";

/** An ownership-transferred payload file. Readers must return a fresh `bytes` copy. */
export interface VerifiedPayloadFileV1 {
  readonly path: ReleaseRelativePath;
  readonly mode: NormalizedFileMode;
  readonly contentDigest: ContentDigest;
  readonly bytes: Uint8Array;
}

/** Neutral verified artifact data. This package intentionally exposes no public snapshot constructor. */
export interface VerifiedReleaseArtifactV1 {
  readonly kind: "release";
  readonly ref: ReleaseArtifactRef;
  readonly release: AgentPluginRelease;
  readonly files: readonly VerifiedPayloadFileV1[];
}

export type VerifiedArtifactSnapshotV1 =
  | VerifiedReleaseArtifactV1
  | Readonly<{
    kind: "complete-set";
    ref: CompleteSetArtifactRef;
    releaseSet: AgentPluginReleaseSet;
    members: readonly VerifiedReleaseArtifactV1[];
  }>;

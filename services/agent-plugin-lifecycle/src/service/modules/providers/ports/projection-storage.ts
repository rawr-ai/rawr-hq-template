import type { NormalizedFileMode, ReleaseRelativePath } from "../../../shared/release";

import type { MarketplaceProjectionDigest } from "../model/policy/marketplace";
import type {
  ProjectionDigest,
  ProviderMemberFingerprint,
  ProviderSourceDigest,
} from "../model/policy/projection";
import type { DeploymentResult } from "../model/errors/deployment-result";

export type ProjectionRecordKey =
  | Readonly<{ kind: "manifest"; projectionDigest: ProjectionDigest }>
  | Readonly<{ kind: "member"; memberFingerprint: ProviderMemberFingerprint }>;

export type ProjectionRecordObservation =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "present"; bytes: Uint8Array }>;

export interface ProjectionRecordPublication {
  readonly kind: "existing" | "published";
}

/**
 * A flat immutable byte collection. It owns acquisition and atomic publication,
 * while the lifecycle service owns every record codec and semantic digest.
 */
export interface FlatProjectionRecordCollection {
  read(key: ProjectionRecordKey): Promise<DeploymentResult<ProjectionRecordObservation>>;
  publish(
    key: ProjectionRecordKey,
    bytes: Uint8Array,
  ): Promise<DeploymentResult<ProjectionRecordPublication>>;
}

export interface ImmutableProviderTreeFile {
  readonly path: ReleaseRelativePath;
  readonly mode: NormalizedFileMode;
  readonly bytes: Uint8Array;
}

export type ImmutableProviderTreeKey =
  | Readonly<{ kind: "member"; memberFingerprint: ProviderMemberFingerprint }>
  | Readonly<{
    kind: "marketplace";
    projectionDigest: MarketplaceProjectionDigest;
    sourceDigest: ProviderSourceDigest;
  }>;

export type ImmutableProviderTreeObservation =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "present"; files: readonly ImmutableProviderTreeFile[] }>;

export interface ImmutableProviderTreePublication {
  readonly kind: "existing" | "published";
}

/**
 * An immutable relative-file tree collection keyed only by semantic identity.
 * No storage address or provider-home path crosses this port.
 */
export interface ImmutableProviderTreeCollection {
  read(key: ImmutableProviderTreeKey): Promise<DeploymentResult<ImmutableProviderTreeObservation>>;
  publish(
    key: ImmutableProviderTreeKey,
    files: readonly ImmutableProviderTreeFile[],
  ): Promise<DeploymentResult<ImmutableProviderTreePublication>>;
}

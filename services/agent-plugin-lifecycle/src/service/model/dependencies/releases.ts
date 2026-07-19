import type {
  AgentPluginRelease,
  AgentPluginReleaseSet,
  ArtifactRef,
  ReleaseArtifactRef,
} from "../../shared/release";
import type {
  ArtifactPublicationOptions,
  ArtifactPublicationResult,
  ArtifactReadIssue,
  ArtifactReadResult,
  ArtifactStoreFailpoint,
  ArtifactStoreFailpointEvent,
  PublicationGuardResult,
} from "../dto/releases/artifact-repository";
import type {
  ContentWorkspaceInspection,
  ContentWorkspacePolicy,
  ContentWorkspaceSnapshot,
  SourceEligibilityIssue,
  SourceEligibilityIssueCode,
  StagedBlobObservation,
  StagedIndexBindingObservation,
  StagedIndexObservation,
  StagedIndexObservationRequest,
  StagedIndexObservationResult,
  StagedObservationFailureReason,
  StagedWorkspaceAnchorObservation,
} from "../dto/releases/content-workspace";

export type BuildFailpointEvent =
  | Readonly<{ kind: "AfterInitialInspection" }>
  | Readonly<{ kind: "BeforeStagingRevalidation" }>
  | Readonly<{ kind: "AfterStagingRevalidation" }>
  | Readonly<{ kind: "BeforeFinalRevalidation" }>
  | Readonly<{ kind: "AfterFinalRevalidation" }>
  | Readonly<{ kind: "AfterMemberPublication"; index: number; ref: ReleaseArtifactRef }>
  | Readonly<{ kind: "BeforeSetPublication" }>
  | Readonly<{ kind: "AfterSetPublication" }>;

export type BuildFailpoint = (event: BuildFailpointEvent) => void | Promise<void>;

export interface ContentWorkspaceSnapshotReader {
  inspect(policy: ContentWorkspacePolicy): Promise<ContentWorkspaceInspection>;
  revalidate(policy: ContentWorkspacePolicy, eligibilityBinding: string): Promise<ContentWorkspaceInspection>;
}

export interface StagedContentWorkspaceObservationReader {
  observe(request: StagedIndexObservationRequest): Promise<StagedIndexObservationResult>;
}

export interface ArtifactReader {
  read(ref: ArtifactRef): Promise<ArtifactReadResult>;
}

export interface ArtifactStore extends ArtifactReader {
  publishRelease(
    release: AgentPluginRelease,
    options?: ArtifactPublicationOptions,
  ): Promise<ArtifactPublicationResult>;
  publishReleaseSet(
    releaseSet: AgentPluginReleaseSet,
    options?: ArtifactPublicationOptions,
  ): Promise<ArtifactPublicationResult>;
}

export interface RetentionPinsReader {
  read(): Promise<unknown>;
}

export interface RetentionInventoryReader {
  read(): Promise<unknown>;
}

export interface ReleaseRetentionReaders {
  readonly pins: RetentionPinsReader;
  readonly inventory: RetentionInventoryReader;
}

export type {
  ArtifactPublicationOptions,
  ArtifactPublicationResult,
  ArtifactReadIssue,
  ArtifactReadResult,
  ArtifactStoreFailpoint,
  ArtifactStoreFailpointEvent,
  ContentWorkspaceInspection,
  ContentWorkspacePolicy,
  ContentWorkspaceSnapshot,
  PublicationGuardResult,
  SourceEligibilityIssue,
  SourceEligibilityIssueCode,
  StagedBlobObservation,
  StagedIndexBindingObservation,
  StagedIndexObservation,
  StagedIndexObservationRequest,
  StagedIndexObservationResult,
  StagedObservationFailureReason,
  StagedWorkspaceAnchorObservation,
};

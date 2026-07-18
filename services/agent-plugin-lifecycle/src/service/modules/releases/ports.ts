import type {
  AgentPluginRelease,
  AgentPluginReleaseSet,
  ArtifactRef,
  MechanicalEvidenceReader,
} from "../../shared/release";
import type {
  ArtifactPublicationOptions,
  ArtifactPublicationResult,
  ArtifactReadIssue,
  ArtifactReadResult,
  ArtifactStoreFailpoint,
  ArtifactStoreFailpointEvent,
  PublicationGuardResult,
} from "./model/dto/artifact-repository";
import type {
  ContentWorkspaceInspection,
  ContentWorkspacePolicy,
  ContentWorkspaceSnapshot,
  SourceEligibilityIssue,
  SourceEligibilityIssueCode,
} from "./model/dto/content-workspace";
import type { BuildFailpoint } from "./model/dto/release-lifecycle";
import type {
  BlockedPinnedGraph,
  RetentionInventoryEntry,
  RetentionIssue,
  RetentionPinsV1,
  RetentionPlan,
  RetentionRef,
  RetentionResult,
  RetentionSpacePolicyV1,
} from "./model/dto/retention";

export interface ContentWorkspaceSnapshotReader {
  inspect(policy: ContentWorkspacePolicy): Promise<ContentWorkspaceInspection>;
  revalidate(policy: ContentWorkspacePolicy, eligibilityBinding: string): Promise<ContentWorkspaceInspection>;
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

export interface ReleaseLifecycleRuntime {
  readonly source: ContentWorkspaceSnapshotReader;
  readonly artifacts: ArtifactStore;
  readonly evidence?: MechanicalEvidenceReader;
  readonly retention?: Readonly<{
    readonly pins: RetentionPinsReader;
    readonly inventory: RetentionInventoryReader;
  }>;
  readonly controls?: Readonly<{
    buildFailpoint?: BuildFailpoint;
    artifactFailpoint?: ArtifactStoreFailpoint;
  }>;
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
  BlockedPinnedGraph,
  RetentionInventoryEntry,
  RetentionIssue,
  RetentionPinsV1,
  RetentionPlan,
  RetentionRef,
  RetentionResult,
  RetentionSpacePolicyV1,
  SourceEligibilityIssue,
  SourceEligibilityIssueCode,
};

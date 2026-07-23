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

export interface ContentWorkspaceSnapshotReader {
  inspect(policy: ContentWorkspacePolicy): Promise<ContentWorkspaceInspection>;
  revalidate(
    policy: ContentWorkspacePolicy,
    eligibilityBinding: string
  ): Promise<ContentWorkspaceInspection>;
}

export interface StagedContentWorkspaceObservationReader {
  observe(request: StagedIndexObservationRequest): Promise<StagedIndexObservationResult>;
}

export type {
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
};

import type {
  StagedBlobObservation,
  StagedIndexBindingObservation,
  StagedIndexObservation,
  StagedIndexObservationRequest,
  StagedIndexObservationResult,
  StagedObservationFailureReason,
  StagedWorkspaceAnchorObservation,
} from "../dto/releases/content-workspace";

export interface StagedContentWorkspaceObservationReader {
  observe(request: StagedIndexObservationRequest): Promise<StagedIndexObservationResult>;
}

export type {
  StagedBlobObservation,
  StagedIndexBindingObservation,
  StagedIndexObservation,
  StagedIndexObservationRequest,
  StagedIndexObservationResult,
  StagedObservationFailureReason,
  StagedWorkspaceAnchorObservation,
};

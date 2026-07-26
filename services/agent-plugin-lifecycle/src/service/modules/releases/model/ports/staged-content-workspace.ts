import type { ContentWorkspaceGitReadAsyncPort } from "@rawr/resource-content-workspace";

import type {
  StagedIndexObservationRequest,
  StagedIndexObservationResult,
} from "#agent-plugin-lifecycle-service/modules/releases/model/dto/staged-content-workspace";

/**
 * Narrows the outside content-workspace resource to the staged Git observation
 * operation admitted through the service context.
 */
export type ResourceContentWorkspaceStagedObservationPort = Pick<
  ContentWorkspaceGitReadAsyncPort,
  "observeGitStagedIndex"
>;

/**
 * Supplies Releases operations with normalized opening and closing staged
 * observations while the module retains eligibility-policy ownership.
 */
export interface StagedContentWorkspaceObservationReader {
  observe(request: StagedIndexObservationRequest): Promise<StagedIndexObservationResult>;
}

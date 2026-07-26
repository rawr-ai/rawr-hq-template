import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";

import type {
  SelectedContentChannelResolutionInput,
  SelectedContentResolution,
  SelectedContentWorkspaceResolutionInput,
} from "#agent-plugin-lifecycle-service/modules/providers/model/dto/selected-content";

/**
 * Narrows the host content-workspace capability to the exact Git and local reads required to
 * derive provider-selected content.
 */
export type SelectedContentReadPort = Pick<
  ContentWorkspaceNodeAsyncPort,
  | "inspectGitRef"
  | "inspectGitWorkspace"
  | "readGitTree"
  | "readGitBlob"
  | "readGitBlobs"
  | "captureGitWorkspaceEvidence"
  | "readFile"
>;

/**
 * Resolves invocation-local desired content for provider status, test, and sync while leaving
 * Git objects and native inventories as the truthful source owners.
 */
export interface SelectedContentResolver {
  resolveWorkspace(
    input: SelectedContentWorkspaceResolutionInput
  ): Promise<SelectedContentResolution>;
  resolveChannel(input: SelectedContentChannelResolutionInput): Promise<SelectedContentResolution>;
}

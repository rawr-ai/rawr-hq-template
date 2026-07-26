import type { ContentWorkspaceResource } from "@rawr/resource-content-workspace";
import type { Effect } from "effect";

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
  ContentWorkspaceResource<never>,
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
  ): Effect.Effect<SelectedContentResolution>;
  resolveChannel(
    input: SelectedContentChannelResolutionInput
  ): Effect.Effect<SelectedContentResolution>;
}

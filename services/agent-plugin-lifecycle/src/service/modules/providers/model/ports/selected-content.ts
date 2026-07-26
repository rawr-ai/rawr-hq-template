import type { ContentWorkspaceResource } from "@rawr/resource-content-workspace";
import type { Effect } from "effect";

import type {
  SelectedContentChannelResolutionInput,
  SelectedContentResolution,
} from "../dto/selected-content";

/**
 * Narrows the host content-workspace capability to the exact Git reads used by
 * Provider status and sync channel resolution.
 */
export type SelectedContentReadPort = Pick<
  ContentWorkspaceResource<never>,
  "inspectGitRef" | "readGitTree" | "readGitBlob" | "readGitBlobs"
>;

/**
 * Resolves governed channel content for provider status and sync while leaving
 * Git objects and native inventories as the truthful source owners.
 */
export interface SelectedContentResolver {
  resolveChannel(
    input: SelectedContentChannelResolutionInput
  ): Effect.Effect<SelectedContentResolution>;
}

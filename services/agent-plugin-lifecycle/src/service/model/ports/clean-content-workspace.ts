import type { ContentWorkspaceResource } from "@rawr/resource-content-workspace";
import type { Effect } from "effect";
import type {
  ContentWorkspaceInspection,
  ContentWorkspacePolicy,
} from "../dto/releases/content-workspace";

/**
 * Narrows the content-workspace resource to the exact Git observations needed
 * to establish and revalidate one clean release source.
 */
export type ResourceContentWorkspaceSnapshotReadPort = Pick<
  ContentWorkspaceResource<never>,
  | "inspectGitWorkspace"
  | "readGitTree"
  | "readGitBlob"
  | "readGitBlobs"
  | "captureGitWorkspaceEvidence"
>;

/**
 * Supplies release and packaging operations with one neutral clean-content
 * observation boundary while the service retains ownership of source policy.
 */
export interface CleanContentWorkspaceReader {
  inspect(policy: ContentWorkspacePolicy): Effect.Effect<ContentWorkspaceInspection>;
  revalidate(
    policy: ContentWorkspacePolicy,
    eligibilityBinding: string
  ): Effect.Effect<ContentWorkspaceInspection>;
}

import type { ContentWorkspaceGitReadAsyncPort } from "@rawr/resource-content-workspace";
import type {
  ContentWorkspaceInspection,
  ContentWorkspacePolicy,
} from "../dto/releases/content-workspace";

/**
 * Narrows the content-workspace resource to the exact Git observations needed
 * to establish and revalidate one clean release source.
 */
export type ResourceContentWorkspaceSnapshotReadPort = Pick<
  ContentWorkspaceGitReadAsyncPort,
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
  inspect(policy: ContentWorkspacePolicy): Promise<ContentWorkspaceInspection>;
  revalidate(
    policy: ContentWorkspacePolicy,
    eligibilityBinding: string
  ): Promise<ContentWorkspaceInspection>;
}

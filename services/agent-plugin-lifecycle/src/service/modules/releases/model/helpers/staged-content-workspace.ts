import type {
  ContentWorkspaceFailure,
  GitStagedIndexBinding,
  GitStagedIndexObservation,
  GitWorkspaceAnchor,
} from "@rawr/resource-content-workspace";

import type {
  StagedIndexBindingObservation,
  StagedIndexObservation,
  StagedIndexObservationRequest,
  StagedIndexObservationResult,
  StagedWorkspaceAnchorObservation,
} from "#agent-plugin-lifecycle-service/modules/releases/model/dto/staged-content-workspace";
import type {
  ResourceContentWorkspaceStagedObservationPort,
  StagedContentWorkspaceObservationReader,
} from "#agent-plugin-lifecycle-service/modules/releases/model/ports/staged-content-workspace";

/**
 * Adapts the content-workspace resource into the Releases-owned staged
 * observation boundary used by eligibility and release-input refresh.
 */
export function createStagedContentWorkspaceObservationReader(
  binding: Readonly<{
    contentWorkspace: ResourceContentWorkspaceStagedObservationPort;
  }>
): StagedContentWorkspaceObservationReader {
  return Object.freeze({
    async observe(request: StagedIndexObservationRequest) {
      try {
        const observation = await binding.contentWorkspace.observeGitStagedIndex({
          locator: request.locator,
          remoteSelection: { kind: "Named", remoteName: request.remoteName },
          refName: request.refName,
          materializedPaths: request.materializedPaths,
          materializedRoots: request.materializedRoots,
          maxEntries: request.maxEntries,
          maxIndexBytes: request.maxIndexBytes,
          maxBlobBytes: request.maxBlobBytes,
        });
        return observed(observation);
      } catch (error) {
        return failed(error);
      }
    },
  });
}

function observed(observation: GitStagedIndexObservation): StagedIndexObservationResult {
  return Object.freeze({
    kind: "Observed",
    observation: Object.freeze({
      opening: bindingObservation(observation.opening),
      blobs: Object.freeze(
        observation.blobs.map((blob) =>
          Object.freeze({
            objectId: blob.objectId,
            bytes: blob.bytes,
          })
        )
      ),
      closing: bindingObservation(observation.closing),
    }) satisfies StagedIndexObservation,
  });
}

function bindingObservation(binding: GitStagedIndexBinding): StagedIndexBindingObservation {
  return Object.freeze({
    anchor: anchorObservation(binding.anchor),
    indexEntries: binding.indexEntries,
  });
}

function anchorObservation(anchor: GitWorkspaceAnchor): StagedWorkspaceAnchorObservation {
  return Object.freeze({
    root: anchor.root,
    rootDevice: anchor.rootDevice,
    rootInode: anchor.rootInode,
    refName: anchor.refName,
    commit: anchor.commit,
    refCommit: anchor.refCommit,
    tree: anchor.tree,
    objectFormat: anchor.objectFormat,
    remoteUrls: Object.freeze([...anchor.remoteUrls]),
  });
}

function failed(error: unknown): StagedIndexObservationResult {
  if (!isContentWorkspaceFailure(error)) {
    return Object.freeze({
      kind: "Failed",
      reason: "Unavailable",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  switch (error.reason) {
    case "Aliased":
      return Object.freeze({ kind: "Failed", reason: "Aliased", detail: error.detail });
    case "InvalidInput":
      return Object.freeze({ kind: "Failed", reason: "InvalidInput", detail: error.detail });
    case "LimitExceeded":
      return Object.freeze({ kind: "Failed", reason: "LimitExceeded", detail: error.detail });
    default:
      return Object.freeze({ kind: "Failed", reason: "Unavailable", detail: error.detail });
  }
}

function isContentWorkspaceFailure(error: unknown): error is ContentWorkspaceFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "ContentWorkspaceFailure"
  );
}

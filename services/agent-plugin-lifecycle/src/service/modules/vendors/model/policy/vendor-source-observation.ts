import type {
  AncestryInput,
  MaterializeRemoteInput,
  ObserveRemoteInput,
  RemoteContentTree,
} from "@rawr/resource-versioned-content";

import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
} from "../../../../shared/release";
import type { VendorUpdateIssue } from "../dto/vendor-operations";
import type {
  VendorDeclaredSourceObservation,
  VendorUpstreamObservation,
} from "../dto/vendor-workspace";
import { validGitObjectForFormat, vendorPayloadLayoutIssue } from "./vendor-payload-policy";
import {
  policyFailure,
  policySuccess,
  type VendorPolicyResult,
  vendorIssue,
} from "./vendor-policy-result";
import { vendorPayloadDigest } from "./vendor-record-codec";

/** Builds the bounded read-only query for one declared vendor source. */
export function vendorRemoteQuery(source: VendorDeclaredSourceObservation): ObserveRemoteInput {
  return Object.freeze({
    repositoryIdentity: source.declaration.repositoryIdentity,
    refName: source.declaration.refName,
    sourcePath: source.declaration.sourcePath,
    maxEntries: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  });
}

/** Extends a source observation query with the admitted materialization bound. */
export function vendorMaterializationQuery(
  source: VendorDeclaredSourceObservation
): MaterializeRemoteInput {
  return Object.freeze({
    ...vendorRemoteQuery(source),
    maxBytes: MAX_PAYLOAD_BYTES_PER_MEMBER,
  });
}

/**
 * Validates remote facts and derives the immutable identity used for ancestry
 * classification without acquiring or invoking the versioned-content resource.
 */
export function validateVendorRemote(
  source: VendorDeclaredSourceObservation,
  remote: RemoteContentTree
): VendorPolicyResult<
  Readonly<{
    remote: RemoteContentTree;
    identity: VendorUpstreamObservation["identity"];
  }>
> {
  if (source.lock === null) {
    return policyFailure(
      vendorIssue("PayloadMismatch", "Vendor lock is unavailable.", source.declaration.sourceId)
    );
  }
  const invalid = remoteIssue(source, remote);
  if (invalid !== undefined) return policyFailure(invalid);
  return policySuccess(
    Object.freeze({
      remote: freezeRemote(remote),
      identity: Object.freeze({
        repositoryIdentity: remote.repositoryIdentity,
        refName: remote.refName,
        sourceCommit: remote.commit,
        sourceTree: remote.tree,
        payloadDigest: vendorPayloadDigest(remote.entries),
      }),
    })
  );
}

/** Returns the exact ancestry query, or `null` when the admitted commit is current. */
export function vendorAncestryQuery(
  source: VendorDeclaredSourceObservation,
  identity: VendorUpstreamObservation["identity"]
): AncestryInput | null {
  if (source.lock === null || identity.sourceCommit === source.lock.admitted.sourceCommit)
    return null;
  return Object.freeze({
    repositoryIdentity: source.declaration.repositoryIdentity,
    refName: source.declaration.refName,
    ancestorCommit: source.lock.admitted.sourceCommit,
    descendantCommit: identity.sourceCommit,
  });
}

/** Classifies validated remote facts after the resource reports ancestry. */
export function createVendorUpstreamObservation(
  remote: RemoteContentTree,
  identity: VendorUpstreamObservation["identity"],
  isAncestor: boolean | null
): VendorUpstreamObservation {
  return Object.freeze({
    remote,
    identity,
    ancestry: isAncestor === null ? "same" : isAncestor ? "fast-forward" : "diverged",
  });
}

function remoteIssue(
  source: VendorDeclaredSourceObservation,
  remote: RemoteContentTree
): VendorUpdateIssue | undefined {
  const sourceId = source.declaration.sourceId;
  if (remote.repositoryIdentity !== source.declaration.repositoryIdentity) {
    return vendorIssue(
      "WrongRepository",
      "Observed upstream repository differs from its declaration.",
      sourceId
    );
  }
  if (remote.refName !== source.declaration.refName) {
    return vendorIssue("WrongRef", "Observed upstream ref differs from its declaration.", sourceId);
  }
  if (remote.sourcePath !== source.declaration.sourcePath) {
    return vendorIssue(
      "UnsupportedLayout",
      "Observed upstream source path differs from its declaration.",
      sourceId
    );
  }
  if (
    !validGitObjectForFormat(remote.commit, remote.objectFormat) ||
    !validGitObjectForFormat(remote.tree, remote.objectFormat)
  ) {
    return vendorIssue("PayloadMismatch", "Observed upstream Git identity is invalid.", sourceId);
  }
  const layoutIssue = vendorPayloadLayoutIssue(remote.entries, remote.objectFormat);
  return layoutIssue === undefined
    ? undefined
    : vendorIssue("UnsupportedLayout", layoutIssue, sourceId);
}

function freezeRemote(remote: RemoteContentTree): RemoteContentTree {
  return Object.freeze({
    repositoryIdentity: remote.repositoryIdentity,
    refName: remote.refName,
    sourcePath: remote.sourcePath,
    commit: remote.commit,
    tree: remote.tree,
    objectFormat: remote.objectFormat,
    entries: Object.freeze(
      remote.entries.map((entry) =>
        Object.freeze({
          path: entry.path,
          mode: entry.mode,
          blob: entry.blob,
        })
      )
    ),
  });
}

import type {
  MaterializedRemoteContentTree,
  RemoteContentTree,
  VersionedContentFailure,
  VersionedContentResource,
} from "@rawr/resource-versioned-content";
import { Effect } from "effect";

import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
} from "../../../../shared/release";
import type {
  VendorDeclaredSourceObservation,
  VendorPreparedPayload,
  VendorUpstreamObservation,
} from "../dto/vendor-workspace";
import {
  materializedPayloadIssue,
  sameTreeEntries,
  toContentWorkspaceEntries,
  validGitObjectForFormat,
  vendorPayloadLayoutIssue,
} from "./vendor-payload-policy";
import {
  policyFailure,
  policySuccess,
  resourceFailureDetail,
  resourceFailureReason,
  type VendorPolicyResult,
  vendorIssue,
} from "./vendor-policy-result";
import { vendorPayloadDigest } from "./vendor-record-codec";

type VendorObservationClock = Readonly<{
  now: () => Date;
}>;

export function observeVendorUpstream(
  port: VersionedContentResource<never>,
  source: VendorDeclaredSourceObservation
): Effect.Effect<VendorPolicyResult<VendorUpstreamObservation>> {
  return Effect.gen(function* () {
    if (source.lock === null) {
      return policyFailure(
        vendorIssue("PayloadMismatch", "Vendor lock is unavailable.", source.declaration.sourceId)
      );
    }
    const remoteAttempt = yield* Effect.result(port.observeRemote(remoteQuery(source)));
    if (remoteAttempt._tag === "Failure") {
      return resourceFailure(remoteAttempt.failure, source.declaration.sourceId);
    }
    const remote: RemoteContentTree = remoteAttempt.success;
    const invalid = remoteIssue(source, remote);
    if (invalid !== undefined) return policyFailure(invalid);
    const identity = Object.freeze({
      repositoryIdentity: remote.repositoryIdentity,
      refName: remote.refName,
      sourceCommit: remote.commit,
      sourceTree: remote.tree,
      payloadDigest: vendorPayloadDigest(remote.entries),
    });
    let ancestry: VendorUpstreamObservation["ancestry"];
    if (identity.sourceCommit === source.lock.admitted.sourceCommit) {
      ancestry = "same";
    } else {
      const ancestryAttempt = yield* Effect.result(
        port.isAncestor({
          repositoryIdentity: source.declaration.repositoryIdentity,
          refName: source.declaration.refName,
          ancestorCommit: source.lock.admitted.sourceCommit,
          descendantCommit: identity.sourceCommit,
        })
      );
      if (ancestryAttempt._tag === "Failure") {
        return resourceFailure(ancestryAttempt.failure, source.declaration.sourceId);
      }
      ancestry = ancestryAttempt.success ? "fast-forward" : "diverged";
    }
    return policySuccess(
      Object.freeze({
        remote: freezeRemote(remote),
        identity,
        ancestry,
      })
    );
  });
}

export function materializeVendorUpstream(
  port: VersionedContentResource<never>,
  clock: VendorObservationClock,
  source: VendorDeclaredSourceObservation,
  observed: VendorUpstreamObservation
): Effect.Effect<VendorPolicyResult<VendorPreparedPayload>> {
  return Effect.gen(function* () {
    const materializedAttempt = yield* Effect.result(
      port.materializeRemote({
        ...remoteQuery(source),
        maxBytes: MAX_PAYLOAD_BYTES_PER_MEMBER,
      })
    );
    if (materializedAttempt._tag === "Failure") {
      return resourceFailure(materializedAttempt.failure, source.declaration.sourceId);
    }
    const materialized: MaterializedRemoteContentTree = materializedAttempt.success;
    if (
      materialized.repositoryIdentity !== observed.remote.repositoryIdentity ||
      materialized.refName !== observed.remote.refName ||
      materialized.sourcePath !== observed.remote.sourcePath ||
      materialized.commit !== observed.remote.commit ||
      materialized.tree !== observed.remote.tree ||
      materialized.objectFormat !== observed.remote.objectFormat ||
      !sameTreeEntries(observed.remote.entries, materialized.entries)
    ) {
      return policyFailure(
        vendorIssue(
          "NonFastForward",
          "Upstream identity changed after update classification.",
          source.declaration.sourceId
        )
      );
    }
    const payloadIssue = materializedPayloadIssue(
      observed.remote.entries,
      materialized.entries,
      observed.remote.objectFormat
    );
    if (
      payloadIssue !== undefined ||
      vendorPayloadDigest(materialized.entries) !== observed.identity.payloadDigest
    ) {
      return policyFailure(
        vendorIssue(
          "PayloadMismatch",
          payloadIssue ?? "Materialized payload digest differs from the classified upstream tree.",
          source.declaration.sourceId
        )
      );
    }
    let now: Date;
    try {
      now = clock.now();
    } catch {
      return policyFailure(
        vendorIssue(
          "RuntimeFailure",
          "Vendor observation clock failed.",
          source.declaration.sourceId
        )
      );
    }
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      return policyFailure(
        vendorIssue(
          "RuntimeFailure",
          "Vendor observation clock returned an invalid instant.",
          source.declaration.sourceId
        )
      );
    }
    return policySuccess(
      Object.freeze({
        identity: observed.identity,
        entries: toContentWorkspaceEntries(materialized.entries),
        observedAt: now.toISOString(),
      })
    );
  });
}

function remoteQuery(source: VendorDeclaredSourceObservation) {
  return Object.freeze({
    repositoryIdentity: source.declaration.repositoryIdentity,
    refName: source.declaration.refName,
    sourcePath: source.declaration.sourcePath,
    maxEntries: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  });
}

function remoteIssue(source: VendorDeclaredSourceObservation, remote: RemoteContentTree) {
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

function resourceFailure(
  error: VersionedContentFailure,
  sourceId: string
): VendorPolicyResult<never> {
  const code =
    resourceFailureReason(error) === "CleanupFailed" ? "CleanupFailed" : "RuntimeFailure";
  return policyFailure(vendorIssue(code, resourceFailureDetail(error), sourceId));
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

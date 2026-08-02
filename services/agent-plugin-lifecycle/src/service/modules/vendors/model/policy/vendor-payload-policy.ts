import type { MaterializedContentTreeEntry } from "@habitat-ai/rawr-resource-content-workspace";
import type {
  MaterializedRemoteContentTree,
  MaterializedVersionedContentTreeEntry,
  VersionedContentTreeEntry,
} from "@habitat-ai/rawr-resource-versioned-content";

import type {
  VendorDeclaredSourceObservation,
  VendorPreparedPayload,
  VendorUpstreamObservation,
} from "../dto/vendor-workspace";
import {
  policyFailure,
  policySuccess,
  type VendorPolicyResult,
  vendorIssue,
} from "./vendor-policy-result";
import { vendorPayloadDigest } from "./vendor-record-codec";

/**
 * Reports the Vendor-specific layout violation that prevents a tree from
 * representing one skill payload.
 */
export function vendorPayloadLayoutIssue(
  entries: readonly VersionedContentTreeEntry[]
): string | undefined {
  if (entries.length === 0) return "The vendor payload is empty.";
  return entries.some((entry) => entry.path === "SKILL.md")
    ? undefined
    : "The vendor payload does not contain a regular SKILL.md.";
}

function sameTreeEntries(
  left: readonly VersionedContentTreeEntry[],
  right: readonly VersionedContentTreeEntry[]
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => {
      const candidate = right[index];
      return (
        candidate !== undefined &&
        entry.path === candidate.path &&
        entry.mode === candidate.mode &&
        entry.blob === candidate.blob
      );
    })
  );
}

function toContentWorkspaceEntries(
  entries: readonly MaterializedVersionedContentTreeEntry[]
): readonly MaterializedContentTreeEntry[] {
  return Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        path: entry.path,
        mode: entry.mode,
        blob: entry.blob,
        bytes: new Uint8Array(entry.bytes),
      })
    )
  );
}

/**
 * Compares the independently observed and materialized remote identities, then
 * creates the payload admitted by Vendor authoring policy.
 *
 * @param source - Canonical local declaration and admitted source state.
 * @param observed - Remote facts already validated and classified by ancestry.
 * @param materialized - Exact provider bytes read for the classified remote tree.
 * @param observedAt - Service clock instant assigned to the authored provenance.
 */
export function createVendorPreparedPayload(
  source: VendorDeclaredSourceObservation,
  observed: VendorUpstreamObservation,
  materialized: MaterializedRemoteContentTree,
  observedAt: Date
): VendorPolicyResult<VendorPreparedPayload> {
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
  if (vendorPayloadDigest(materialized.entries) !== observed.identity.payloadDigest) {
    return policyFailure(
      vendorIssue(
        "PayloadMismatch",
        "Materialized payload digest differs from the classified upstream tree.",
        source.declaration.sourceId
      )
    );
  }
  if (!(observedAt instanceof Date) || !Number.isFinite(observedAt.getTime())) {
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
      observedAt: observedAt.toISOString(),
    })
  );
}

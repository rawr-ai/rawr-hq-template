import { createHash } from "node:crypto";

import type { MaterializedContentTreeEntry } from "@rawr/resource-content-workspace";
import type {
  MaterializedRemoteContentTree,
  MaterializedVersionedContentTreeEntry,
  VersionedContentObjectFormat,
  VersionedContentTreeEntry,
} from "@rawr/resource-versioned-content";

import { GIT_OBJECT_ID_PATTERN, NORMALIZED_RELATIVE_PATH_PATTERN } from "../dto/vendor-records";
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

const gitObjectId = new RegExp(GIT_OBJECT_ID_PATTERN, "u");
const normalizedRelativePath = new RegExp(NORMALIZED_RELATIVE_PATH_PATTERN, "u");
const encoder = new TextEncoder();

/**
 * Reports the first structural payload violation that prevents Vendor policy
 * from treating a versioned-content tree as one canonical skill payload.
 */
export function vendorPayloadLayoutIssue(
  entries: readonly VersionedContentTreeEntry[],
  objectFormat: VersionedContentObjectFormat
): string | undefined {
  if (entries.length === 0) return "The vendor payload is empty.";
  const paths = new Set<string>();
  let previous = "";
  let hasSkill = false;
  for (const entry of entries) {
    if (
      !normalizedRelativePath.test(entry.path) ||
      !gitObjectId.test(entry.blob) ||
      entry.blob.length !== objectIdLength(objectFormat) ||
      paths.has(entry.path) ||
      (previous !== "" && compareText(previous, entry.path) >= 0)
    ) {
      return "The vendor payload contains an invalid, duplicate, or non-canonical entry.";
    }
    if (entry.path === "SKILL.md") hasSkill = true;
    paths.add(entry.path);
    previous = entry.path;
  }
  return hasSkill ? undefined : "The vendor payload does not contain a regular SKILL.md.";
}

/**
 * Verifies that materialization preserved the observed tree and that every
 * returned byte sequence owns the blob identity reported by the resource.
 */
export function materializedPayloadIssue(
  expected: readonly VersionedContentTreeEntry[],
  actual: readonly MaterializedVersionedContentTreeEntry[],
  objectFormat: VersionedContentObjectFormat
): string | undefined {
  if (expected.length !== actual.length)
    return "Materialized payload entry count changed after observation.";
  for (let index = 0; index < expected.length; index += 1) {
    const observed = expected[index];
    const materialized = actual[index];
    if (
      observed === undefined ||
      materialized === undefined ||
      observed.path !== materialized.path ||
      observed.mode !== materialized.mode ||
      observed.blob !== materialized.blob ||
      !(materialized.bytes instanceof Uint8Array) ||
      gitBlobId(materialized.bytes, objectFormat) !== materialized.blob
    ) {
      return "Materialized payload bytes do not match the observed Git tree.";
    }
  }
  return undefined;
}

/** Compares two ordered versioned-content inventories without comparing materialized bytes. */
export function sameTreeEntries(
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

/**
 * Projects validated materialized entries into content-workspace writes while
 * cloning bytes so provider-owned buffers cannot mutate the authoring plan.
 */
export function toContentWorkspaceEntries(
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

/** Checks whether one Git object identifier matches the resource-reported object format. */
export function validGitObjectForFormat(
  value: string,
  objectFormat: VersionedContentObjectFormat
): boolean {
  return gitObjectId.test(value) && value.length === objectIdLength(objectFormat);
}

/**
 * Compares materialized bytes with the classified remote facts and creates the
 * payload admitted by Vendor authoring policy.
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

function gitBlobId(bytes: Uint8Array, objectFormat: VersionedContentObjectFormat): string {
  const hash = createHash(objectFormat);
  hash.update(encoder.encode(`blob ${bytes.byteLength}\0`));
  hash.update(bytes);
  return hash.digest("hex");
}

function objectIdLength(objectFormat: VersionedContentObjectFormat): number {
  return objectFormat === "sha1" ? 40 : 64;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

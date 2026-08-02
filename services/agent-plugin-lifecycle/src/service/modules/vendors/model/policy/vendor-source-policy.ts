import type { VersionedContentFailure } from "@habitat-ai/rawr-resource-versioned-content";

import type {
  VendorSourceStatus,
  VendorUpdateIssue,
  VendorUpdateRequest,
} from "../dto/vendor-operations";
import type { VendorSourceIdentity } from "../dto/vendor-records";
import type {
  VendorDeclaredSourceObservation,
  VendorUpstreamObservation,
  VendorWorkspaceObservation,
} from "../dto/vendor-workspace";
import { resourceFailureDetail, resourceFailureReason, vendorIssue } from "./vendor-policy-result";
import {
  localVendorSourceIssue,
  sameVendorIdentity,
  validVendorIdentity,
} from "./vendor-state-validation";

/** Selects and validates the exact declared sources requested for one update. */
export function selectVendorSources(
  request: VendorUpdateRequest,
  observation: VendorWorkspaceObservation
):
  | Readonly<{ ok: true; sources: readonly VendorDeclaredSourceObservation[] }>
  | Readonly<{ ok: false; issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] }> {
  const byId = new Map(observation.sources.map((source) => [source.declaration.sourceId, source]));
  const selected: VendorDeclaredSourceObservation[] = [];
  const issues: VendorUpdateIssue[] = [];
  for (const selectedId of request.sourceIds) {
    const source = byId.get(selectedId);
    if (source === undefined) {
      issues.push(
        vendorIssue(
          "UndeclaredSource",
          `Vendor source ${selectedId} is absent from the canonical release input.`,
          selectedId
        )
      );
      continue;
    }
    selected.push(source);
    if (source.declaration.policy === "held") {
      issues.push(
        vendorIssue(
          "HeldSource",
          `Vendor source ${selectedId} is held and cannot be authored.`,
          selectedId
        )
      );
      continue;
    }
    const localIssue = localVendorSourceIssue(source);
    if (localIssue !== undefined) issues.push(localIssue);
    if (source.declaration.curationRevision >= Number.MAX_SAFE_INTEGER) {
      issues.push(
        vendorIssue(
          "PayloadMismatch",
          "Vendor source cannot advance beyond the maximum curation revision.",
          selectedId
        )
      );
    }
  }
  const failure = nonEmpty(issues);
  return failure === null
    ? Object.freeze({ ok: true, sources: Object.freeze(selected) })
    : Object.freeze({ ok: false, issues: failure });
}

/**
 * Classifies validated local and remote facts for both status reporting and
 * update candidate selection.
 */
export function classifyVendorSource(
  source: VendorDeclaredSourceObservation,
  upstream: VendorUpstreamObservation
): Readonly<{
  status: VendorSourceStatus;
  issue?: VendorUpdateIssue;
  candidate?: VendorUpstreamObservation;
}> {
  const admitted = admittedVendorIdentity(source);
  if (upstream.ancestry === "diverged") {
    const failure = vendorIssue(
      "NonFastForward",
      "The admitted commit is not an ancestor of the observed upstream commit.",
      source.declaration.sourceId
    );
    return Object.freeze({
      status: vendorStatusFromIssue(source, failure, "Diverged", upstream.identity),
      issue: failure,
    });
  }
  if (sameVendorIdentity(admitted, upstream.identity) && upstream.ancestry === "same") {
    return Object.freeze({
      status: Object.freeze({
        sourceId: source.declaration.sourceId,
        classification: "Current",
        admitted,
        observed: upstream.identity,
      }),
    });
  }
  if (
    upstream.ancestry !== "fast-forward" ||
    upstream.identity.sourceCommit === admitted.sourceCommit
  ) {
    const failure = vendorIssue(
      "PayloadMismatch",
      "Upstream identity changed without a valid fast-forward commit transition.",
      source.declaration.sourceId
    );
    return Object.freeze({
      status: vendorStatusFromIssue(source, failure, "Diverged", upstream.identity),
      issue: failure,
    });
  }
  return Object.freeze({
    status: Object.freeze({
      sourceId: source.declaration.sourceId,
      classification: "UpdateAvailable",
      admitted,
      observed: upstream.identity,
    }),
    candidate: upstream,
  });
}

/** Creates the read-only status for a held source without remote observation. */
export function heldVendorSourceStatus(
  source: VendorDeclaredSourceObservation
): VendorSourceStatus {
  return Object.freeze({
    sourceId: source.declaration.sourceId,
    classification: "Held",
    admitted: admittedVendorIdentity(source),
    observed: null,
    detail: "The versioned source declaration is held.",
  });
}

/**
 * Projects one admitted Vendor issue into the public source-status shape.
 *
 * @param source - Canonical local source facts used to report admitted identity.
 * @param failure - Bounded Vendor issue exposed as the status detail.
 * @param classification - Public status class selected for the issue.
 * @param observed - Optional remote identity retained in the status result.
 */
export function vendorStatusFromIssue(
  source: VendorDeclaredSourceObservation,
  failure: VendorUpdateIssue,
  classification: VendorSourceStatus["classification"] = failure.code === "LocalDrift"
    ? "Diverged"
    : "Invalid",
  observed: VendorSourceIdentity | null = null
): VendorSourceStatus {
  return Object.freeze({
    sourceId: source.declaration.sourceId,
    classification,
    admitted: admittedIdentityOrNull(source),
    observed,
    detail: failure.detail,
  });
}

/** Maps a provider-neutral versioned-content failure into bounded Vendor diagnostics. */
export function vendorUpstreamIssue(
  error: VersionedContentFailure,
  sourceId: string
): VendorUpdateIssue {
  const code =
    resourceFailureReason(error) === "CleanupFailed" ? "CleanupFailed" : "RuntimeFailure";
  return vendorIssue(code, resourceFailureDetail(error), sourceId);
}

/** Selects the public status class associated with one Vendor issue. */
export function vendorStatusClassification(
  issue: VendorUpdateIssue
): VendorSourceStatus["classification"] {
  if (issue.code === "RuntimeFailure" || issue.code === "CleanupFailed") return "Unavailable";
  if (
    issue.code === "NonFastForward" ||
    issue.code === "WrongRepository" ||
    issue.code === "WrongRef"
  ) {
    return "Diverged";
  }
  return "Invalid";
}

/** Returns the admitted identity after local source validation has succeeded. */
export function admittedVendorIdentity(
  source: VendorDeclaredSourceObservation
): VendorSourceIdentity {
  if (source.lock === null) throw new Error("Validated vendor lock became unavailable");
  return source.lock.admitted;
}

function admittedIdentityOrNull(
  source: VendorDeclaredSourceObservation
): VendorSourceIdentity | null {
  return source.lock !== null && validVendorIdentity(source.lock.admitted)
    ? source.lock.admitted
    : null;
}

function nonEmpty(
  issues: readonly VendorUpdateIssue[]
): readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] | null {
  const [first, ...rest] = issues;
  return first === undefined ? null : Object.freeze([first, ...rest]);
}

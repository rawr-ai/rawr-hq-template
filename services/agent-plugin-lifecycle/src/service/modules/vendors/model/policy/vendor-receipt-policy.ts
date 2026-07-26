import type { ContentWorkspaceCapture } from "@rawr/resource-content-workspace";

import type { VendorAuthoringPlan } from "../dto/vendor-workspace";

/** Validates that a capture covers the exact planned paths and read token. */
export function validVendorCapture(
  capture: ContentWorkspaceCapture,
  plan: VendorAuthoringPlan
): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/u.test(capture.handle) &&
    capture.readToken === plan.readToken &&
    samePathSet(capture.paths, plan.changedPaths)
  );
}

/** Validates the exact provider receipt returned by an authoring attempt. */
export function validVendorApplyReceipt(
  receipt: Readonly<{
    planDigest: string;
    readToken: string;
    outcome: "Applied" | "Converged" | "Restored";
    changedPaths: readonly string[];
  }>,
  plan: VendorAuthoringPlan
): boolean {
  return (
    receipt.planDigest === plan.planDigest &&
    receipt.readToken === plan.readToken &&
    (receipt.outcome === "Applied" || receipt.outcome === "Converged") &&
    (receipt.outcome === "Applied"
      ? samePathSet(receipt.changedPaths, plan.changedPaths)
      : receipt.changedPaths.length === 0)
  );
}

/** Validates the exact provider receipt returned by restoration. */
export function validVendorRestoreReceipt(
  receipt: Readonly<{
    planDigest: string;
    readToken: string;
    outcome: "Applied" | "Converged" | "Restored";
    changedPaths: readonly string[];
  }>,
  plan: VendorAuthoringPlan
): boolean {
  return (
    receipt.planDigest === plan.planDigest &&
    receipt.readToken === plan.readToken &&
    receipt.outcome === "Restored" &&
    validPathSubset(receipt.changedPaths, plan.changedPaths)
  );
}

/**
 * Validates a capture-release receipt against its requested disposition.
 *
 * @param receipt - Provider-reported release result.
 * @param plan - Service-owned authoring plan that supplied the read token.
 * @param captureHandle - Opaque provider handle requested for release.
 * @param disposition - Expected unmutated or unsettled release outcome.
 */
export function validVendorReleaseReceipt(
  receipt: Readonly<{
    readToken: string;
    outcome: "ReleasedUnmutated" | "ReleasedUnsettled";
    handle: string;
  }>,
  plan: VendorAuthoringPlan,
  captureHandle: string,
  disposition: "NoMutation" | "UnsettledRecovery"
): boolean {
  const expectedOutcome = disposition === "NoMutation" ? "ReleasedUnmutated" : "ReleasedUnsettled";
  return (
    receipt.handle === captureHandle &&
    receipt.readToken === plan.readToken &&
    receipt.outcome === expectedOutcome
  );
}

/** Validates a settlement receipt against the exact plan and capture. */
export function validVendorSettlementReceipt(
  receipt: Readonly<{
    planDigest: string;
    readToken: string;
    outcome: "Settled";
    handle: string;
  }>,
  plan: VendorAuthoringPlan,
  captureHandle: string
): boolean {
  return (
    receipt.handle === captureHandle &&
    receipt.planDigest === plan.planDigest &&
    receipt.readToken === plan.readToken &&
    receipt.outcome === "Settled"
  );
}

function samePathSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort(compareText);
  const sortedRight = [...right].sort(compareText);
  return sortedLeft.every((path, index) => path === sortedRight[index]);
}

function validPathSubset(paths: readonly string[], allowed: readonly string[]): boolean {
  const accepted = new Set(allowed);
  return new Set(paths).size === paths.length && paths.every((path) => accepted.has(path));
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

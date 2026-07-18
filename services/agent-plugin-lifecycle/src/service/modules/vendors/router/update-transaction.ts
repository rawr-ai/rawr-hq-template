import type { ContentWorkspaceCapture } from "@rawr/resource-content-workspace";

import type {
  VendorLifecycleRuntime,
  VendorUpdateIssue,
  VendorUpdateRequest,
  VendorUpdateResult,
} from "../ports";
import type { VendorAuthoringPlan } from "../model/dto/vendor-workspace";
import {
  resourceFailureDetail,
  resourceFailureReason,
  vendorIssue,
} from "../model/policy/vendor-policy-result";
import {
  vendorPlanIsApplied,
  vendorWorkspaceIssue,
} from "../model/policy/vendor-state-validation";
import { observeVendorWorkspace } from "../model/policy/vendor-workspace-observation";

const opaqueHandle = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/u;
const MAX_CAPTURE_ENTRIES = 200_000;
const MAX_CAPTURE_BYTES = 512 * 1024 * 1024;

export async function executeVendorAuthoringPlan(
  runtime: VendorLifecycleRuntime,
  request: VendorUpdateRequest,
  plan: VendorAuthoringPlan,
): Promise<VendorUpdateResult> {
  let capture: ContentWorkspaceCapture;
  try {
    capture = await runtime.contentWorkspace.capture({
      root: plan.contentWorkspace.locator,
      readToken: plan.readToken,
      paths: plan.changedPaths,
      maxEntries: MAX_CAPTURE_ENTRIES,
      maxBytes: MAX_CAPTURE_BYTES,
    });
  } catch (error) {
    return rejected(request.sourceIds, [vendorIssue(
      "AuthoringFailed",
      resourceFailureDetail("capture", error),
    )]);
  }
  if (!validCapture(capture, plan)) {
    const cleanup = await releaseCapture(runtime, plan, capture.handle, "NoMutation");
    const issues = [vendorIssue("AuthoringFailed", "Content workspace returned an invalid capture receipt.")];
    if (cleanup !== undefined) issues.push(cleanup);
    return rejected(request.sourceIds, requireIssues(issues));
  }

  const revalidated = await observeVendorWorkspace(runtime.contentWorkspace, request.contentWorkspace);
  const revalidationIssue = revalidated.ok ? vendorWorkspaceIssue(request, revalidated.value) : revalidated.issues[0];
  if (!revalidated.ok || revalidationIssue !== undefined || revalidated.value.readToken !== plan.readToken) {
    const primary = vendorIssue("LocalDrift", "Vendor repository changed after preimage capture and before authoring.");
    const cleanup = await releaseCapture(runtime, plan, capture.handle, "NoMutation");
    return rejected(request.sourceIds, cleanup === undefined ? [primary] : [primary, cleanup]);
  }

  let applied;
  try {
    applied = await runtime.contentWorkspace.apply({
      root: plan.contentWorkspace.locator,
      planDigest: plan.planDigest,
      readToken: plan.readToken,
      captureHandle: capture.handle,
      writes: plan.writes,
    });
  } catch (error) {
    const primary = vendorIssue("AuthoringFailed", resourceFailureDetail("apply", error));
    const released = await releaseCapture(runtime, plan, capture.handle, "NoMutation");
    if (released === undefined) return rejected(request.sourceIds, [primary]);
    return restoreAfterFailure(runtime, plan, capture.handle, request.sourceIds, primary);
  }
  if (!validApplyReceipt(applied, plan)) {
    return restoreAfterFailure(
      runtime,
      plan,
      capture.handle,
      request.sourceIds,
      vendorIssue("AuthoringFailed", "Content workspace returned an invalid apply receipt."),
    );
  }

  const verified = await observeVendorWorkspace(runtime.contentWorkspace, request.contentWorkspace);
  const verificationIssue = verified.ok ? vendorWorkspaceIssue(request, verified.value) : verified.issues[0];
  if (!verified.ok || verificationIssue !== undefined || !vendorPlanIsApplied(verified.value, plan)) {
    const detail = verificationIssue?.detail ?? "Repository observation does not match the exact service-owned vendor plan.";
    const primary = vendorIssue("AuthoringFailed", detail);
    if (applied.outcome === "Converged") {
      const cleanup = await releaseCapture(runtime, plan, capture.handle, "NoMutation");
      return rejected(request.sourceIds, cleanup === undefined ? [primary] : [primary, cleanup]);
    }
    return restoreAfterFailure(runtime, plan, capture.handle, request.sourceIds, primary);
  }

  const settlement = await settleCapture(runtime, plan, capture.handle);
  if (settlement !== undefined) {
    if (applied.outcome === "Converged") {
      const cleanup = await releaseCapture(runtime, plan, capture.handle, "NoMutation");
      return rejected(request.sourceIds, cleanup === undefined ? [settlement] : [settlement, cleanup]);
    }
    return restoreAfterFailure(runtime, plan, capture.handle, request.sourceIds, settlement);
  }
  return applied.outcome === "Converged"
    ? { kind: "ReadOnlyConverged", sourceIds: request.sourceIds }
    : {
        kind: "AuthoredReviewableChanges",
        sourceIds: request.sourceIds,
        changedPaths: plan.changedPaths,
      };
}

async function restoreAfterFailure(
  runtime: VendorLifecycleRuntime,
  plan: VendorAuthoringPlan,
  captureHandle: string,
  sourceIds: readonly string[],
  primary: VendorUpdateIssue,
): Promise<VendorUpdateResult> {
  let restored;
  try {
    restored = await runtime.contentWorkspace.restore({
      root: plan.contentWorkspace.locator,
      planDigest: plan.planDigest,
      readToken: plan.readToken,
      captureHandle,
    });
  } catch (error) {
    const restoration = vendorIssue("RestorationFailed", resourceFailureDetail("restore", error));
    const cleanup = await releaseCapture(runtime, plan, captureHandle, "UnsettledRecovery");
    return {
      kind: "RestorationFailed",
      sourceIds,
      unsettledPaths: plan.changedPaths,
      issues: cleanup === undefined ? [primary, restoration] : [primary, restoration, cleanup],
    };
  }
  if (!validRestoreReceipt(restored, plan)) {
    const restoration = vendorIssue("RestorationFailed", "Content workspace returned an invalid restoration receipt.");
    const cleanup = await releaseCapture(runtime, plan, captureHandle, "UnsettledRecovery");
    return {
      kind: "RestorationFailed",
      sourceIds,
      unsettledPaths: plan.changedPaths,
      issues: cleanup === undefined ? [primary, restoration] : [primary, restoration, cleanup],
    };
  }
  const settlement = await settleCapture(runtime, plan, captureHandle);
  return settlement === undefined
    ? {
        kind: "FailedRestored",
        sourceIds,
        restoredPaths: [...restored.changedPaths].sort(compareText),
        issues: [primary],
      }
    : {
        kind: "FailedRestored",
        sourceIds,
        restoredPaths: [...restored.changedPaths].sort(compareText),
        issues: [primary, settlement],
      };
}

async function releaseCapture(
  runtime: VendorLifecycleRuntime,
  plan: VendorAuthoringPlan,
  captureHandle: string,
  disposition: "NoMutation" | "UnsettledRecovery",
): Promise<VendorUpdateIssue | undefined> {
  try {
    const receipt = await runtime.contentWorkspace.release({
      root: plan.contentWorkspace.locator,
      readToken: plan.readToken,
      captureHandle,
      disposition,
    });
    const expectedOutcome = disposition === "NoMutation" ? "ReleasedUnmutated" : "ReleasedUnsettled";
    return receipt.handle === captureHandle
      && receipt.readToken === plan.readToken
      && receipt.outcome === expectedOutcome
      ? undefined
      : vendorIssue("CleanupFailed", "Content workspace returned an invalid capture-release receipt.");
  } catch (error) {
    if (disposition === "NoMutation" && resourceFailureReason(error) === "HandleState") {
      return vendorIssue("RestorationFailed", "Captured authoring may have mutated repository state.");
    }
    return vendorIssue("CleanupFailed", resourceFailureDetail("release", error));
  }
}

async function settleCapture(
  runtime: VendorLifecycleRuntime,
  plan: VendorAuthoringPlan,
  captureHandle: string,
): Promise<VendorUpdateIssue | undefined> {
  try {
    const receipt = await runtime.contentWorkspace.settle({
      root: plan.contentWorkspace.locator,
      planDigest: plan.planDigest,
      readToken: plan.readToken,
      captureHandle,
    });
    return receipt.handle === captureHandle
      && receipt.planDigest === plan.planDigest
      && receipt.readToken === plan.readToken
      && receipt.outcome === "Settled"
      ? undefined
      : vendorIssue("CleanupFailed", "Content workspace returned an invalid settlement receipt.");
  } catch (error) {
    return vendorIssue("CleanupFailed", resourceFailureDetail("settle", error));
  }
}

function validCapture(capture: ContentWorkspaceCapture, plan: VendorAuthoringPlan): boolean {
  return opaqueHandle.test(capture.handle)
    && capture.readToken === plan.readToken
    && samePathSet(capture.paths, plan.changedPaths);
}

function validApplyReceipt(
  receipt: Readonly<{
    planDigest: string;
    readToken: string;
    outcome: "Applied" | "Converged" | "Restored";
    changedPaths: readonly string[];
  }>,
  plan: VendorAuthoringPlan,
): boolean {
  return receipt.planDigest === plan.planDigest
    && receipt.readToken === plan.readToken
    && (receipt.outcome === "Applied" || receipt.outcome === "Converged")
    && (receipt.outcome === "Applied"
      ? samePathSet(receipt.changedPaths, plan.changedPaths)
      : receipt.changedPaths.length === 0);
}

function validRestoreReceipt(
  receipt: Readonly<{
    planDigest: string;
    readToken: string;
    outcome: "Applied" | "Converged" | "Restored";
    changedPaths: readonly string[];
  }>,
  plan: VendorAuthoringPlan,
): boolean {
  return receipt.planDigest === plan.planDigest
    && receipt.readToken === plan.readToken
    && receipt.outcome === "Restored"
    && validPathSubset(receipt.changedPaths, plan.changedPaths);
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

function requireIssues(issues: readonly VendorUpdateIssue[]): readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] {
  const [first, ...rest] = issues;
  if (first === undefined) throw new Error("Expected at least one vendor issue");
  return [first, ...rest];
}

function rejected(
  sourceIds: readonly string[],
  issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]],
): VendorUpdateResult {
  return { kind: "Rejected", sourceIds, issues };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

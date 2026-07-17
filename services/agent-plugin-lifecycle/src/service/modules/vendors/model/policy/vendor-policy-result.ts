import type {
  ContentWorkspaceFailure,
  ContentWorkspaceFailureReason,
} from "@rawr/resource-content-workspace";

import type { VendorUpdateIssue } from "../../ports";

const MAX_PUBLIC_ISSUE_DETAIL_LENGTH = 4_096;
const DEFAULT_PUBLIC_ISSUE_DETAIL = "Vendor lifecycle operation failed.";

const operationLabels: Readonly<Record<ContentWorkspaceFailure["operation"], string>> = Object.freeze({
  inspect: "Content workspace inspection",
  "read-file": "Content file observation",
  "read-tree": "Content tree observation",
  "observe-remote": "Remote content observation",
  "materialize-remote": "Remote content materialization",
  ancestry: "Remote ancestry verification",
  capture: "Repository preimage capture",
  apply: "Repository authoring",
  restore: "Repository restoration",
  settle: "Repository settlement",
  release: "Capture authority release",
  cleanup: "Content workspace cleanup",
});

const reasonClauses: Readonly<Record<ContentWorkspaceFailureReason, string>> = Object.freeze({
  InvalidInput: "the provider rejected the bounded input",
  Missing: "required content is missing",
  Aliased: "an aliased path was rejected",
  UnsupportedEntry: "the content contains an unsupported entry",
  LimitExceeded: "the bounded resource limit was exceeded",
  IdentityChanged: "the observed content identity changed",
  GitFailed: "the Git operation failed",
  FilesystemFailed: "the filesystem operation failed",
  CleanupFailed: "provider cleanup failed",
  InvalidHandle: "the capture authority is invalid",
  HandleConsumed: "the capture authority was already consumed",
  HandleState: "the capture authority is in the wrong state",
  WrongRoot: "the capture authority does not match the workspace",
  WrongToken: "the capture authority does not match the read token",
  WrongPlan: "the capture authority does not match the authoring plan",
});

export type VendorPolicyResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] }>;

export function policySuccess<T>(value: T): VendorPolicyResult<T> {
  return Object.freeze({ ok: true, value });
}

export function policyFailure(
  first: VendorUpdateIssue,
  ...rest: readonly VendorUpdateIssue[]
): VendorPolicyResult<never> {
  const issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] = [first, ...rest];
  return Object.freeze({ ok: false, issues: Object.freeze(issues) });
}

export function vendorIssue(
  code: VendorUpdateIssue["code"],
  detail: string,
  sourceId?: string,
): VendorUpdateIssue {
  const publicDetail = normalizePublicDetail(detail);
  return sourceId === undefined
    ? Object.freeze({ code, detail: publicDetail })
    : Object.freeze({ code, detail: publicDetail, sourceId });
}

export function resourceFailureReason(error: unknown): ContentWorkspaceFailureReason | undefined {
  if (
    typeof error === "object"
    && error !== null
    && "_tag" in error
    && error._tag === "ContentWorkspaceFailure"
    && "reason" in error
    && isContentWorkspaceFailureReason(error.reason)
  ) {
    return error.reason;
  }
  return undefined;
}

export function resourceFailureDetail(
  operation: ContentWorkspaceFailure["operation"],
  error: unknown,
): string {
  const reason = resourceFailureReason(error);
  const clause = reason === undefined
    ? "the provider returned an untyped failure"
    : reasonClauses[reason];
  return `${operationLabels[operation]} failed because ${clause}.`;
}

function normalizePublicDetail(detail: string): string {
  const normalized = typeof detail === "string" ? detail.trim() : "";
  if (normalized.length === 0) return DEFAULT_PUBLIC_ISSUE_DETAIL;
  if (normalized.length <= MAX_PUBLIC_ISSUE_DETAIL_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_PUBLIC_ISSUE_DETAIL_LENGTH - 3)}...`;
}

function isContentWorkspaceFailureReason(value: unknown): value is ContentWorkspaceFailureReason {
  switch (value) {
    case "InvalidInput":
    case "Missing":
    case "Aliased":
    case "UnsupportedEntry":
    case "LimitExceeded":
    case "IdentityChanged":
    case "GitFailed":
    case "FilesystemFailed":
    case "CleanupFailed":
    case "InvalidHandle":
    case "HandleConsumed":
    case "HandleState":
    case "WrongRoot":
    case "WrongToken":
    case "WrongPlan":
      return true;
    default:
      return false;
  }
}

import type {
  VersionedContentFailure,
  VersionedContentFailureReason,
} from "@habitat-ai/rawr-resource-versioned-content";
import type {
  ContentWorkspaceFailure,
  ContentWorkspaceFailureReason,
} from "@habitat-ai/resource-content-workspace";

import type { VendorUpdateIssue } from "../dto/vendor-operations";

const MAX_PUBLIC_ISSUE_DETAIL_LENGTH = 4_096;
const DEFAULT_PUBLIC_ISSUE_DETAIL = "Vendor lifecycle operation failed.";

type ResourceFailure = ContentWorkspaceFailure | VersionedContentFailure;
type ResourceFailureReason = ContentWorkspaceFailureReason | VersionedContentFailureReason;

const operationLabels: Readonly<Partial<Record<ResourceFailure["operation"], string>>> =
  Object.freeze({
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
    cleanup: "Resource cleanup",
  });

const reasonClauses: Readonly<Record<ResourceFailureReason, string>> = Object.freeze({
  InvalidInput: "the provider rejected the bounded input",
  Missing: "required content is missing",
  Aliased: "an aliased path was rejected",
  UnsupportedEntry: "the content contains an unsupported entry",
  LimitExceeded: "the bounded resource limit was exceeded",
  IdentityChanged: "the observed content identity changed",
  GitFailed: "the Git operation failed",
  CommandFailed: "the Git operation failed",
  FilesystemFailed: "the filesystem operation failed",
  CleanupFailed: "provider cleanup failed",
  InvalidHandle: "the capture authority is invalid",
  HandleConsumed: "the capture authority was already consumed",
  HandleState: "the capture authority is in the wrong state",
  WrongRoot: "the capture authority does not match the workspace",
  WrongToken: "the capture authority does not match the read token",
  WrongPlan: "the capture authority does not match the authoring plan",
});

/** Carries either one admitted Vendor policy value or a non-empty public issue set. */
export type VendorPolicyResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] }>;

/** Constructs the successful branch shared by pure Vendor policy decisions. */
export function policySuccess<T>(value: T): VendorPolicyResult<T> {
  return Object.freeze({ ok: true, value });
}

/** Constructs a failed Vendor policy result while preserving non-empty issue ownership. */
export function policyFailure(
  first: VendorUpdateIssue,
  ...rest: readonly VendorUpdateIssue[]
): VendorPolicyResult<never> {
  const issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] = [first, ...rest];
  return Object.freeze({ ok: false, issues: Object.freeze(issues) });
}

/**
 * Converts a mutable issue collection into its non-empty immutable form, or
 * returns `null` when the owning operation has no failure to report.
 */
export function nonEmptyVendorIssues(
  issues: readonly VendorUpdateIssue[]
): readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] | null {
  const first = issues[0];
  if (first === undefined) return null;
  const nonEmpty: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] = [
    first,
    ...issues.slice(1),
  ];
  return Object.freeze(nonEmpty);
}

/** Creates one bounded caller-visible Vendor issue from domain or resource facts. */
export function vendorIssue(
  code: VendorUpdateIssue["code"],
  detail: string,
  sourceId?: string
): VendorUpdateIssue {
  const publicDetail = normalizePublicDetail(detail);
  return sourceId === undefined
    ? Object.freeze({ code, detail: publicDetail })
    : Object.freeze({ code, detail: publicDetail, sourceId });
}

/** Returns the stable provider-neutral reason carried by a supported resource failure. */
export function resourceFailureReason(error: ResourceFailure): ResourceFailureReason {
  return error.reason;
}

/**
 * Maps a resource failure to bounded operational language without exposing
 * provider paths, commands, exceptions, or other private diagnostics.
 */
export function resourceFailureDetail(error: ResourceFailure): string {
  const operation = operationLabels[error.operation] ?? "Vendor resource operation";
  return `${operation} failed because ${reasonClauses[error.reason]}.`;
}

function normalizePublicDetail(detail: string): string {
  const normalized = typeof detail === "string" ? detail.trim() : "";
  if (normalized.length === 0) return DEFAULT_PUBLIC_ISSUE_DETAIL;
  if (normalized.length <= MAX_PUBLIC_ISSUE_DETAIL_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_PUBLIC_ISSUE_DETAIL_LENGTH - 3)}...`;
}

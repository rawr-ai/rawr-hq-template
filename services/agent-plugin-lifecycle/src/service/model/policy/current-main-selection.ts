import type {
  ContentWorkspaceFailure,
  GitBlobAtPathObservation,
  GitRefObservation,
} from "@habitat-ai/resource-content-workspace";
import type { Result } from "effect";

import type {
  CanonicalRef,
  ExactGitBlobPointer,
  GitBlobSelection,
  GitLocator,
} from "../dto/current-main-git";
import {
  CURRENT_MAIN_V3_CANONICAL_REF,
  CURRENT_MAIN_V3_RECORD_PATH,
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
} from "../dto/current-main-record";
import {
  type CanonicalChannelSelection,
  type CurrentMainSelectionFailureKind,
  type CurrentMainSelectionResult,
  MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH,
} from "../dto/current-main-selection";
import { type GitCommitId, type GitTreeId } from "../dto/release-identity";
import { createExactGitBlobPointer, parseCanonicalRef } from "./current-main-git";
import {
  decodeCurrentMainRecord,
  describeCurrentMainRecordValidation,
} from "./current-main-record";
import {
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "./release-identity";
import { decodeAgentPluginReleaseInput } from "./release-input";

/** Maximum bytes admitted for either exact Git blob used by current-main selection. */
export const MAX_CURRENT_MAIN_GIT_BLOB_BYTES = 128 * 1024 * 1024;

/** Canonical Git ref inspected at both ends of current-main selection. */
export const CURRENT_MAIN_SELECTION_REF = requireCanonicalRef(CURRENT_MAIN_V3_CANONICAL_REF);

const COMPILED_CURRENT_MAIN_PATH = requireRelativePath(
  CURRENT_MAIN_V3_RECORD_PATH,
  "currentMain.path"
);
const COMPILED_RELEASE_INPUT_PATH = requireRelativePath(
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
  "currentMain.releaseInputPath"
);
const TRUNCATED_SELECTION_REASON_SUFFIX = "...[truncated]";

export type CurrentMainDecision<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; result: CurrentMainSelectionResult }>;

/** Exact canonical-main observation admitted for the remaining selection phases. */
export interface CurrentMainInspection {
  readonly repositoryIdentity: GitLocator["expectedRepositoryIdentity"];
  readonly canonicalRef: CanonicalRef;
  readonly headCommit: GitCommitId;
  readonly headTree: GitTreeId;
}

/** Resource-owned binary observation retained only inside current-main policy. */
export interface ExactGitBlobObservation {
  readonly pointer: ExactGitBlobPointer;
  readonly bytes: Uint8Array;
}

/** Parsed current-main record together with its exact selected content identities. */
export interface CurrentMainRecordBinding {
  readonly record: CanonicalChannelSelection;
  readonly sourceRef: CanonicalRef;
  readonly contentCommit: GitCommitId;
  readonly contentTree: GitTreeId;
}

/** Classifies one canonical-main resource observation without performing I/O. */
export function classifyCurrentMainInspection(
  locator: GitLocator,
  attempt: Result.Result<GitRefObservation, ContentWorkspaceFailure>
): CurrentMainDecision<CurrentMainInspection> {
  if (attempt._tag === "Failure") {
    return rejected("UNREACHABLE_REPOSITORY", attempt.failure.detail);
  }
  const observed = attempt.success;
  const repositoryIdentity = exactRepositoryIdentity(
    observed.remoteUrls,
    locator.expectedRepositoryIdentity
  );
  if (repositoryIdentity !== locator.expectedRepositoryIdentity) {
    return rejected(
      "WRONG_REPOSITORY",
      `Expected ${locator.expectedRepositoryIdentity}, observed ${repositoryIdentity}`
    );
  }
  if (observed.refName !== CURRENT_MAIN_SELECTION_REF) {
    return rejected("UNREACHABLE_REPOSITORY", "Git provider observed another canonical ref");
  }
  const headCommit = parseGitCommitId(observed.commit, "inspection.headCommit");
  const headTree = parseGitTreeId(observed.tree, "inspection.headTree");
  if (!headCommit.ok || !headTree.ok) {
    return rejected(
      "UNREACHABLE_REPOSITORY",
      "Git provider returned noncanonical object identities"
    );
  }
  return accepted({
    repositoryIdentity: locator.expectedRepositoryIdentity,
    canonicalRef: CURRENT_MAIN_SELECTION_REF,
    headCommit: headCommit.value,
    headTree: headTree.value,
  });
}

/** Builds the exact record selection from an admitted canonical-main observation. */
export function currentMainRecordSelection(opening: CurrentMainInspection): GitBlobSelection {
  return Object.freeze({
    repositoryIdentity: opening.repositoryIdentity,
    ref: opening.canonicalRef,
    commit: opening.headCommit,
    tree: opening.headTree,
    path: COMPILED_CURRENT_MAIN_PATH,
  });
}

/** Classifies the ref observation that precedes one exact selected blob read. */
export function classifySelectedGitRef(
  locator: GitLocator,
  selection: GitBlobSelection,
  attempt: Result.Result<GitRefObservation, ContentWorkspaceFailure>
): CurrentMainDecision<GitRefObservation> {
  if (selection.repositoryIdentity !== locator.expectedRepositoryIdentity) {
    return rejected(
      "FORGED_RECORD",
      "Git object selection does not belong to the explicit repository locator"
    );
  }
  if (attempt._tag === "Failure") return classifyReadFailure(attempt.failure);
  if (
    exactRepositoryIdentity(attempt.success.remoteUrls, selection.repositoryIdentity) !==
    selection.repositoryIdentity
  ) {
    return rejected("FORGED_RECORD", "Git object selection belongs to another repository identity");
  }
  return accepted(attempt.success);
}

/** Classifies one exact blob resource observation without performing I/O. */
export function classifySelectedGitBlob(
  selection: GitBlobSelection,
  attempt: Result.Result<GitBlobAtPathObservation, ContentWorkspaceFailure>
): CurrentMainDecision<ExactGitBlobObservation> {
  if (attempt._tag === "Failure") return classifyReadFailure(attempt.failure);
  const observed = attempt.success;
  if (observed.refCommit !== selection.commit) {
    return rejected("FORGED_RECORD", "Selected Git ref resolves to another commit");
  }
  if (observed.commit !== selection.commit || observed.tree !== selection.tree) {
    return rejected("FORGED_RECORD", "Git provider returned bytes for another commit or tree");
  }
  const pointer = createExactGitBlobPointer({ ...selection, blob: observed.blob });
  if (!pointer.ok) {
    return rejected("FORGED_RECORD", "Git provider returned a noncanonical blob identity");
  }
  if (observed.bytes.byteLength > MAX_CURRENT_MAIN_GIT_BLOB_BYTES) {
    return rejected("FORGED_RECORD", "Git blob exceeds the governance read bound");
  }
  return accepted(
    Object.freeze({
      pointer: pointer.value,
      bytes: new Uint8Array(observed.bytes),
    })
  );
}

/** Parses and classifies the reviewed record selected from canonical main. */
export function classifyCurrentMainRecord(
  locator: GitLocator,
  opening: CurrentMainInspection,
  observation: ExactGitBlobObservation
): CurrentMainDecision<CurrentMainRecordBinding> {
  const currentMain = decodeCurrentMainRecord(observation.bytes);
  if (typeof currentMain === "string") {
    return rejected(
      "FORGED_RECORD",
      `Current-main v3 is invalid: ${describeCurrentMainRecordValidation(currentMain)}`
    );
  }
  const record = currentMain;
  if (
    record.sourceRepositoryIdentity !== locator.expectedRepositoryIdentity ||
    record.sourceRepositoryIdentity !== opening.repositoryIdentity
  ) {
    return rejected(
      "WRONG_REPOSITORY",
      "Current-main selects a repository other than the explicit locator"
    );
  }

  const sourceRef = parseCanonicalRef(record.sourceRef, "currentMain.sourceRef");
  const contentCommit = parseGitCommitId(record.contentCommit, "currentMain.contentCommit");
  const contentTree = parseGitTreeId(record.contentTree, "currentMain.contentTree");
  if (!sourceRef.ok || !contentCommit.ok || !contentTree.ok) {
    return rejected("FORGED_RECORD", "Current-main contains an invalid content revision");
  }
  if (contentCommit.value === opening.headCommit) {
    return rejected("FORGED_RECORD", "Current-main cannot select its containing record commit");
  }
  return accepted({
    record,
    sourceRef: sourceRef.value,
    contentCommit: contentCommit.value,
    contentTree: contentTree.value,
  });
}

/** Classifies the selected commit's reachability from the containing main commit. */
export function classifyCurrentMainAncestry(
  attempt: Result.Result<boolean, ContentWorkspaceFailure>
): CurrentMainSelectionResult | undefined {
  if (attempt._tag === "Failure") {
    return refused(
      "UNREACHABLE_REPOSITORY",
      "Could not verify selected content ancestry against canonical main"
    );
  }
  return attempt.success
    ? undefined
    : refused("STALE_RECORD", "Selected content commit is not reachable from canonical main");
}

/** Builds the exact release-input selection named by the reviewed current-main record. */
export function currentMainReleaseInputSelection(
  opening: CurrentMainInspection,
  binding: CurrentMainRecordBinding
): GitBlobSelection {
  return Object.freeze({
    repositoryIdentity: opening.repositoryIdentity,
    ref: binding.sourceRef,
    commit: binding.contentCommit,
    tree: binding.contentTree,
    path: COMPILED_RELEASE_INPUT_PATH,
  });
}

/** Classifies release-input bytes against the reviewed current-main record. */
export function classifyCurrentMainReleaseInput(
  binding: CurrentMainRecordBinding,
  observation: ExactGitBlobObservation
): CurrentMainSelectionResult | undefined {
  const releaseInput = decodeAgentPluginReleaseInput(observation.bytes);
  if (!releaseInput.ok) {
    return refused("FORGED_RECORD", "Selected release input is invalid or noncanonical");
  }
  if (releaseInput.value.releaseInputDigest !== binding.record.releaseInputDigest) {
    return refused("FORGED_RECORD", "Selected release-input digest differs from current-main");
  }
  return releaseInput.value.body.contentAuthority === binding.record.contentAuthority
    ? undefined
    : refused("FORGED_RECORD", "Selected release input declares another content authority");
}

/** Finishes selection only when canonical main remained identical throughout the read. */
export function finishCurrentMainSelection(
  opening: CurrentMainInspection,
  closing: CurrentMainInspection,
  record: CanonicalChannelSelection
): CurrentMainSelectionResult {
  return sameInspection(opening, closing)
    ? Object.freeze({ kind: "CURRENT_ELIGIBLE", selection: record })
    : refused("UNREACHABLE_REPOSITORY", "Canonical main changed during current-main selection");
}

function classifyReadFailure(failure: ContentWorkspaceFailure): CurrentMainDecision<never> {
  switch (failure.reason) {
    case "IdentityChanged":
    case "LimitExceeded":
      return rejected("FORGED_RECORD", failure.detail);
    default:
      return rejected("STALE_RECORD", failure.detail);
  }
}

function sameInspection(left: CurrentMainInspection, right: CurrentMainInspection): boolean {
  return (
    left.repositoryIdentity === right.repositoryIdentity &&
    left.canonicalRef === right.canonicalRef &&
    left.headCommit === right.headCommit &&
    left.headTree === right.headTree
  );
}

function exactRepositoryIdentity(remoteUrls: readonly string[], expected: string): string {
  const observed = remoteUrls.map(
    (remoteUrl) => repositoryIdentityFromRemote(remoteUrl) ?? remoteUrl
  );
  if (observed.includes(expected)) return expected;
  const unique = [...new Set(observed)].sort(compareText);
  return unique.length === 1 ? unique[0]! : "unresolved:multiple-or-missing-remotes";
}

function repositoryIdentityFromRemote(remoteUrl: string): string | undefined {
  if (remoteUrl.startsWith("git:") && !remoteUrl.startsWith("git://")) {
    const parsed = parseRepositoryIdentity(remoteUrl, "remoteUrl");
    return parsed.ok ? parsed.value : undefined;
  }

  const scp = /^(?:[^@/:]+@)?([a-z0-9.-]+):([a-z0-9][a-z0-9._~/-]*)$/iu.exec(remoteUrl);
  if (scp !== null) return canonicalGitRepositoryIdentity(scp[1]!, scp[2]!);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(remoteUrl);
  } catch {
    return undefined;
  }
  if (
    !["git:", "http:", "https:", "ssh:"].includes(parsedUrl.protocol) ||
    parsedUrl.hostname.length === 0 ||
    parsedUrl.password.length > 0 ||
    parsedUrl.port.length > 0 ||
    parsedUrl.search.length > 0 ||
    parsedUrl.hash.length > 0
  ) {
    return undefined;
  }
  return canonicalGitRepositoryIdentity(parsedUrl.hostname, parsedUrl.pathname);
}

function canonicalGitRepositoryIdentity(host: string, rawPath: string): string | undefined {
  const path = rawPath.replace(/^\/+|\/+$/gu, "").replace(/\.git$/u, "");
  if (path.length === 0) return undefined;
  const parsed = parseRepositoryIdentity(`git:${host.toLowerCase()}/${path}`, "remoteUrl");
  return parsed.ok ? parsed.value : undefined;
}

function accepted<T>(value: T): CurrentMainDecision<T> {
  return { ok: true, value: Object.freeze(value) as T };
}

function rejected(
  kind: CurrentMainSelectionFailureKind,
  reason: string
): CurrentMainDecision<never> {
  return { ok: false, result: refused(kind, reason) };
}

function refused(
  kind: CurrentMainSelectionFailureKind,
  reason: string
): CurrentMainSelectionResult {
  return Object.freeze({ kind, reason: boundedReason(reason) });
}

function boundedReason(reason: string): string {
  const characters = [...reason];
  if (characters.length <= MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH) return reason;
  return `${characters
    .slice(0, MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH - TRUNCATED_SELECTION_REASON_SUFFIX.length)
    .join("")}${TRUNCATED_SELECTION_REASON_SUFFIX}`;
}

function requireCanonicalRef(value: string) {
  const parsed = parseCanonicalRef(value, "currentMain.canonicalRef");
  if (!parsed.ok) throw new Error("Compiled current-main ref is invalid");
  return parsed.value;
}

function requireRelativePath(value: string, path: string) {
  const parsed = parseReleaseRelativePath(value, path);
  if (!parsed.ok) throw new Error(`Compiled ${path} is invalid`);
  return parsed.value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

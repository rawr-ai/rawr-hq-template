import {
  decodeAgentPluginReleaseInput,
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
} from "../../shared/release";

import {
  CURRENT_MAIN_V3_CANONICAL_REF,
  CURRENT_MAIN_V3_RECORD_PATH,
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
  type CurrentMainSelectionFailureKind,
  type CurrentMainSelectionResult,
  MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH,
} from "../dto/current-main";
import { parseCanonicalRef } from "../dto/current-main-primitives";
import type {
  ExactGitReader,
  GitReadFailureCode,
  RepositoryInspection,
} from "../repositories/current-main-exact-git";
import { validateCurrentMainRecordV3 } from "./current-main-record";

const COMPILED_CANONICAL_REF = requireCanonicalRef(CURRENT_MAIN_V3_CANONICAL_REF);
const COMPILED_CURRENT_MAIN_PATH = requireRelativePath(
  CURRENT_MAIN_V3_RECORD_PATH,
  "currentMain.path"
);
const COMPILED_RELEASE_INPUT_PATH = requireRelativePath(
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
  "currentMain.releaseInputPath"
);
const TRUNCATED_SELECTION_REASON_SUFFIX = "...[truncated]";

export async function resolveCurrentMainSelection(
  git: ExactGitReader,
  locator: Parameters<ExactGitReader["inspect"]>[0]
): Promise<CurrentMainSelectionResult> {
  const opening = await git.inspect(locator, COMPILED_CANONICAL_REF);
  const openingFailure = classifyInspection(opening, locator.expectedRepositoryIdentity);
  if (openingFailure !== undefined) return openingFailure;
  if (opening.kind !== "Ready") {
    return refused(
      "UNREACHABLE_REPOSITORY",
      "Canonical Git inspection produced no readable main state"
    );
  }

  const recordRead = await git.readFileAtRevision(locator, {
    repositoryIdentity: opening.repositoryIdentity,
    ref: opening.canonicalRef,
    commit: opening.headCommit,
    tree: opening.headTree,
    path: COMPILED_CURRENT_MAIN_PATH,
  });
  if (!recordRead.ok) {
    return classifyGitReadFailure(recordRead.failure.code, recordRead.failure.message);
  }

  const currentMain = validateCurrentMainRecordV3(recordRead.observation.bytes);
  if (!currentMain.ok) {
    return refused("FORGED_RECORD", `Current-main v3 is invalid: ${currentMain.failure.message}`);
  }
  const record = currentMain.value.record;
  if (
    record.sourceRepositoryIdentity !== locator.expectedRepositoryIdentity ||
    record.sourceRepositoryIdentity !== opening.repositoryIdentity
  ) {
    return refused(
      "WRONG_REPOSITORY",
      "Current-main selects a repository other than the explicit locator"
    );
  }

  const sourceRef = parseCanonicalRef(record.sourceRef, "currentMain.sourceRef");
  const contentCommit = parseGitCommitId(record.contentCommit, "currentMain.contentCommit");
  const contentTree = parseGitTreeId(record.contentTree, "currentMain.contentTree");
  if (!sourceRef.ok || !contentCommit.ok || !contentTree.ok) {
    return refused("FORGED_RECORD", "Current-main contains an invalid content revision");
  }
  if (contentCommit.value === opening.headCommit) {
    return refused("FORGED_RECORD", "Current-main cannot select its containing record commit");
  }
  let landedOnMain: boolean;
  try {
    landedOnMain = await git.isAncestor(locator, contentCommit.value, opening.headCommit);
  } catch {
    return refused(
      "UNREACHABLE_REPOSITORY",
      "Could not verify selected content ancestry against canonical main"
    );
  }
  if (!landedOnMain) {
    return refused("STALE_RECORD", "Selected content commit is not reachable from canonical main");
  }

  const releaseInputRead = await git.readFileAtRevision(locator, {
    repositoryIdentity: opening.repositoryIdentity,
    ref: sourceRef.value,
    commit: contentCommit.value,
    tree: contentTree.value,
    path: COMPILED_RELEASE_INPUT_PATH,
  });
  if (!releaseInputRead.ok) {
    return classifyGitReadFailure(releaseInputRead.failure.code, releaseInputRead.failure.message);
  }
  const releaseInput = decodeAgentPluginReleaseInput(releaseInputRead.observation.bytes);
  if (!releaseInput.ok) {
    return refused("FORGED_RECORD", "Selected release input is invalid or noncanonical");
  }
  if (releaseInput.value.releaseInputDigest !== record.releaseInputDigest) {
    return refused("FORGED_RECORD", "Selected release-input digest differs from current-main");
  }
  if (releaseInput.value.body.contentAuthority !== record.contentAuthority) {
    return refused("FORGED_RECORD", "Selected release input declares another content authority");
  }

  const closing = await git.inspect(locator, COMPILED_CANONICAL_REF);
  const closingFailure = classifyInspection(closing, locator.expectedRepositoryIdentity);
  if (closingFailure !== undefined) return closingFailure;
  if (closing.kind !== "Ready" || !sameInspection(opening, closing)) {
    return refused(
      "UNREACHABLE_REPOSITORY",
      "Canonical main changed during current-main selection"
    );
  }

  return Object.freeze({ kind: "CURRENT_ELIGIBLE", selection: record });
}

function classifyInspection(
  inspection: RepositoryInspection,
  expectedRepositoryIdentity: string
): CurrentMainSelectionResult | undefined {
  switch (inspection.kind) {
    case "WrongRepository":
      return refused(
        "WRONG_REPOSITORY",
        `Expected ${expectedRepositoryIdentity}, observed ${inspection.actualRepositoryIdentity}`
      );
    case "UnreachableRepository":
      return refused("UNREACHABLE_REPOSITORY", inspection.reason);
    case "Ready":
      return inspection.repositoryIdentity === expectedRepositoryIdentity &&
        inspection.canonicalRef === COMPILED_CANONICAL_REF
        ? undefined
        : refused(
            "WRONG_REPOSITORY",
            "Canonical Git inspection returned another repository or ref"
          );
  }
}

function classifyGitReadFailure(
  code: GitReadFailureCode,
  message: string
): CurrentMainSelectionResult {
  switch (code) {
    case "MissingObject":
    case "UnreachableObject":
    case "ReadFailed":
      return refused("STALE_RECORD", message);
    case "WrongObject":
    case "ObjectTooLarge":
      return refused("FORGED_RECORD", message);
  }
}

function sameInspection(left: RepositoryInspection, right: RepositoryInspection): boolean {
  return (
    left.kind === "Ready" &&
    right.kind === "Ready" &&
    left.repositoryIdentity === right.repositoryIdentity &&
    left.canonicalRef === right.canonicalRef &&
    left.headCommit === right.headCommit &&
    left.headTree === right.headTree
  );
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

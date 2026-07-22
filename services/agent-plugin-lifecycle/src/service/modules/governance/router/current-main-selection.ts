import {
  decodeAgentPluginReleaseInput,
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
} from "../../../shared/release";

import {
  CURRENT_MAIN_V2_CANONICAL_REF,
  CURRENT_MAIN_V2_RECORD_PATH,
  CURRENT_MAIN_V2_RELEASE_INPUT_PATH,
  MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH,
  type CanonicalChannelSelection,
  type CurrentMainBodyV2,
  type CurrentMainSelectionFailureKind,
  type CurrentMainSelectionResult,
} from "../model/dto/current-main";
import { parseCanonicalRef } from "../model/dto/primitives";
import { validateCurrentMainEnvelopeV2 } from "../model/policy/current-main-record";
import type {
  ExactGitReader,
  GitReadFailureCode,
  RepositoryInspection,
} from "../model/repositories/exact-git";

const COMPILED_CANONICAL_REF = requireCanonicalRef();
const COMPILED_CURRENT_MAIN_PATH = requireRelativePath(
  CURRENT_MAIN_V2_RECORD_PATH,
  "currentMain.path",
);
const COMPILED_RELEASE_INPUT_PATH = requireRelativePath(
  CURRENT_MAIN_V2_RELEASE_INPUT_PATH,
  "currentMain.releaseInputPath",
);
const TRUNCATED_SELECTION_REASON_SUFFIX = "...[truncated]";

export async function resolveCurrentMainSelection(
  git: ExactGitReader,
  locator: Parameters<ExactGitReader["inspect"]>[0],
): Promise<CurrentMainSelectionResult> {
  const opening = await git.inspect(locator, COMPILED_CANONICAL_REF);
  const openingFailure = classifyInspection(opening, locator.expectedRepositoryIdentity);
  if (openingFailure !== undefined) return openingFailure;
  if (opening.kind !== "Ready") {
    return refused("UNREACHABLE_REPOSITORY", "Canonical Git inspection produced no readable main state");
  }

  const recordRead = await git.readBlob(locator, {
    repositoryIdentity: opening.repositoryIdentity,
    ref: opening.canonicalRef,
    commit: opening.headCommit,
    tree: opening.headTree,
    path: COMPILED_CURRENT_MAIN_PATH,
  });
  if (!recordRead.ok) return classifyGitReadFailure(recordRead.failure.code, recordRead.failure.message);

  const currentMain = validateCurrentMainEnvelopeV2(recordRead.observation.bytes);
  if (!currentMain.ok) {
    return refused("FORGED_RECORD", `Current-main v2 is invalid: ${currentMain.failure.message}`);
  }
  const body = currentMain.value.record.body;
  if (
    body.sourceRepositoryIdentity !== locator.expectedRepositoryIdentity
    || body.sourceRepositoryIdentity !== opening.repositoryIdentity
  ) {
    return refused("WRONG_REPOSITORY", "Current-main selects a repository other than the explicit locator");
  }
  const sourceCommit = parseGitCommitId(body.sourceCommit, "currentMain.body.sourceCommit");
  const sourceTree = parseGitTreeId(body.sourceTree, "currentMain.body.sourceTree");
  if (!sourceCommit.ok || !sourceTree.ok) {
    return refused("FORGED_RECORD", "Current-main contains an invalid selected Git identity");
  }

  const reachable = await git.isAncestor(locator, sourceCommit.value, opening.headCommit);
  if (!reachable.ok) {
    return refused(
      "STALE_RECORD",
      `Selected source ancestry cannot be established: ${reachable.failure.message}`,
    );
  }
  if (!reachable.value) {
    return refused(
      "FORGED_RECORD",
      "Selected source commit is not reachable from opening canonical main",
    );
  }

  const releaseInputRead = await git.readBlob(locator, {
    repositoryIdentity: opening.repositoryIdentity,
    ref: opening.canonicalRef,
    commit: sourceCommit.value,
    tree: sourceTree.value,
    path: COMPILED_RELEASE_INPUT_PATH,
  });
  if (!releaseInputRead.ok) {
    return classifyGitReadFailure(releaseInputRead.failure.code, releaseInputRead.failure.message);
  }
  const releaseInput = decodeAgentPluginReleaseInput(releaseInputRead.observation.bytes);
  if (!releaseInput.ok) {
    return refused("FORGED_RECORD", "Selected release input is invalid or noncanonical");
  }
  if (releaseInput.value.releaseInputDigest !== body.releaseInputDigest) {
    return refused("FORGED_RECORD", "Selected release-input digest differs from current-main");
  }
  if (releaseInput.value.body.contentAuthority !== body.contentAuthority) {
    return refused("FORGED_RECORD", "Selected release input declares another content authority");
  }

  const closing = await git.inspect(locator, COMPILED_CANONICAL_REF);
  const closingFailure = classifyInspection(closing, locator.expectedRepositoryIdentity);
  if (closingFailure !== undefined) return closingFailure;
  if (closing.kind !== "Ready" || !sameInspection(opening, closing)) {
    return refused("UNREACHABLE_REPOSITORY", "Canonical main changed during current-main selection");
  }

  return Object.freeze({
    kind: "CURRENT_ELIGIBLE",
    selection: freezeSelection(currentMain.value.currentMainDigest, body),
  });
}

function freezeSelection(
  currentMainDigest: `cm2_${string}`,
  body: CurrentMainBodyV2,
): CanonicalChannelSelection {
  return Object.freeze({
    currentMainDigest,
    contentAuthority: body.contentAuthority,
    sourceRepositoryIdentity: body.sourceRepositoryIdentity,
    sourceCommit: body.sourceCommit,
    sourceTree: body.sourceTree,
    releaseInputDigest: body.releaseInputDigest,
    releaseSetDigest: body.releaseSetDigest,
    evaluationProfile: body.evaluationProfile,
    projections: body.projections,
  });
}

function classifyInspection(
  inspection: RepositoryInspection,
  expectedRepositoryIdentity: string,
): CurrentMainSelectionResult | undefined {
  switch (inspection.kind) {
    case "DirtyRepository":
      return refused("DIRTY_REPOSITORY", "Canonical content workspace is dirty");
    case "WrongRepository":
      return refused(
        "WRONG_REPOSITORY",
        `Expected ${expectedRepositoryIdentity}, observed ${inspection.actualRepositoryIdentity}`,
      );
    case "UnreachableRepository":
      return refused("UNREACHABLE_REPOSITORY", inspection.reason);
    case "Ready":
      return inspection.repositoryIdentity === expectedRepositoryIdentity
        && inspection.canonicalRef === COMPILED_CANONICAL_REF
        ? undefined
        : refused("WRONG_REPOSITORY", "Canonical Git inspection returned another repository or ref");
  }
}

function classifyGitReadFailure(
  code: GitReadFailureCode,
  message: string,
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
  return left.kind === "Ready"
    && right.kind === "Ready"
    && left.repositoryIdentity === right.repositoryIdentity
    && left.canonicalRef === right.canonicalRef
    && left.headCommit === right.headCommit
    && left.headTree === right.headTree;
}

function refused(
  kind: CurrentMainSelectionFailureKind,
  reason: string,
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

function requireCanonicalRef() {
  const parsed = parseCanonicalRef(CURRENT_MAIN_V2_CANONICAL_REF, "currentMain.canonicalRef");
  if (!parsed.ok) throw new Error("Compiled current-main ref is invalid");
  return parsed.value;
}

function requireRelativePath(value: string, path: string) {
  const parsed = parseReleaseRelativePath(value, path);
  if (!parsed.ok) throw new Error(`Compiled ${path} is invalid`);
  return parsed.value;
}

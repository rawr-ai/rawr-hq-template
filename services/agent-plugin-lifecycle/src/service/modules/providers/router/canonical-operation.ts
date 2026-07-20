import {
  createCompleteSetArtifactRef,
  parseReleaseSetDigest,
} from "../../../shared/release";

import type {
  CanonicalDesiredState,
  CanonicalDesiredStateResolution,
} from "../model/dto/canonical-desired-state";
import type { ContentRecordLocator } from "../model/dto/mode";
import {
  issue,
  type NonEmptyReadonlyArray,
  type ProviderDeploymentIssue,
} from "../model/errors/deployment-result";
import { resolveCanonicalDesiredStates } from "../model/policy/canonical-desired-state";
import type { VerifiedReleaseReader } from "../model/repositories/artifact";
import type { CurrentMainSelectionReader } from "../model/repositories/current-main";

export interface CanonicalSelectionDependencies {
  readonly currentMain: CurrentMainSelectionReader;
  readonly releases: VerifiedReleaseReader;
}

export type CanonicalOperationSelection =
  | Readonly<{
    status: "RESOLVED";
    desired: CanonicalDesiredStateResolution & { readonly status: "RESOLVED" };
  }>
  | Readonly<{
    status: "BLOCKED_SELECTION";
    issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>;
  }>;

export async function resolveCanonicalOperationSelection(
  locator: ContentRecordLocator,
  dependencies: CanonicalSelectionDependencies,
): Promise<CanonicalOperationSelection> {
  const currentMain = await dependencies.currentMain.resolve(locator);
  if (currentMain.kind !== "CURRENT_ELIGIBLE") {
    return blocked([issue(
      "CHANNEL_NOT_ELIGIBLE",
      "selection.currentMain",
      currentMain.reason,
      "CURRENT_ELIGIBLE",
      currentMain.kind,
    )]);
  }

  const releaseSetDigest = parseReleaseSetDigest(
    currentMain.selection.releaseSetDigest,
    "selection.releaseSetDigest",
  );
  if (!releaseSetDigest.ok) {
    return blocked([issue(
      "INVALID_DIGEST",
      "selection.releaseSetDigest",
      releaseSetDigest.issues[0].message,
    )]);
  }

  const artifact = await dependencies.releases.read(
    createCompleteSetArtifactRef(releaseSetDigest.value),
  );
  if (!artifact.ok) return blocked(artifact.issues);

  const desired = resolveCanonicalDesiredStates(currentMain.selection, artifact.value);
  return desired.status === "RESOLVED"
    ? Object.freeze({ status: "RESOLVED", desired })
    : blocked(desired.issues);
}

export function desiredForTarget(
  desired: Extract<CanonicalOperationSelection, { status: "RESOLVED" }>["desired"],
  provider: CanonicalDesiredState["projection"]["provider"],
): CanonicalDesiredState {
  return provider === "claude" ? desired.desired[0] : desired.desired[1];
}

function blocked(
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>,
): Extract<CanonicalOperationSelection, { status: "BLOCKED_SELECTION" }> {
  return Object.freeze({
    status: "BLOCKED_SELECTION",
    issues: Object.freeze(issues),
  });
}

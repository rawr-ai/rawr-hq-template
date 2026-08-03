import type { SourceEligibilityIssue } from "../../../../model/dto/content-workspace";
import type {
  DerivedReleaseSelection,
  ReleaseSelection,
} from "../../../../model/dto/release-derivation";
import type {
  CheckResult,
  ReleaseDerivationIdentity,
  RepositoryCheckResult,
} from "../dto/release-lifecycle";
import { normalizeReleaseSourceChangedDetail } from "../dto/release-lifecycle";

/** Projects one Releases check derivation into the frozen identity returned by eligibility. */
export function createReleaseCheckDerivationIdentity(
  mode: ReleaseSelection,
  derivation: DerivedReleaseSelection
): ReleaseDerivationIdentity {
  if (mode.kind === "complete-set") {
    if (derivation.releaseSet === undefined) {
      throw new Error("Complete-set release construction returned no release set");
    }
    return Object.freeze({
      kind: "complete-set",
      releaseSetDigest: derivation.releaseSet.releaseSetDigest,
      members: Object.freeze(
        derivation.releaseSet.body.members.map((member) =>
          Object.freeze({
            pluginId: member.pluginId,
            releaseDigest: member.releaseDigest,
          })
        )
      ),
    });
  }
  const release = derivation.releases[0];
  if (release === undefined || derivation.releases.length !== 1) {
    throw new Error("Targeted release construction did not return exactly one release");
  }
  return Object.freeze({
    kind: "release",
    pluginId: release.body.pluginId,
    releaseDigest: release.releaseDigest,
  });
}

/** Wraps one or more source findings in the Releases check result vocabulary. */
export function createReleaseCheckIneligibleResult(
  mode: ReleaseSelection,
  [firstIssue, ...remainingIssues]: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]]
): Extract<CheckResult, { kind: "IneligibleReport" }> {
  return {
    kind: "IneligibleReport",
    mode,
    issues: [
      Object.freeze({ kind: "SourceEligibility", issue: firstIssue }),
      ...remainingIssues.map((issue) =>
        Object.freeze({ kind: "SourceEligibility" as const, issue })
      ),
    ],
  };
}

/** Bounds staged source-change detail for the public repository-check result. */
export function createRepositoryCheckSourceChangedResult(
  detail: string
): Extract<RepositoryCheckResult, { kind: "SourceChanged" }> {
  return {
    kind: "SourceChanged",
    mode: "staged",
    detail: normalizeReleaseSourceChangedDetail(detail),
  };
}

import { ORPCError } from "@orpc/client";
import { Effect } from "effect";

import type {
  DerivedReleaseSelection,
  ReleaseSelection,
} from "#agent-plugin-lifecycle-service/model/dto/release-derivation";
import type { SourceEligibilityIssue } from "#agent-plugin-lifecycle-service/model/dto/releases/content-workspace";
import { deriveReleaseSelection } from "#agent-plugin-lifecycle-service/model/policy/release-derivation";
import type {
  CheckResult,
  ReleaseCheckIssue,
  ReleaseDerivationIdentity,
} from "../model/dto/release-lifecycle";
import { releaseConstructionIssue } from "../model/dto/release-lifecycle";
import { module } from "../module";

/** Checks whether one exact content snapshot can produce the requested release selection. */
export const check = module.check.effect(function* ({ context, input: request }) {
  const inspected = yield* Effect.tryPromise({
    try: () => context.source.inspect(request.contentWorkspace),
    catch: (cause) => new ORPCError("INTERNAL_SERVER_ERROR", { cause }),
  });
  if (inspected.kind === "Ineligible") return ineligibleReport(request.mode, inspected.issues);
  const derivation = deriveReleaseSelection(inspected.snapshot, request.mode);
  if (!derivation.ok) {
    return {
      kind: "IneligibleReport" as const,
      mode: request.mode,
      issues: [releaseConstructionIssue(derivation.detail)] as const,
    };
  }
  return {
    kind: "EligibleReport" as const,
    derivation: releaseDerivationIdentity(derivation.value),
    eligibilityBinding: inspected.snapshot.eligibilityBinding,
  };
});

function releaseDerivationIdentity(derivation: DerivedReleaseSelection): ReleaseDerivationIdentity {
  if (derivation.releaseSet !== undefined) {
    return Object.freeze({
      kind: "complete-set",
      releaseSetDigest: derivation.releaseSet.releaseSetDigest,
      members: Object.freeze(
        derivation.releaseSet.body.members.map((member) =>
          Object.freeze({
            pluginId: member.pluginId,
            releaseDigest: member.releaseDigest,
            artifactDigest: member.artifactDigest,
          })
        )
      ),
    });
  }
  const release = derivation.releases[0]!;
  return Object.freeze({
    kind: "release",
    pluginId: release.artifactBody.releaseBody.pluginId,
    releaseDigest: release.releaseDigest,
    artifactDigest: release.artifactDigest,
  });
}

function ineligibleReport(
  mode: ReleaseSelection,
  issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]]
): CheckResult {
  return { kind: "IneligibleReport", mode, issues: sourceIssues(issues) };
}

function sourceIssues(
  issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]]
): readonly [ReleaseCheckIssue, ...ReleaseCheckIssue[]] {
  return issues.map((issue) => Object.freeze({ kind: "SourceEligibility", issue })) as [
    ReleaseCheckIssue,
    ...ReleaseCheckIssue[],
  ];
}

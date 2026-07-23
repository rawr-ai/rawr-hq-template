import type { SourceEligibilityIssue } from "../../../model/dto/releases/content-workspace";
import type {
  CheckResult,
  ReleaseCheckIssue,
  ReleaseSelection,
} from "../model/dto/release-lifecycle";
import { deriveReleaseSelection } from "../model/policy/release-plan";
import { module } from "../module";

export const check = module.check.handler(async ({ context, input: request }) => {
  const inspected = await context.source.inspect(request.contentWorkspace);
  if (inspected.kind === "Ineligible") return ineligibleReport(request.mode, inspected.issues);
  const derivation = deriveReleaseSelection(inspected.snapshot, request.mode);
  if (!derivation.ok)
    return { kind: "IneligibleReport" as const, mode: request.mode, issues: derivation.issues };
  return {
    kind: "EligibleReport" as const,
    derivation: derivation.value.identity,
    eligibilityBinding: inspected.snapshot.eligibilityBinding,
  };
});

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

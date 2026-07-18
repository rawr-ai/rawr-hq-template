import type { SourceEligibilityIssue } from "../model/dto/content-workspace";
import type {
  BuildIssue,
  BuildMode,
  CheckResult,
} from "../model/dto/release-lifecycle";
import { constructPlan } from "../model/policy/release-plan";
import { module } from "../module";

export const check = module.check.handler(async ({ context, input: request }) => {
  const inspected = await context.releases.source.inspect(request.contentWorkspace);
  if (inspected.kind === "Ineligible") return ineligibleReport(request.mode, inspected.issues);
  const plan = constructPlan(inspected.snapshot, request.mode);
  if (!plan.ok) return { kind: "IneligibleReport" as const, mode: request.mode, issues: plan.issues };
  return {
    kind: "EligibleReport" as const,
    mode: request.mode,
    candidate: plan.value.finalRef,
    eligibilityBinding: inspected.snapshot.eligibilityBinding,
  };
});

function ineligibleReport(
  mode: BuildMode,
  issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]],
): CheckResult {
  return { kind: "IneligibleReport", mode, issues: sourceIssues(issues) };
}

function sourceIssues(
  issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]],
): readonly [BuildIssue, ...BuildIssue[]] {
  return issues.map((issue) => Object.freeze({ kind: "SourceEligibility", issue })) as [BuildIssue, ...BuildIssue[]];
}

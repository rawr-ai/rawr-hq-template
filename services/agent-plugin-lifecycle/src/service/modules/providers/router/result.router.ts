import type { SelectedContent } from "../../../model/dependencies/providers";
import type {
  ProviderIssue,
  ProviderMutationTargetResult,
  ProviderStatusTargetResult,
  ProviderTarget,
  ProviderTargetResult,
  ProviderTestResult,
} from "../model/dto/provider-lifecycle";
import {
  providerIssue,
  selectedContentObservation,
} from "../model/policy/selected-content";

export function rejectedTargets(
  targets: readonly ProviderTarget[],
  issues: readonly ProviderIssue[]
): readonly ProviderMutationTargetResult[] {
  return Object.freeze(
    targets.map((target) =>
      Object.freeze({
        target,
        classification: "Blocked" as const,
        operations: Object.freeze([]),
        facts: Object.freeze([]),
        issues: Object.freeze([...issues]),
      })
    )
  );
}

export function rejectedStatusTargets(
  targets: readonly ProviderTarget[],
  issues: readonly ProviderIssue[]
): readonly ProviderStatusTargetResult[] {
  return Object.freeze(
    targets.map((target) =>
      Object.freeze({
        target,
        classification: "Blocked" as const,
        operations: Object.freeze([]) as readonly [],
        facts: Object.freeze([]),
        issues: Object.freeze([...issues]),
      })
    )
  );
}

export function sourceChangedTargets(
  targets: readonly ProviderTarget[],
  detail = "Selected content changed immediately before native mutation."
): readonly ProviderMutationTargetResult[] {
  return rejectedTargets(targets, [providerIssue("SourceChanged", detail)]);
}

export function collectTargetIssues(
  targets: readonly ProviderTargetResult[]
): readonly ProviderIssue[] {
  return Object.freeze(targets.flatMap((target) => target.issues).slice(0, 256));
}

export function mutationClassification(
  targets: readonly ProviderMutationTargetResult[]
): ProviderTestResult["classification"] {
  if (targets.some((target) => target.classification === "Uncertain")) return "Uncertain";
  const changed = targets.some(
    (target) => target.classification === "Changed" || target.operations.length > 0
  );
  const failed = targets.some(
    (target) =>
      target.classification === "Failed" || target.classification === "NotAttempted"
  );
  if (failed) return changed ? "Partial" : "Failed";
  if (targets.some((target) => target.classification === "Blocked")) return "Blocked";
  return changed ? "Changed" : "Converged";
}

export function selectionObservation(content: SelectedContent) {
  return selectedContentObservation(content);
}

export function canonicalProviderTargets(
  targets: readonly ProviderTarget[]
): readonly [ProviderTarget, ...ProviderTarget[]] {
  const sorted = [...targets].sort((left, right) => {
    const provider = compareText(left.provider, right.provider);
    return provider === 0 ? compareText(left.home, right.home) : provider;
  });
  const first = sorted[0];
  if (first === undefined) throw new Error("Provider targets must be nonempty");
  return Object.freeze([first, ...sorted.slice(1)]);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

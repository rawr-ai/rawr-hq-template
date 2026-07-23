import { awaitDependencyPromise } from "../../../base";
import type {
  NativeProviderSessionResolver,
  SelectedContentResolver,
} from "../../../model/dependencies/providers";
import type { ProviderTestRequest, ProviderTestResult } from "../model/dto/provider-lifecycle";
import { sameSelectedContent } from "../model/policy/selected-content";
import { module } from "../module";
import {
  allTargetsConverged,
  blockedTargetResults,
  convergedMutationTargetResult,
  hasBlockingAssessment,
  inspectProviderTargets,
  reconcileProviderTargets,
} from "./reconcile.router";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  mutationClassification,
  rejectedTargets,
  selectionObservation,
  sourceChangedTargets,
} from "./result.router";
import { resolveTestSelection } from "./selection.router";

export interface ProviderTestDependencies {
  readonly selectedContent: SelectedContentResolver;
  readonly nativeSessions: NativeProviderSessionResolver;
}

export const test = module.test.effect(function* ({ context, input }) {
  return yield* awaitDependencyPromise(() => runProviderTest(input, context));
});

export async function runProviderTest(
  request: ProviderTestRequest,
  dependencies: ProviderTestDependencies
): Promise<ProviderTestResult> {
  const canonicalRequest = Object.freeze({
    ...request,
    targets: canonicalProviderTargets(request.targets),
  });
  const selected = await resolveTestSelection(canonicalRequest, dependencies.selectedContent);
  if (selected.kind === "Rejected") {
    return {
      operation: "test",
      classification: "Blocked",
      selection: null,
      targets: rejectedTargets(canonicalRequest.targets, selected.issues),
      issues: selected.issues,
    };
  }
  // Disposable testing may replace selected members, but it never retires
  // other provider state. Canonical complete-set retirement belongs to sync.
  const retireOmitted = false;
  const initial = await inspectProviderTargets(
    selected.content,
    canonicalRequest.targets,
    dependencies.nativeSessions,
    { retireOmitted },
    true
  );
  if (hasBlockingAssessment(initial)) {
    return completeResult(selected.content, blockedTargetResults(initial));
  }
  if (allTargetsConverged(initial)) {
    return completeResult(
      selected.content,
      Object.freeze(initial.map(convergedMutationTargetResult))
    );
  }

  const revalidated = await resolveTestSelection(canonicalRequest, dependencies.selectedContent);
  if (
    revalidated.kind === "Rejected" ||
    !sameSelectedContent(selected.content, revalidated.content)
  ) {
    return blockedResult(selected.content, sourceChangedTargets(canonicalRequest.targets));
  }
  const finalPreflight = await inspectProviderTargets(
    revalidated.content,
    canonicalRequest.targets,
    dependencies.nativeSessions,
    { retireOmitted },
    true
  );
  if (hasBlockingAssessment(finalPreflight)) {
    return completeResult(revalidated.content, blockedTargetResults(finalPreflight));
  }
  const targets = allTargetsConverged(finalPreflight)
    ? Object.freeze(finalPreflight.map(convergedMutationTargetResult))
    : await reconcileProviderTargets(revalidated.content, finalPreflight, { retireOmitted });
  return completeResult(revalidated.content, targets);
}

function completeResult(
  content: Parameters<typeof selectionObservation>[0],
  targets: ProviderTestResult["targets"]
): ProviderTestResult {
  return {
    operation: "test",
    classification: mutationClassification(targets),
    selection: selectionObservation(content),
    targets,
    issues: collectTargetIssues(targets),
  };
}

function blockedResult(
  content: Parameters<typeof selectionObservation>[0],
  targets: ProviderTestResult["targets"]
): ProviderTestResult {
  return {
    operation: "test",
    classification: "Blocked",
    selection: selectionObservation(content),
    targets,
    issues: collectTargetIssues(targets),
  };
}

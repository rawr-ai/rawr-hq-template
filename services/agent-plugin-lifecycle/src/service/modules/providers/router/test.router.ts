import type { NativeAgentProviderResources } from "@rawr/resource-native-agent-provider";
import { Effect } from "effect";
import type { ProviderTestRequest, ProviderTestResult } from "../model/dto/provider-lifecycle";
import { sameSelectedContent } from "../model/policy/selected-content";
import type { SelectedContentResolver } from "../model/ports/selected-content";
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

/** Ready capability set consumed by the disposable Provider test operation. */
export interface ProviderTestDependencies {
  readonly selectedContent: SelectedContentResolver;
  readonly nativeProviders: NativeAgentProviderResources;
}

export const test = module.test.effect(function* ({ context, input }) {
  return yield* runProviderTest(input, context);
});

/** Authors disposable Provider convergence over the app-supplied ready catalog. */
export function runProviderTest(
  request: ProviderTestRequest,
  dependencies: ProviderTestDependencies
) {
  return Effect.gen(function* () {
    const canonicalRequest = Object.freeze({
      ...request,
      targets: canonicalProviderTargets(request.targets),
    });
    const selected = yield* resolveTestSelection(canonicalRequest, dependencies.selectedContent);
    if (selected.kind === "Rejected") {
      return {
        operation: "test",
        classification: "Blocked",
        selection: null,
        targets: rejectedTargets(canonicalRequest.targets, selected.issues),
        issues: selected.issues,
      } satisfies ProviderTestResult;
    }
    // Disposable testing may replace selected members, but it never retires
    // other provider state. Canonical complete-set retirement belongs to sync.
    const retireOmitted = false;
    const initial = yield* inspectProviderTargets(
      selected.content,
      canonicalRequest.targets,
      dependencies.nativeProviders,
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

    const revalidated = yield* resolveTestSelection(canonicalRequest, dependencies.selectedContent);
    if (
      revalidated.kind === "Rejected" ||
      !sameSelectedContent(selected.content, revalidated.content)
    ) {
      return blockedResult(selected.content, sourceChangedTargets(canonicalRequest.targets));
    }
    const finalPreflight = yield* inspectProviderTargets(
      revalidated.content,
      canonicalRequest.targets,
      dependencies.nativeProviders,
      { retireOmitted },
      true
    );
    if (hasBlockingAssessment(finalPreflight)) {
      return completeResult(revalidated.content, blockedTargetResults(finalPreflight));
    }
    const targets = allTargetsConverged(finalPreflight)
      ? Object.freeze(finalPreflight.map(convergedMutationTargetResult))
      : yield* reconcileProviderTargets(revalidated.content, finalPreflight, { retireOmitted });
    return completeResult(revalidated.content, targets);
  });
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

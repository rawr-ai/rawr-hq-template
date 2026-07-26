import type { NativeAgentProviderResources } from "@rawr/resource-native-agent-provider";
import { Effect } from "effect";
import type { CurrentMainSelectionReader } from "../../../model/dependencies/current-main";
import type { ProviderSyncRequest, ProviderSyncResult } from "../model/dto/provider-lifecycle";
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
import { resolveChannelSelection } from "./selection.router";

/** Ready capability set consumed by the Provider synchronization operation. */
export interface ProviderSyncDependencies {
  readonly currentMain: CurrentMainSelectionReader;
  readonly selectedContent: SelectedContentResolver;
  readonly nativeProviders: NativeAgentProviderResources;
}

export const sync = module.sync.effect(function* ({ context, input }) {
  return yield* runProviderSync(input, context);
});

/** Authors the Provider synchronization flow over interruptible native Effects. */
export function runProviderSync(
  request: ProviderSyncRequest,
  dependencies: ProviderSyncDependencies
) {
  return Effect.gen(function* () {
    const canonicalRequest = Object.freeze({
      ...request,
      targets: canonicalProviderTargets(request.targets),
    });
    const selected = yield* resolveChannelSelection(
      canonicalRequest,
      dependencies.currentMain,
      dependencies.selectedContent
    );
    if (selected.kind === "Rejected") {
      return blockedResult(canonicalRequest, selected.issues);
    }
    const initial = yield* inspectProviderTargets(
      selected.content,
      canonicalRequest.targets,
      dependencies.nativeProviders,
      { retireOmitted: true },
      true
    );
    if (hasBlockingAssessment(initial)) {
      const targets = blockedTargetResults(initial);
      return {
        operation: "sync",
        classification: mutationClassification(targets),
        selection: selectionObservation(selected.content),
        targets,
        issues: collectTargetIssues(targets),
      } satisfies ProviderSyncResult;
    }
    if (allTargetsConverged(initial)) {
      const targets = Object.freeze(initial.map(convergedMutationTargetResult));
      return {
        operation: "sync",
        classification: "Converged",
        selection: selectionObservation(selected.content),
        targets,
        issues: collectTargetIssues(targets),
      } satisfies ProviderSyncResult;
    }

    const revalidated = yield* resolveChannelSelection(
      canonicalRequest,
      dependencies.currentMain,
      dependencies.selectedContent
    );
    if (
      revalidated.kind === "Rejected" ||
      !sameSelectedContent(selected.content, revalidated.content)
    ) {
      const targets = sourceChangedTargets(canonicalRequest.targets);
      return {
        operation: "sync",
        classification: "Blocked",
        selection: selectionObservation(selected.content),
        targets,
        issues: collectTargetIssues(targets),
      } satisfies ProviderSyncResult;
    }

    const finalPreflight = yield* inspectProviderTargets(
      revalidated.content,
      canonicalRequest.targets,
      dependencies.nativeProviders,
      { retireOmitted: true },
      true
    );
    if (hasBlockingAssessment(finalPreflight)) {
      const targets = blockedTargetResults(finalPreflight);
      return {
        operation: "sync",
        classification: mutationClassification(targets),
        selection: selectionObservation(revalidated.content),
        targets,
        issues: collectTargetIssues(targets),
      } satisfies ProviderSyncResult;
    }
    const targets = allTargetsConverged(finalPreflight)
      ? Object.freeze(finalPreflight.map(convergedMutationTargetResult))
      : yield* reconcileProviderTargets(revalidated.content, finalPreflight, {
          retireOmitted: true,
        });
    return {
      operation: "sync",
      classification: mutationClassification(targets),
      selection: selectionObservation(revalidated.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  });
}

function blockedResult(
  request: ProviderSyncRequest,
  issues: ProviderSyncResult["issues"]
): ProviderSyncResult {
  return {
    operation: "sync",
    classification: "Blocked",
    selection: null,
    targets: rejectedTargets(request.targets, issues),
    issues,
  };
}

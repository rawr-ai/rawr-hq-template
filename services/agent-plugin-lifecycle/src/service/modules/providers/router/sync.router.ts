import type { CurrentMainSelectionReader } from "../../../model/dependencies/current-main";
import type {
  NativeProviderSessionResolver,
  SelectedContentResolver,
} from "../../../model/dependencies/providers";
import type { ProviderSyncRequest, ProviderSyncResult } from "../model/dto/provider-lifecycle";
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
import { resolveChannelSelection } from "./selection.router";

export interface ProviderSyncDependencies {
  readonly currentMain: CurrentMainSelectionReader;
  readonly selectedContent: SelectedContentResolver;
  readonly nativeSessions: NativeProviderSessionResolver;
}

export const sync = module.sync.handler(async ({ context, input }) =>
  runProviderSync(input, context)
);

export async function runProviderSync(
  request: ProviderSyncRequest,
  dependencies: ProviderSyncDependencies
): Promise<ProviderSyncResult> {
  const canonicalRequest = Object.freeze({
    ...request,
    targets: canonicalProviderTargets(request.targets),
  });
  const selected = await resolveChannelSelection(
    canonicalRequest,
    dependencies.currentMain,
    dependencies.selectedContent
  );
  if (selected.kind === "Rejected") {
    return blockedResult(canonicalRequest, selected.issues);
  }
  const initial = await inspectProviderTargets(
    selected.content,
    canonicalRequest.targets,
    dependencies.nativeSessions,
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
    };
  }
  if (allTargetsConverged(initial)) {
    const targets = Object.freeze(initial.map(convergedMutationTargetResult));
    return {
      operation: "sync",
      classification: "Converged",
      selection: selectionObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    };
  }

  const revalidated = await resolveChannelSelection(
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
    };
  }

  const finalPreflight = await inspectProviderTargets(
    revalidated.content,
    canonicalRequest.targets,
    dependencies.nativeSessions,
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
    };
  }
  const targets = allTargetsConverged(finalPreflight)
    ? Object.freeze(finalPreflight.map(convergedMutationTargetResult))
    : await reconcileProviderTargets(revalidated.content, finalPreflight, {
        retireOmitted: true,
      });
  return {
    operation: "sync",
    classification: mutationClassification(targets),
    selection: selectionObservation(revalidated.content),
    targets,
    issues: collectTargetIssues(targets),
  };
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

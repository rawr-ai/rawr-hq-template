import { awaitDependencyPromise } from "../../../base";
import type { CurrentMainSelectionReader } from "../../../model/dependencies/current-main";
import type {
  NativeProviderSessionResolver,
  SelectedContentResolver,
} from "../../../model/dependencies/providers";
import type { ProviderStatusRequest, ProviderStatusResult } from "../model/dto/provider-lifecycle";
import { module } from "../module";
import { inspectProviderTargets, statusTargetResult } from "./reconcile.router";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  rejectedStatusTargets,
  selectionObservation,
} from "./result.router";
import { resolveChannelSelection } from "./selection.router";

export interface ProviderStatusDependencies {
  readonly currentMain: CurrentMainSelectionReader;
  readonly selectedContent: SelectedContentResolver;
  readonly nativeSessions: NativeProviderSessionResolver;
}

export const status = module.status.effect(function* ({ context, input }) {
  return yield* awaitDependencyPromise(() => runProviderStatus(input, context));
});

export async function runProviderStatus(
  request: ProviderStatusRequest,
  dependencies: ProviderStatusDependencies
): Promise<ProviderStatusResult> {
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
    return {
      operation: "status",
      classification: "Blocked",
      selection: null,
      targets: rejectedStatusTargets(canonicalRequest.targets, selected.issues),
      issues: selected.issues,
    };
  }
  const assessments = await inspectProviderTargets(
    selected.content,
    canonicalRequest.targets,
    dependencies.nativeSessions,
    { retireOmitted: true },
    false
  );
  const targets = Object.freeze(assessments.map(statusTargetResult));
  const classification = targets.some((target) => target.classification === "Blocked")
    ? "Blocked"
    : targets.some((target) => target.classification === "Failed")
      ? "Failed"
      : targets.some((target) => target.classification === "Drifted")
        ? "Drifted"
        : "Converged";
  return {
    operation: "status",
    classification,
    selection: selectionObservation(selected.content),
    targets,
    issues: collectTargetIssues(targets),
  };
}

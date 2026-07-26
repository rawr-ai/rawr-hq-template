import type { NativeAgentProviderResources } from "@rawr/resource-native-agent-provider";
import { Effect } from "effect";
import type { CurrentMainSelectionReader } from "../../../model/dependencies/current-main";
import type { ProviderStatusRequest, ProviderStatusResult } from "../model/dto/provider-lifecycle";
import type { SelectedContentResolver } from "../model/ports/selected-content";
import { module } from "../module";
import { inspectProviderTargets, statusTargetResult } from "./reconcile.router";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  rejectedStatusTargets,
  selectionObservation,
} from "./result.router";
import { resolveChannelSelection } from "./selection.router";

/** Ready capability set consumed by the Provider status operation. */
export interface ProviderStatusDependencies {
  readonly currentMain: CurrentMainSelectionReader;
  readonly selectedContent: SelectedContentResolver;
  readonly nativeProviders: NativeAgentProviderResources;
}

export const status = module.status.effect(function* ({ context, input }) {
  return yield* runProviderStatus(input, context);
});

/** Authors the Provider status flow without lowering native resources to Promise. */
export function runProviderStatus(
  request: ProviderStatusRequest,
  dependencies: ProviderStatusDependencies
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
      return {
        operation: "status",
        classification: "Blocked",
        selection: null,
        targets: rejectedStatusTargets(canonicalRequest.targets, selected.issues),
        issues: selected.issues,
      } satisfies ProviderStatusResult;
    }
    const assessments = yield* inspectProviderTargets(
      selected.content,
      canonicalRequest.targets,
      dependencies.nativeProviders,
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
    } satisfies ProviderStatusResult;
  });
}

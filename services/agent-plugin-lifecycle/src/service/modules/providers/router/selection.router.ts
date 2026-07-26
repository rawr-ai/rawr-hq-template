import { Effect } from "effect";
import type { CurrentMainSelectionResult } from "#agent-plugin-lifecycle-service/model/dto/current-main-selection";
import type { ProviderStatusRequest, ProviderSyncRequest } from "../model/dto/provider-lifecycle";
import { providerIssue, providerSelectionResolution } from "../model/policy/selected-content";
import type { SelectedContentResolver } from "../model/ports/selected-content";

export type ProviderChannelRequest = ProviderStatusRequest | ProviderSyncRequest;

export type ProviderSelectionResolution = ReturnType<typeof providerSelectionResolution>;

export function resolveChannelSelection(
  request: ProviderChannelRequest,
  currentMain: CurrentMainSelectionResult,
  selectedContent: SelectedContentResolver
): Effect.Effect<ProviderSelectionResolution> {
  return Effect.gen(function* () {
    if (currentMain.kind !== "CURRENT_ELIGIBLE") {
      return rejected(`${currentMain.kind}: ${currentMain.reason}`);
    }
    const resolved = yield* selectedContent.resolveChannel({
      locator: request.locator,
      selection: currentMain.selection,
    });
    return providerSelectionResolution(resolved);
  });
}

function rejected(detail: string): ProviderSelectionResolution {
  return {
    kind: "Rejected",
    issues: [providerIssue("SelectionRejected", detail)],
  };
}

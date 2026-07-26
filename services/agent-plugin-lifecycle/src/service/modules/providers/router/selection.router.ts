import { Effect } from "effect";
import type { CurrentMainSelectionReader } from "../../../model/dependencies/current-main";
import type {
  ProviderIssue,
  ProviderStatusRequest,
  ProviderSyncRequest,
  ProviderTestRequest,
} from "../model/dto/provider-lifecycle";
import type { SelectedContent, SelectedContentResolution } from "../model/dto/selected-content";
import { providerIssue, validateSelectedContent } from "../model/policy/selected-content";
import type { SelectedContentResolver } from "../model/ports/selected-content";

export type ProviderChannelRequest = ProviderStatusRequest | ProviderSyncRequest;

export type ProviderSelectionResolution =
  | Readonly<{ kind: "Selected"; content: SelectedContent }>
  | Readonly<{ kind: "Rejected"; issues: readonly ProviderIssue[] }>;

export function resolveChannelSelection(
  request: ProviderChannelRequest,
  currentMain: CurrentMainSelectionReader,
  selectedContent: SelectedContentResolver
): Effect.Effect<ProviderSelectionResolution> {
  return Effect.gen(function* () {
    const selected = yield* currentMain.resolve(request.locator);
    if (selected.kind !== "CURRENT_ELIGIBLE") {
      return rejected(`${selected.kind}: ${selected.reason}`);
    }
    const resolved = yield* selectedContent.resolveChannel({
      locator: request.locator,
      selection: selected.selection,
    });
    return validateResolution(resolved);
  });
}

export function resolveTestSelection(
  request: ProviderTestRequest,
  selectedContent: SelectedContentResolver
): Effect.Effect<ProviderSelectionResolution> {
  return Effect.gen(function* () {
    const resolved = yield* selectedContent.resolveWorkspace({
      contentWorkspace: request.contentWorkspace,
      mode: request.mode,
    });
    return validateResolution(resolved);
  });
}

function validateResolution(resolved: SelectedContentResolution): ProviderSelectionResolution {
  if (resolved.kind === "Rejected") {
    return {
      kind: "Rejected",
      issues: Object.freeze(
        resolved.issues.map((issue) =>
          providerIssue("SelectionRejected", `${issue.code}: ${issue.detail}`)
        )
      ),
    };
  }
  const issues = validateSelectedContent(resolved.content);
  return issues.length === 0
    ? { kind: "Selected", content: resolved.content }
    : { kind: "Rejected", issues: Object.freeze(issues.slice(0, 256)) };
}

function rejected(detail: string): ProviderSelectionResolution {
  return {
    kind: "Rejected",
    issues: [providerIssue("SelectionRejected", detail)],
  };
}

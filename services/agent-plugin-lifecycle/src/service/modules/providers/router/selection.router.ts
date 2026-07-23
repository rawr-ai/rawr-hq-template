import type { CurrentMainSelectionReader } from "../../../model/dependencies/current-main";
import type {
  SelectedContent,
  SelectedContentResolver,
} from "../../../model/dependencies/providers";
import type {
  ProviderIssue,
  ProviderStatusRequest,
  ProviderSyncRequest,
  ProviderTestRequest,
} from "../model/dto/provider-lifecycle";
import { providerIssue, validateSelectedContent } from "../model/policy/selected-content";

export type ProviderChannelRequest = ProviderStatusRequest | ProviderSyncRequest;

export type ProviderSelectionResolution =
  | Readonly<{ kind: "Selected"; content: SelectedContent }>
  | Readonly<{ kind: "Rejected"; issues: readonly ProviderIssue[] }>;

export async function resolveChannelSelection(
  request: ProviderChannelRequest,
  currentMain: CurrentMainSelectionReader,
  selectedContent: SelectedContentResolver
): Promise<ProviderSelectionResolution> {
  let selected;
  try {
    selected = await currentMain.resolve(request.locator);
  } catch (error) {
    return rejected(`Current-main selection failed: ${errorDetail(error)}`);
  }
  if (selected.kind !== "CURRENT_ELIGIBLE") {
    return rejected(`${selected.kind}: ${selected.reason}`);
  }
  let resolved;
  try {
    resolved = await selectedContent.resolveChannel({
      locator: request.locator,
      selection: selected.selection,
    });
  } catch (error) {
    return rejected(`Selected-content resolution failed: ${errorDetail(error)}`);
  }
  return validateResolution(resolved);
}

export async function resolveTestSelection(
  request: ProviderTestRequest,
  selectedContent: SelectedContentResolver
): Promise<ProviderSelectionResolution> {
  let resolved;
  try {
    resolved = await selectedContent.resolveWorkspace({
      contentWorkspace: request.contentWorkspace,
      mode: request.mode,
    });
  } catch (error) {
    return rejected(`Selected-content resolution failed: ${errorDetail(error)}`);
  }
  return validateResolution(resolved);
}

function validateResolution(
  resolved: Awaited<ReturnType<SelectedContentResolver["resolveChannel"]>>
): ProviderSelectionResolution {
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

function errorDetail(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "Dependency failed without a readable diagnostic.";
}

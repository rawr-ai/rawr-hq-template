import type { VerifiedArtifactSnapshotV1 } from "../../../../shared/release";
import type { CanonicalChannelSelection } from "../../../../model/dto/current-main-selection";

import {
  type CanonicalDesiredState,
  type CanonicalDesiredStateResolution,
} from "../dto/canonical-desired-state";
import type { ProviderId } from "../dto/provider-target";
import {
  failure,
  issue,
  success,
  type DeploymentResult,
  type NonEmptyReadonlyArray,
  type ProviderDeploymentIssue,
} from "../errors/deployment-result";
import { parseAdapterProtocol, renderCompleteProjection } from "./projection";

export function resolveCanonicalDesiredStates(
  selection: CanonicalChannelSelection,
  snapshot: VerifiedArtifactSnapshotV1
): CanonicalDesiredStateResolution {
  if (snapshot.kind !== "complete-set") {
    return blocked([
      issue(
        "ARTIFACT_KIND_MISMATCH",
        "artifact",
        "Canonical selection requires one verified complete-set artifact",
        "complete-set",
        snapshot.kind
      ),
    ]);
  }

  const identityIssues = selectionIdentityIssues(selection, snapshot);
  const firstIdentityIssue = identityIssues[0];
  if (firstIdentityIssue !== undefined) {
    return blocked([firstIdentityIssue, ...identityIssues.slice(1)]);
  }

  const claude = resolveProvider("claude", selection.projections[0], selection, snapshot);
  const codex = resolveProvider("codex", selection.projections[1], selection, snapshot);
  if (!claude.ok || !codex.ok) {
    const issues = [...(claude.ok ? [] : claude.issues), ...(codex.ok ? [] : codex.issues)];
    const first = issues[0];
    return first === undefined
      ? blocked([
          issue(
            "PROJECTION_MISMATCH",
            "selection.projections",
            "Canonical selection did not resolve both provider projections"
          ),
        ])
      : blocked([first, ...issues.slice(1)]);
  }

  const desired: readonly [CanonicalDesiredState<"claude">, CanonicalDesiredState<"codex">] =
    Object.freeze([claude.value, codex.value]);
  return Object.freeze({
    status: "RESOLVED",
    desired,
  });
}

function resolveProvider<TProvider extends ProviderId>(
  expectedProvider: TProvider,
  binding: CanonicalChannelSelection["projections"][number],
  selection: CanonicalChannelSelection,
  snapshot: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>
): DeploymentResult<CanonicalDesiredState<TProvider>> {
  if (binding.provider !== expectedProvider) {
    return failure([
      issue(
        "PROJECTION_MISMATCH",
        `selection.projections.${expectedProvider}.provider`,
        "Canonical provider binding is out of order or belongs to another provider",
        expectedProvider,
        binding.provider
      ),
    ]);
  }
  const adapter = parseAdapterProtocol(
    binding.adapterProtocol,
    `selection.projections.${expectedProvider}.adapterProtocol`
  );
  if (!adapter.ok) return adapter;

  const rendered = renderCompleteProjection(expectedProvider, adapter.value, snapshot);
  if (!rendered.ok) return rendered;
  const projection = rendered.value;
  const issues = projectionBindingIssues(expectedProvider, binding, projection);
  const first = issues[0];
  if (first !== undefined) return failure([first, ...issues.slice(1)]);

  return success(
    Object.freeze({
      selection,
      projection: Object.freeze({
        ...projection,
        provider: expectedProvider,
      }),
    })
  );
}

function selectionIdentityIssues(
  selection: CanonicalChannelSelection,
  snapshot: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>
): readonly ProviderDeploymentIssue[] {
  const body = snapshot.releaseSet.body;
  const issues: ProviderDeploymentIssue[] = [];
  compareIdentity("contentAuthority", selection.contentAuthority, body.contentAuthority, issues);
  compareIdentity(
    "sourceRepositoryIdentity",
    selection.sourceRepositoryIdentity,
    body.sourceRepository,
    issues
  );
  compareIdentity("sourceCommit", selection.sourceCommit, body.sourceCommit, issues);
  compareIdentity("sourceTree", selection.sourceTree, body.sourceTree, issues);
  compareIdentity(
    "releaseInputDigest",
    selection.releaseInputDigest,
    body.releaseInputDigest,
    issues
  );
  compareIdentity(
    "releaseSetDigest",
    selection.releaseSetDigest,
    snapshot.releaseSet.releaseSetDigest,
    issues
  );
  compareIdentity(
    "artifactRef.releaseSetDigest",
    selection.releaseSetDigest,
    snapshot.ref.releaseSetDigest,
    issues
  );
  return Object.freeze(issues);
}

function projectionBindingIssues(
  provider: "claude" | "codex",
  binding: CanonicalChannelSelection["projections"][number],
  projection: CanonicalDesiredState["projection"]
): readonly ProviderDeploymentIssue[] {
  const issues: ProviderDeploymentIssue[] = [];
  compareProjectionBinding(
    provider,
    "rendererProtocol",
    binding.rendererProtocol,
    projection.rendererProtocol,
    issues
  );
  compareProjectionBinding(
    provider,
    "adapterProtocol",
    binding.adapterProtocol,
    projection.adapterProtocol,
    issues
  );
  compareProjectionBinding(
    provider,
    "capabilityProfileDigest",
    binding.capabilityProfileDigest,
    projection.capabilityProfile.capabilityProfileDigest,
    issues
  );
  compareProjectionBinding(
    provider,
    "projectionDigest",
    binding.projectionDigest,
    projection.projectionDigest,
    issues
  );
  return Object.freeze(issues);
}

function compareIdentity(
  field: string,
  selected: string,
  artifact: string,
  issues: ProviderDeploymentIssue[]
): void {
  if (selected === artifact) return;
  issues.push(
    issue(
      "PROJECTION_MISMATCH",
      `selection.${field}`,
      "Selected channel identity differs from the verified complete-set artifact",
      selected,
      artifact
    )
  );
}

function compareProjectionBinding(
  provider: "claude" | "codex",
  field: string,
  selected: string,
  rendered: string,
  issues: ProviderDeploymentIssue[]
): void {
  if (selected === rendered) return;
  issues.push(
    issue(
      field === "adapterProtocol" ? "ADAPTER_PROTOCOL_MISMATCH" : "PROJECTION_MISMATCH",
      `selection.projections.${provider}.${field}`,
      "Selected provider binding differs from the verified complete-set projection",
      selected,
      rendered
    )
  );
}

function blocked(
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>
): Extract<CanonicalDesiredStateResolution, { status: "BLOCKED_SELECTION" }> {
  return Object.freeze({
    status: "BLOCKED_SELECTION",
    issues: Object.freeze(issues),
  });
}

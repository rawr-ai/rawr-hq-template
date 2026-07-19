import type { ContentWorkspaceAsyncPort } from "@rawr/resource-content-workspace";

import type { VendorSourceIdentity } from "../model/dto/vendor-records";
import type {
  VendorSourceStatus,
  VendorStatusRequest,
  VendorUpdateIssue,
  VendorUpdateRequest,
  VendorUpdateResult,
} from "../model/dto/vendor-operations";
import type {
  VendorDeclaredSourceObservation,
  VendorSourceChange,
  VendorUpstreamObservation,
  VendorWorkspaceObservation,
} from "../model/dto/vendor-workspace";
import {
  createVendorAuthoringPlan,
  createVendorSourceChange,
} from "../model/policy/vendor-authoring-plan";
import {
  localVendorSourceIssue,
  sameVendorIdentity,
  validVendorIdentity,
  vendorWorkspaceIssue,
} from "../model/policy/vendor-state-validation";
import {
  materializeVendorUpstream,
  observeVendorUpstream,
} from "../model/policy/vendor-upstream";
import { observeVendorWorkspace } from "../model/policy/vendor-workspace-observation";
import { vendorIssue } from "../model/policy/vendor-policy-result";
import { module } from "../module";
import { executeVendorAuthoringPlan } from "./update-transaction";

interface ObservedWorkspace {
  readonly observation: VendorWorkspaceObservation;
}

interface WorkspaceFailure {
  readonly issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
}

interface SourceAssessment {
  readonly status: VendorSourceStatus;
  readonly issue?: VendorUpdateIssue;
  readonly candidate?: VendorUpstreamObservation;
}

interface PreparedCandidate {
  readonly source: VendorDeclaredSourceObservation;
  readonly upstream: VendorUpstreamObservation;
}

const status = module.status.handler(async ({ context, input: request }) => {
  const workspace = await observeWorkspace(context.contentWorkspace, request);
  if ("issues" in workspace) return { kind: "Rejected" as const, issues: workspace.issues };

  const statuses: VendorSourceStatus[] = [];
  for (const source of workspace.observation.sources) {
    const localIssue = localVendorSourceIssue(source);
    if (localIssue !== undefined) {
      statuses.push(statusFromIssue(source, localIssue));
      continue;
    }
    if (source.declaration.policy === "held") {
      statuses.push({
        sourceId: source.declaration.sourceId,
        classification: "Held",
        admitted: admittedIdentity(source),
        observed: null,
        detail: "The versioned source declaration is held.",
      });
      continue;
    }
    statuses.push((await assessSource(context.contentWorkspace, source)).status);
  }
  return { kind: "VendorStatus" as const, sources: statuses };
});

const update = module.update.handler(async ({ context, input: request }) => {
  const workspace = await observeWorkspace(context.contentWorkspace, request);
  if ("issues" in workspace) return rejected(request.sourceIds, workspace.issues);
  const selected = selectSources(request, workspace.observation);
  if ("issues" in selected) return rejected(request.sourceIds, selected.issues);

  const candidates: PreparedCandidate[] = [];
  const assessmentIssues: VendorUpdateIssue[] = [];
  for (const source of selected.sources) {
    const assessment = await assessSource(context.contentWorkspace, source);
    if (assessment.issue !== undefined) assessmentIssues.push(assessment.issue);
    if (assessment.candidate !== undefined) candidates.push({ source, upstream: assessment.candidate });
  }
  const assessmentFailure = nonEmpty(assessmentIssues);
  if (assessmentFailure !== null) return rejected(request.sourceIds, assessmentFailure);
  if (candidates.length === 0) return { kind: "ReadOnlyConverged" as const, sourceIds: request.sourceIds };

  const changes: VendorSourceChange[] = [];
  const preparationIssues: VendorUpdateIssue[] = [];
  for (const candidate of candidates) {
    const materialized = await materializeVendorUpstream(
      context.contentWorkspace,
      context.clock,
      candidate.source,
      candidate.upstream,
    );
    if (!materialized.ok) {
      preparationIssues.push(...materialized.issues);
      continue;
    }
    const change = createVendorSourceChange(candidate.source, materialized.value);
    if (!change.ok) preparationIssues.push(...change.issues);
    else changes.push(change.value);
  }
  const preparationFailure = nonEmpty(preparationIssues);
  if (preparationFailure !== null) return rejected(request.sourceIds, preparationFailure);

  const planned = createVendorAuthoringPlan(request.contentWorkspace, workspace.observation, changes);
  if (!planned.ok) return rejected(request.sourceIds, planned.issues);
  return executeVendorAuthoringPlan(context.contentWorkspace, request, planned.value);
});

export const router = Object.freeze({ status, update });

async function observeWorkspace(
  contentWorkspace: ContentWorkspaceAsyncPort,
  request: VendorStatusRequest,
): Promise<ObservedWorkspace | WorkspaceFailure> {
  const observed = await observeVendorWorkspace(contentWorkspace, request.contentWorkspace);
  if (!observed.ok) return { issues: observed.issues };
  const issue = vendorWorkspaceIssue(request, observed.value);
  return issue === undefined ? { observation: observed.value } : { issues: [issue] };
}

function selectSources(
  request: VendorUpdateRequest,
  observation: VendorWorkspaceObservation,
): Readonly<{ sources: readonly VendorDeclaredSourceObservation[] }> | WorkspaceFailure {
  const byId = new Map(observation.sources.map((source) => [source.declaration.sourceId, source]));
  const selected: VendorDeclaredSourceObservation[] = [];
  const issues: VendorUpdateIssue[] = [];
  for (const selectedId of request.sourceIds) {
    const source = byId.get(selectedId);
    if (source === undefined) {
      issues.push(vendorIssue("UndeclaredSource", `Vendor source ${selectedId} is absent from the canonical release input.`, selectedId));
      continue;
    }
    selected.push(source);
    if (source.declaration.policy === "held") {
      issues.push(vendorIssue("HeldSource", `Vendor source ${selectedId} is held and cannot be authored.`, selectedId));
      continue;
    }
    const localIssue = localVendorSourceIssue(source);
    if (localIssue !== undefined) issues.push(localIssue);
    if (source.declaration.curationRevision >= Number.MAX_SAFE_INTEGER) {
      issues.push(vendorIssue("PayloadMismatch", "Vendor source cannot advance beyond the maximum curation revision.", selectedId));
    }
  }
  const failure = nonEmpty(issues);
  return failure === null ? { sources: selected } : { issues: failure };
}

async function assessSource(
  contentWorkspace: ContentWorkspaceAsyncPort,
  source: VendorDeclaredSourceObservation,
): Promise<SourceAssessment> {
  const observed = await observeVendorUpstream(contentWorkspace, source);
  if (!observed.ok) {
    const failure = observed.issues[0];
    return { status: statusFromIssue(source, failure, statusClassification(failure)), issue: failure };
  }
  const admitted = admittedIdentity(source);
  const upstream = observed.value;
  if (upstream.ancestry === "diverged") {
    const failure = vendorIssue(
      "NonFastForward",
      "The admitted commit is not an ancestor of the observed upstream commit.",
      source.declaration.sourceId,
    );
    return { status: statusFromIssue(source, failure, "Diverged", upstream.identity), issue: failure };
  }
  if (sameVendorIdentity(admitted, upstream.identity) && upstream.ancestry === "same") {
    return {
      status: {
        sourceId: source.declaration.sourceId,
        classification: "Current",
        admitted,
        observed: upstream.identity,
      },
    };
  }
  if (upstream.ancestry !== "fast-forward" || upstream.identity.sourceCommit === admitted.sourceCommit) {
    const failure = vendorIssue(
      "PayloadMismatch",
      "Upstream identity changed without a valid fast-forward commit transition.",
      source.declaration.sourceId,
    );
    return { status: statusFromIssue(source, failure, "Diverged", upstream.identity), issue: failure };
  }
  return {
    status: {
      sourceId: source.declaration.sourceId,
      classification: "UpdateAvailable",
      admitted,
      observed: upstream.identity,
    },
    candidate: upstream,
  };
}

function statusFromIssue(
  source: VendorDeclaredSourceObservation,
  failure: VendorUpdateIssue,
  classification: VendorSourceStatus["classification"] = failure.code === "LocalDrift" ? "Diverged" : "Invalid",
  observed: VendorSourceIdentity | null = null,
): VendorSourceStatus {
  return {
    sourceId: source.declaration.sourceId,
    classification,
    admitted: admittedIdentityOrNull(source),
    observed,
    detail: failure.detail,
  };
}

function statusClassification(issue: VendorUpdateIssue): VendorSourceStatus["classification"] {
  if (issue.code === "RuntimeFailure" || issue.code === "CleanupFailed") return "Unavailable";
  if (issue.code === "NonFastForward" || issue.code === "WrongRepository" || issue.code === "WrongRef") return "Diverged";
  return "Invalid";
}

function admittedIdentity(source: VendorDeclaredSourceObservation): VendorSourceIdentity {
  if (source.lock === null) throw new Error("Validated vendor lock became unavailable");
  return source.lock.admitted;
}

function admittedIdentityOrNull(source: VendorDeclaredSourceObservation): VendorSourceIdentity | null {
  return source.lock !== null && validVendorIdentity(source.lock.admitted) ? source.lock.admitted : null;
}

function nonEmpty(
  issues: readonly VendorUpdateIssue[],
): readonly [VendorUpdateIssue, ...VendorUpdateIssue[]] | null {
  const [first, ...rest] = issues;
  return first === undefined ? null : [first, ...rest];
}

function rejected(
  sourceIds: readonly string[],
  issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]],
): VendorUpdateResult {
  return { kind: "Rejected", sourceIds, issues };
}

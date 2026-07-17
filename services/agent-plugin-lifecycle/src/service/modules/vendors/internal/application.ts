import { Value } from "typebox/value";

import type {
  VendorAuthoringPlan,
  VendorDeclaredSourceObservation,
  VendorLifecycleRuntime,
  VendorPayloadEntry,
  VendorPreparedPayload,
  VendorProvenanceRecord,
  VendorSourceChange,
  VendorSourceIdentity,
  VendorSourceStatus,
  VendorStatusRequest,
  VendorStatusResult,
  VendorUpdateIssue,
  VendorUpdateRequest,
  VendorUpdateResult,
  VendorUpstreamReadResult,
  VendorWorkspaceObservation,
} from "../ports";
import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
} from "../ports";
import {
  CANONICAL_ABSOLUTE_PATH_PATTERN,
  CONTENT_AUTHORITY_PATTERN,
  GIT_OBJECT_ID_PATTERN,
  NORMALIZED_RELATIVE_PATH_PATTERN,
  QUALIFIED_HEAD_REF_PATTERN,
  REPOSITORY_IDENTITY_PATTERN,
  SHA256_DIGEST_PATTERN,
  SOURCE_ID_PATTERN,
  STRICT_UTC_RFC3339_PATTERN,
  VendorLockRecordSchema,
  VendorProvenanceRecordSchema,
  VendorRecordBindingSchema,
  VendorSourceDeclarationSchema,
} from "../schemas";

const canonicalAbsolutePath = new RegExp(CANONICAL_ABSOLUTE_PATH_PATTERN, "u");
const contentAuthority = new RegExp(CONTENT_AUTHORITY_PATTERN, "u");
const gitObjectId = new RegExp(GIT_OBJECT_ID_PATTERN, "u");
const normalizedRelativePath = new RegExp(NORMALIZED_RELATIVE_PATH_PATTERN, "u");
const qualifiedHeadRef = new RegExp(QUALIFIED_HEAD_REF_PATTERN, "u");
const repositoryIdentity = new RegExp(REPOSITORY_IDENTITY_PATTERN, "u");
const sha256Digest = new RegExp(SHA256_DIGEST_PATTERN, "u");
const sourceId = new RegExp(SOURCE_ID_PATTERN, "u");
const strictUtcRfc3339 = new RegExp(STRICT_UTC_RFC3339_PATTERN, "u");
const opaqueHandle = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/u;

interface ObservedWorkspace {
  readonly observation: VendorWorkspaceObservation;
}

interface WorkspaceFailure {
  readonly issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]];
}

interface SourceAssessment {
  readonly status: VendorSourceStatus;
  readonly issue?: VendorUpdateIssue;
  readonly next?: VendorSourceIdentity;
  readonly entries?: readonly VendorPayloadEntry[];
}

interface PreparedCandidate {
  readonly source: VendorDeclaredSourceObservation;
  readonly next: VendorSourceIdentity;
  readonly entries: readonly VendorPayloadEntry[];
}

export function createVendorStatus(runtime: VendorLifecycleRuntime) {
  return async (request: VendorStatusRequest): Promise<VendorStatusResult> => {
    const workspace = await observeWorkspace(runtime, request);
    if ("issues" in workspace) return { kind: "Rejected", issues: workspace.issues };

    const statuses: VendorSourceStatus[] = [];
    for (const source of workspace.observation.sources) {
      const localIssue = localSourceIssue(source);
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
      const upstream = await observeUpstream(runtime, source);
      statuses.push(assessUpstream(source, upstream).status);
    }
    return { kind: "VendorStatus", sources: statuses };
  };
}

export function createVendorUpdate(runtime: VendorLifecycleRuntime) {
  return async (request: VendorUpdateRequest): Promise<VendorUpdateResult> => {
    const workspace = await observeWorkspace(runtime, request);
    if ("issues" in workspace) return rejected(request.sourceIds, workspace.issues);

    const byId = new Map(
      workspace.observation.sources.map((source) => [source.declaration.sourceId, source]),
    );
    const selected: VendorDeclaredSourceObservation[] = [];
    const selectionIssues: VendorUpdateIssue[] = [];
    for (const selectedId of request.sourceIds) {
      const source = byId.get(selectedId);
      if (source === undefined) {
        selectionIssues.push(issue(
          "UndeclaredSource",
          `Vendor source ${selectedId} is absent from the canonical release input.`,
          selectedId,
        ));
        continue;
      }
      selected.push(source);
      if (source.declaration.policy === "held") {
        selectionIssues.push(issue(
          "HeldSource",
          `Vendor source ${selectedId} is held and cannot be fetched or authored.`,
          selectedId,
        ));
        continue;
      }
      const localIssue = localSourceIssue(source);
      if (localIssue !== undefined) selectionIssues.push(localIssue);
      if (source.declaration.curationRevision >= Number.MAX_SAFE_INTEGER) {
        selectionIssues.push(issue(
          "PayloadMismatch",
          `Vendor source ${selectedId} cannot advance beyond the maximum curation revision.`,
          selectedId,
        ));
      }
    }
    const selectionFailure = nonEmpty(selectionIssues);
    if (selectionFailure !== null) return rejected(request.sourceIds, selectionFailure);

    const candidates: PreparedCandidate[] = [];
    const upstreamIssues: VendorUpdateIssue[] = [];
    for (const source of selected) {
      const upstream = await observeUpstream(runtime, source);
      const assessment = assessUpstream(source, upstream);
      if (assessment.issue !== undefined) upstreamIssues.push(assessment.issue);
      if (assessment.next !== undefined && assessment.entries !== undefined) {
        candidates.push({ source, next: assessment.next, entries: assessment.entries });
      }
    }
    const upstreamFailure = nonEmpty(upstreamIssues);
    if (upstreamFailure !== null) return rejected(request.sourceIds, upstreamFailure);
    if (candidates.length === 0) {
      return { kind: "ReadOnlyConverged", sourceIds: request.sourceIds };
    }

    const changes: VendorSourceChange[] = [];
    const preparationIssues: VendorUpdateIssue[] = [];
    for (const candidate of candidates) {
      const prepared = await preparePayload(runtime, candidate);
      if ("issue" in prepared) {
        preparationIssues.push(prepared.issue);
      } else {
        changes.push(sourceChange(candidate, prepared.payload, prepared.observedAt));
      }
    }
    const preparationFailure = nonEmpty(preparationIssues);
    if (preparationFailure !== null) return rejected(request.sourceIds, preparationFailure);

    const revalidated = await observeWorkspace(runtime, request);
    if ("issues" in revalidated) return rejected(request.sourceIds, revalidated.issues);
    if (revalidated.observation.snapshotDigest !== workspace.observation.snapshotDigest) {
      return rejected(request.sourceIds, [issue(
        "LocalDrift",
        "Vendor records or destination bytes changed after upstream observation.",
      )]);
    }

    const plan = authoringPlan(request, workspace.observation, changes);
    let capture;
    try {
      capture = await runtime.authoring.capture(plan);
    } catch (error) {
      return rejected(request.sourceIds, [issue(
        "AuthoringFailed",
        `Could not capture the repository preimage: ${errorDetail(error)}`,
      )]);
    }
    if (capture.kind === "Stale") {
      return rejected(request.sourceIds, [issue("LocalDrift", capture.detail)]);
    }
    if (capture.kind === "Failed" || !opaqueHandle.test(capture.preimageHandle)) {
      return rejected(request.sourceIds, [issue(
        "AuthoringFailed",
        capture.kind === "Failed" ? capture.detail : "The authoring port returned an invalid preimage handle.",
      )]);
    }

    let applied;
    try {
      applied = await runtime.authoring.apply(plan, capture.preimageHandle);
    } catch (error) {
      return restoreAfterFailure(
        runtime,
        plan,
        capture.preimageHandle,
        request.sourceIds,
        issue("AuthoringFailed", `Repository authoring threw after preimage capture: ${errorDetail(error)}`),
      );
    }
    if (applied.kind === "FailedBeforeMutation") {
      return rejected(request.sourceIds, [issue("AuthoringFailed", applied.detail)]);
    }
    if (applied.kind === "FailedAfterMutation") {
      return restoreAfterFailure(
        runtime,
        plan,
        capture.preimageHandle,
        request.sourceIds,
        issue("AuthoringFailed", applied.detail),
      );
    }
    if (applied.kind === "Applied" && !samePathSet(applied.changedPaths, plan.changedPaths)) {
      return restoreAfterFailure(
        runtime,
        plan,
        capture.preimageHandle,
        request.sourceIds,
        issue("AuthoringFailed", "The authoring port changed paths outside the exact service-owned plan."),
      );
    }

    const verified = await observeWorkspace(runtime, request);
    if ("issues" in verified || !planIsApplied(verified.observation, plan)) {
      const detail = "issues" in verified
        ? verified.issues.map((entry) => entry.detail).join("; ")
        : "Repository observation did not match the authored vendor identities.";
      return restoreAfterFailure(
        runtime,
        plan,
        capture.preimageHandle,
        request.sourceIds,
        issue("AuthoringFailed", detail),
      );
    }

    return applied.kind === "Converged"
      ? { kind: "ReadOnlyConverged", sourceIds: request.sourceIds }
      : {
          kind: "AuthoredReviewableChanges",
          sourceIds: request.sourceIds,
          changedPaths: plan.changedPaths,
        };
  };
}

async function observeWorkspace(
  runtime: VendorLifecycleRuntime,
  request: VendorStatusRequest,
): Promise<ObservedWorkspace | WorkspaceFailure> {
  let read;
  try {
    read = await runtime.repository.observe(request.contentWorkspace);
  } catch (error) {
    return { issues: [issue("RuntimeFailure", `Repository observation failed: ${errorDetail(error)}`)] };
  }
  if (read.kind === "Unavailable") {
    return { issues: [issue("RuntimeFailure", read.detail)] };
  }
  if (read.kind === "Invalid") return { issues: read.issues };
  const observationIssue = workspaceIssue(request, read.observation);
  return observationIssue === undefined
    ? { observation: read.observation }
    : { issues: [observationIssue] };
}

function workspaceIssue(
  request: VendorStatusRequest,
  observation: VendorWorkspaceObservation,
): VendorUpdateIssue | undefined {
  const expected = request.contentWorkspace;
  const actual = observation.contentWorkspace;
  if (!canonicalAbsolutePath.test(expected.locator)) {
    return issue("RuntimeFailure", "The content workspace locator is not canonical and absolute.");
  }
  if (!repositoryIdentity.test(actual.repositoryIdentity) || actual.repositoryIdentity !== expected.repositoryIdentity) {
    return issue("WrongRepository", "Repository observation does not match the requested repository identity.");
  }
  if (!contentAuthority.test(actual.contentAuthority) || actual.contentAuthority !== expected.contentAuthority) {
    return issue("WrongRepository", "Repository observation does not match the requested content authority.");
  }
  if (!qualifiedHeadRef.test(actual.refName) || actual.refName !== expected.refName) {
    return issue("WrongRef", "Repository observation does not match the requested qualified ref.");
  }
  if (
    !gitObjectId.test(actual.sourceCommit)
    || actual.sourceCommit !== expected.sourceCommit
    || !gitObjectId.test(actual.sourceTree)
    || actual.sourceTree !== expected.sourceTree
  ) {
    return issue("LocalDrift", "Repository observation does not match the requested commit and tree.");
  }
  if (
    !normalizedRelativePath.test(actual.releaseInputPath)
    || actual.releaseInputPath !== expected.releaseInputPath
  ) {
    return issue("UnsupportedLayout", "Repository observation changed the canonical release-input path.");
  }
  if (!sha256Digest.test(observation.snapshotDigest)) {
    return issue("RuntimeFailure", "Repository observation returned an invalid snapshot digest.");
  }

  const ids = new Set<string>();
  const destinations = new Set<string>();
  const authoredPaths = new Set<string>([actual.releaseInputPath]);
  for (const source of observation.sources) {
    const declaration = source.declaration;
    if (
      !Value.Check(VendorSourceDeclarationSchema, declaration)
      || !Value.Check(VendorRecordBindingSchema, source.declarationBinding)
      || source.declarationBinding.protocol !== VENDOR_SOURCE_PROTOCOL
      || !sha256Digest.test(source.declarationContentDigest)
    ) {
      return issue(
        "UnsupportedLayout",
        "A vendor declaration or its canonical release-input binding is invalid.",
      );
    }
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(source.memberPluginId)) {
      return issue("UnsupportedLayout", "A vendor declaration is not owned by a canonical plugin member.");
    }
    if (ids.has(declaration.sourceId)) {
      return issue("UnsupportedLayout", `Duplicate vendor source ${declaration.sourceId}.`);
    }
    if (destinations.has(declaration.destinationPath)) {
      return issue("UnsupportedLayout", `Duplicate vendor destination ${declaration.destinationPath}.`);
    }
    for (const path of [
      source.declarationBinding.id,
      declaration.destinationPath,
      declaration.provenancePath,
      declaration.lockPath,
    ]) {
      if (authoredPaths.has(path)) {
        return issue("UnsupportedLayout", `Vendor-authored path ${path} is declared more than once.`);
      }
      authoredPaths.add(path);
    }
    ids.add(declaration.sourceId);
    destinations.add(declaration.destinationPath);
  }
  const paths = [...authoredPaths];
  for (const path of paths) {
    if (paths.some((candidate) => candidate !== path && candidate.startsWith(`${path}/`))) {
      return issue("UnsupportedLayout", `Vendor-authored path ${path} overlaps another declared path.`);
    }
  }
  return undefined;
}

function localSourceIssue(source: VendorDeclaredSourceObservation): VendorUpdateIssue | undefined {
  const declaredSourceId = source.declaration.sourceId;
  const {
    declaration,
    declarationBinding,
    declarationContentDigest,
    provenance,
    provenanceBinding,
    provenanceContentDigest,
    lock,
    lockBinding,
    lockContentDigest,
    destination,
  } = source;
  if (!Value.Check(VendorSourceDeclarationSchema, declaration)) {
    return issue("PayloadMismatch", "The vendor declaration record is invalid.", declaredSourceId);
  }
  if (
    !Value.Check(VendorRecordBindingSchema, declarationBinding)
    || declarationBinding.protocol !== VENDOR_SOURCE_PROTOCOL
    || declarationBinding.contentDigest !== declarationContentDigest
  ) {
    return issue("PayloadMismatch", "The declaration binding does not cover its exact canonical record bytes.", declaration.sourceId);
  }
  if (
    provenance === null
    || provenanceBinding === null
    || provenanceContentDigest === null
    || lock === null
    || lockBinding === null
    || lockContentDigest === null
    || !Value.Check(VendorProvenanceRecordSchema, provenance)
    || !Value.Check(VendorLockRecordSchema, lock)
  ) {
    return issue("PayloadMismatch", "Vendor provenance or lock record is missing or invalid.", declaration.sourceId);
  }
  if (!validObservedAt(provenance.observedAt)) {
    return issue("PayloadMismatch", "Vendor provenance observedAt is not a real strict UTC RFC3339 instant.", declaration.sourceId);
  }
  if (
    !Value.Check(VendorRecordBindingSchema, provenanceBinding)
    || provenanceBinding.protocol !== VENDOR_PROVENANCE_PROTOCOL
    || provenanceBinding.id !== declaration.provenancePath
    || provenanceBinding.contentDigest !== provenanceContentDigest
    || !Value.Check(VendorRecordBindingSchema, lockBinding)
    || lockBinding.protocol !== VENDOR_LOCK_PROTOCOL
    || lockBinding.id !== declaration.lockPath
    || lockBinding.contentDigest !== lockContentDigest
  ) {
    return issue("PayloadMismatch", "Vendor record bindings disagree with the declaration paths or canonical record bytes.", declaration.sourceId);
  }
  const admitted = lock.admitted;
  if (!validIdentity(admitted)) {
    return issue("PayloadMismatch", "The canonical vendor lock identity is invalid.", declaration.sourceId);
  }
  if (admitted.repositoryIdentity !== declaration.repositoryIdentity) {
    return issue("WrongRepository", "The admitted source repository differs from its declaration.", declaration.sourceId);
  }
  if (admitted.refName !== declaration.refName) {
    return issue("WrongRef", "The admitted source ref differs from its declaration.", declaration.sourceId);
  }
  if (
    provenance.sourceId !== declaration.sourceId
    || lock.sourceId !== declaration.sourceId
    || !sameIdentity(provenance.admitted, admitted)
    || provenance.importedPayloadDigest !== admitted.payloadDigest
    || provenance.curationRevision !== declaration.curationRevision
    || provenance.supportedBaseline !== declaration.supportedBaseline
    || !validIdentity(provenance.observedLatest)
    || provenance.observedLatest.repositoryIdentity !== declaration.repositoryIdentity
    || provenance.observedLatest.refName !== declaration.refName
  ) {
    return issue("PayloadMismatch", "Declaration, provenance, and lock record fields disagree.", declaration.sourceId);
  }
  if (
    (declaration.policy === "held" && provenance.disposition !== "held")
    || (declaration.policy === "tracked" && provenance.disposition === "held")
  ) {
    return issue("PayloadMismatch", "Vendor policy and provenance disposition disagree.", declaration.sourceId);
  }
  if (destination.kind === "Missing") {
    return issue("LocalDrift", `Vendor destination ${declaration.destinationPath} is missing.`, declaration.sourceId);
  }
  if (destination.kind === "Invalid") {
    return issue("LocalDrift", destination.detail, declaration.sourceId);
  }
  if (!sha256Digest.test(destination.payloadDigest) || destination.payloadDigest !== admitted.payloadDigest) {
    return issue("LocalDrift", "Vendor destination bytes do not match the admitted payload digest.", declaration.sourceId);
  }
  return undefined;
}

async function observeUpstream(
  runtime: VendorLifecycleRuntime,
  source: VendorDeclaredSourceObservation,
): Promise<VendorUpstreamReadResult> {
  try {
    return await runtime.upstream.observe({
      sourceId: source.declaration.sourceId,
      repositoryIdentity: source.declaration.repositoryIdentity,
      refName: source.declaration.refName,
      sourcePath: source.declaration.sourcePath,
      admitted: admittedIdentity(source),
    });
  } catch (error) {
    return { kind: "Unavailable", detail: `Upstream observation failed: ${errorDetail(error)}` };
  }
}

function assessUpstream(
  source: VendorDeclaredSourceObservation,
  upstream: VendorUpstreamReadResult,
): SourceAssessment {
  const sourceIdValue = source.declaration.sourceId;
  if (upstream.kind === "Unavailable") {
    const failure = issue("RuntimeFailure", upstream.detail, sourceIdValue);
    return { status: statusFromIssue(source, failure, "Unavailable"), issue: failure };
  }
  if (upstream.kind === "CleanupFailed") {
    const failure = issue("CleanupFailed", upstream.detail, sourceIdValue);
    return { status: statusFromIssue(source, failure, "Unavailable"), issue: failure };
  }
  if (upstream.kind === "Invalid") {
    const failure = issue("UnsupportedLayout", upstream.detail, sourceIdValue);
    return { status: statusFromIssue(source, failure), issue: failure };
  }
  if (upstream.repositoryIdentity !== source.declaration.repositoryIdentity) {
    const failure = issue("WrongRepository", "Observed upstream repository identity differs from the declaration.", sourceIdValue);
    return { status: statusFromIssue(source, failure, "Diverged", upstream.identity), issue: failure };
  }
  if (upstream.refName !== source.declaration.refName) {
    const failure = issue("WrongRef", "Observed upstream ref differs from the declaration.", sourceIdValue);
    return { status: statusFromIssue(source, failure, "Diverged", upstream.identity), issue: failure };
  }
  if (upstream.sourcePath !== source.declaration.sourcePath) {
    const failure = issue("UnsupportedLayout", "Observed upstream source path differs from the declaration.", sourceIdValue);
    return { status: statusFromIssue(source, failure, "Invalid", upstream.identity), issue: failure };
  }
  if (!validIdentity(upstream.identity)) {
    const failure = issue("PayloadMismatch", "Observed upstream identity is invalid.", sourceIdValue);
    return { status: statusFromIssue(source, failure), issue: failure };
  }
  if (!validObservedAt(upstream.observedAt)) {
    const failure = issue("PayloadMismatch", "Upstream observation time is not strict UTC RFC3339.", sourceIdValue);
    return { status: statusFromIssue(source, failure), issue: failure };
  }
  const layoutIssue = payloadLayoutIssue(upstream.entries);
  if (layoutIssue !== undefined) {
    const failure = issue("UnsupportedLayout", layoutIssue, sourceIdValue);
    return { status: statusFromIssue(source, failure, "Invalid", upstream.identity), issue: failure };
  }
  if (upstream.ancestry === "diverged") {
    const failure = issue("NonFastForward", "The admitted commit is not an ancestor of the observed upstream commit.", sourceIdValue);
    return { status: statusFromIssue(source, failure, "Diverged", upstream.identity), issue: failure };
  }
  const admitted = admittedIdentity(source);
  if (sameIdentity(admitted, upstream.identity) && upstream.ancestry === "same") {
    return {
      status: {
        sourceId: sourceIdValue,
        classification: "Current",
        admitted,
        observed: upstream.identity,
      },
    };
  }
  if (upstream.ancestry !== "fast-forward" || upstream.identity.sourceCommit === admitted.sourceCommit) {
    const failure = issue("PayloadMismatch", "Upstream identity changed without a valid fast-forward commit transition.", sourceIdValue);
    return { status: statusFromIssue(source, failure, "Diverged", upstream.identity), issue: failure };
  }
  const status: VendorSourceStatus = {
    sourceId: sourceIdValue,
    classification: "UpdateAvailable",
    admitted: validIdentity(admitted) ? admitted : null,
    observed: upstream.identity,
  };
  return { status, next: upstream.identity, entries: upstream.entries };
}

async function preparePayload(
  runtime: VendorLifecycleRuntime,
  candidate: PreparedCandidate,
): Promise<
  | { readonly payload: VendorPreparedPayload; readonly observedAt: string }
  | { readonly issue: VendorUpdateIssue }
> {
  const { declaration } = candidate.source;
  let prepared;
  try {
    prepared = await runtime.upstream.prepare({
      sourceId: declaration.sourceId,
      repositoryIdentity: declaration.repositoryIdentity,
      refName: declaration.refName,
      sourcePath: declaration.sourcePath,
      admitted: admittedIdentity(candidate.source),
      expected: candidate.next,
      expectedEntries: candidate.entries,
    });
  } catch (error) {
    return {
      issue: issue("RuntimeFailure", `Upstream payload preparation failed: ${errorDetail(error)}`, declaration.sourceId),
    };
  }
  if (prepared.kind === "Stale") {
    return { issue: issue("NonFastForward", prepared.detail, declaration.sourceId) };
  }
  if (prepared.kind === "Unavailable") {
    return { issue: issue("RuntimeFailure", prepared.detail, declaration.sourceId) };
  }
  if (prepared.kind === "CleanupFailed") {
    return { issue: issue("CleanupFailed", prepared.detail, declaration.sourceId) };
  }
  if (prepared.kind === "Invalid") {
    return { issue: issue("UnsupportedLayout", prepared.detail, declaration.sourceId) };
  }
  if (
    !sameIdentity(prepared.payload.identity, candidate.next)
    || !sameEntrySet(prepared.payload.entries, candidate.entries)
    || !validObservedAt(prepared.observedAt)
  ) {
    return {
      issue: issue(
        "PayloadMismatch",
        "Prepared payload bytes do not match the classified upstream identity and tree entries.",
        declaration.sourceId,
      ),
    };
  }
  return { payload: prepared.payload, observedAt: prepared.observedAt };
}

function sourceChange(
  candidate: PreparedCandidate,
  payload: VendorPreparedPayload,
  observedAt: string,
): VendorSourceChange {
  const { source } = candidate;
  if (
    source.provenance === null
    || source.provenanceBinding === null
    || source.lock === null
    || source.lockBinding === null
  ) {
    throw new Error("validated vendor records became unavailable");
  }
  const nextDeclaration = {
    ...source.declaration,
    curationRevision: source.declaration.curationRevision + 1,
  } as const;
  const nextProvenance: VendorProvenanceRecord = {
    schemaVersion: 1,
    sourceId: source.declaration.sourceId,
    admitted: candidate.next,
    importedPayloadDigest: candidate.next.payloadDigest,
    curationRevision: nextDeclaration.curationRevision,
    supportedBaseline: nextDeclaration.supportedBaseline,
    observedLatest: candidate.next,
    observedAt,
    disposition: "review-required",
  };
  return {
    sourceId: source.declaration.sourceId,
    prior: admittedIdentity(source),
    next: candidate.next,
    memberPluginId: source.memberPluginId,
    declarationBinding: source.declarationBinding,
    provenanceBinding: source.provenanceBinding,
    lockBinding: source.lockBinding,
    priorRecords: {
      declaration: source.declaration,
      provenance: source.provenance,
      lock: source.lock,
    },
    nextRecords: {
      declaration: nextDeclaration,
      provenance: nextProvenance,
      lock: {
        schemaVersion: 1,
        sourceId: source.declaration.sourceId,
        admitted: candidate.next,
      },
    },
    payload,
    declarationPath: source.declarationBinding.id,
    destinationPath: source.declaration.destinationPath,
    provenancePath: source.declaration.provenancePath,
    lockPath: source.declaration.lockPath,
  };
}

function payloadLayoutIssue(entries: readonly VendorPayloadEntry[]): string | undefined {
  if (entries.length === 0) return "The upstream payload is empty.";
  const paths = new Set<string>();
  let previous = "";
  let hasSkill = false;
  for (const entry of entries) {
    if (
      !normalizedRelativePath.test(entry.path)
      || !gitObjectId.test(entry.blob)
      || paths.has(entry.path)
      || (previous !== "" && compareText(previous, entry.path) >= 0)
    ) {
      return "The upstream payload contains an invalid, duplicate, or non-canonical entry.";
    }
    if (entry.path === "SKILL.md") hasSkill = true;
    paths.add(entry.path);
    previous = entry.path;
  }
  return hasSkill ? undefined : "The upstream payload does not contain a regular SKILL.md.";
}

function authoringPlan(
  request: VendorUpdateRequest,
  observation: VendorWorkspaceObservation,
  changes: readonly VendorSourceChange[],
): VendorAuthoringPlan {
  const paths = new Set<string>([observation.contentWorkspace.releaseInputPath]);
  for (const change of changes) {
    paths.add(change.declarationPath);
    paths.add(change.destinationPath);
    paths.add(change.provenancePath);
    paths.add(change.lockPath);
  }
  return {
    contentWorkspace: request.contentWorkspace,
    expectedSnapshotDigest: observation.snapshotDigest,
    releaseInputPath: observation.contentWorkspace.releaseInputPath,
    sourceChanges: changes,
    changedPaths: [...paths].sort(compareText),
  };
}

async function restoreAfterFailure(
  runtime: VendorLifecycleRuntime,
  plan: VendorAuthoringPlan,
  preimageHandle: string,
  sourceIds: readonly string[],
  primary: VendorUpdateIssue,
): Promise<VendorUpdateResult> {
  try {
    const restored = await runtime.authoring.restore(plan, preimageHandle);
    if (restored.kind === "Restored" && validPathSubset(restored.restoredPaths, plan.changedPaths)) {
      return {
        kind: "FailedRestored",
        sourceIds,
        restoredPaths: [...restored.restoredPaths].sort(compareText),
        issues: [primary],
      };
    }
    const unsettledPaths = restored.kind === "Failed" && validPathSubset(restored.unsettledPaths, plan.changedPaths)
      && restored.unsettledPaths.length > 0
      ? [...restored.unsettledPaths].sort(compareText)
      : plan.changedPaths;
    const detail = restored.kind === "Failed"
      ? restored.detail
      : "The restoration port returned invalid restored-path evidence.";
    return {
      kind: "RestorationFailed",
      sourceIds,
      unsettledPaths,
      issues: [primary, issue("RestorationFailed", detail)],
    };
  } catch (error) {
    return {
      kind: "RestorationFailed",
      sourceIds,
      unsettledPaths: plan.changedPaths,
      issues: [
        primary,
        issue("RestorationFailed", `Repository restoration threw: ${errorDetail(error)}`),
      ],
    };
  }
}

function planIsApplied(observation: VendorWorkspaceObservation, plan: VendorAuthoringPlan): boolean {
  const byId = new Map(
    observation.sources.map((source) => [source.declaration.sourceId, source]),
  );
  return plan.sourceChanges.every((change) => {
    const source = byId.get(change.sourceId);
    return source !== undefined
      && localSourceIssue(source) === undefined
      && source.memberPluginId === change.memberPluginId
      && sameBindingIdentity(source.declarationBinding, change.declarationBinding)
      && source.provenanceBinding !== null
      && sameBindingIdentity(source.provenanceBinding, change.provenanceBinding)
      && source.lockBinding !== null
      && sameBindingIdentity(source.lockBinding, change.lockBinding)
      && sameDeclaration(source.declaration, change.nextRecords.declaration)
      && source.provenance !== null
      && sameProvenance(source.provenance, change.nextRecords.provenance)
      && source.lock !== null
      && source.lock.schemaVersion === change.nextRecords.lock.schemaVersion
      && source.lock.sourceId === change.nextRecords.lock.sourceId
      && sameIdentity(source.lock.admitted, change.nextRecords.lock.admitted)
      && source.destination.kind === "Present"
      && source.destination.payloadDigest === change.next.payloadDigest;
  });
}

function statusFromIssue(
  source: VendorDeclaredSourceObservation,
  sourceIssue: VendorUpdateIssue,
  classification: VendorSourceStatus["classification"] = sourceIssue.code === "LocalDrift"
    ? "Diverged"
    : "Invalid",
  observed: VendorSourceIdentity | null = null,
): VendorSourceStatus {
  return {
    sourceId: source.declaration.sourceId,
    classification,
    admitted: admittedIdentityOrNull(source),
    observed,
    detail: sourceIssue.detail,
  };
}

function validIdentity(identity: VendorSourceIdentity): boolean {
  return repositoryIdentity.test(identity.repositoryIdentity)
    && qualifiedHeadRef.test(identity.refName)
    && gitObjectId.test(identity.sourceCommit)
    && gitObjectId.test(identity.sourceTree)
    && sha256Digest.test(identity.payloadDigest);
}

function admittedIdentity(source: VendorDeclaredSourceObservation): VendorSourceIdentity {
  if (source.lock === null) throw new Error("validated vendor lock became unavailable");
  return source.lock.admitted;
}

function admittedIdentityOrNull(source: VendorDeclaredSourceObservation): VendorSourceIdentity | null {
  return source.lock !== null && validIdentity(source.lock.admitted) ? source.lock.admitted : null;
}

function validObservedAt(value: string): boolean {
  if (!strictUtcRfc3339.test(value)) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/u.exec(value);
  if (match === null) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = ""] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(fraction.padEnd(3, "0").slice(0, 3));
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  instant.setUTCHours(hour, minute, second, millisecond);
  return instant.getUTCFullYear() === year
    && instant.getUTCMonth() === month - 1
    && instant.getUTCDate() === day
    && instant.getUTCHours() === hour
    && instant.getUTCMinutes() === minute
    && instant.getUTCSeconds() === second;
}

function sameIdentity(left: VendorSourceIdentity, right: VendorSourceIdentity): boolean {
  return left.repositoryIdentity === right.repositoryIdentity
    && left.refName === right.refName
    && left.sourceCommit === right.sourceCommit
    && left.sourceTree === right.sourceTree
    && left.payloadDigest === right.payloadDigest;
}

function sameBindingIdentity(
  left: { readonly id: string; readonly protocol: string },
  right: { readonly id: string; readonly protocol: string },
): boolean {
  return left.id === right.id && left.protocol === right.protocol;
}

function sameDeclaration(
  left: VendorDeclaredSourceObservation["declaration"],
  right: VendorDeclaredSourceObservation["declaration"],
): boolean {
  return left.schemaVersion === right.schemaVersion
    && left.sourceId === right.sourceId
    && left.policy === right.policy
    && left.repositoryIdentity === right.repositoryIdentity
    && left.refName === right.refName
    && left.sourcePath === right.sourcePath
    && left.destinationPath === right.destinationPath
    && left.provenancePath === right.provenancePath
    && left.lockPath === right.lockPath
    && left.curationRevision === right.curationRevision
    && left.supportedBaseline === right.supportedBaseline;
}

function sameProvenance(left: VendorProvenanceRecord, right: VendorProvenanceRecord): boolean {
  return left.schemaVersion === right.schemaVersion
    && left.sourceId === right.sourceId
    && sameIdentity(left.admitted, right.admitted)
    && left.importedPayloadDigest === right.importedPayloadDigest
    && left.curationRevision === right.curationRevision
    && left.supportedBaseline === right.supportedBaseline
    && sameIdentity(left.observedLatest, right.observedLatest)
    && left.observedAt === right.observedAt
    && left.disposition === right.disposition;
}

function samePathSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort(compareText);
  const sortedRight = [...right].sort(compareText);
  return sortedLeft.every((path, index) => path === sortedRight[index]);
}

function sameEntrySet(
  prepared: readonly (VendorPayloadEntry & { readonly bytes: Uint8Array })[],
  expected: readonly VendorPayloadEntry[],
): boolean {
  return prepared.length === expected.length
    && prepared.every((entry, index) => {
      const expectedEntry = expected[index];
      return expectedEntry !== undefined
        && entry.bytes instanceof Uint8Array
        && entry.path === expectedEntry.path
        && entry.mode === expectedEntry.mode
        && entry.blob === expectedEntry.blob;
    });
}

function validPathSubset(paths: readonly string[], allowed: readonly string[]): boolean {
  const allowedPaths = new Set(allowed);
  return new Set(paths).size === paths.length
    && paths.every((path) => normalizedRelativePath.test(path) && allowedPaths.has(path));
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function issue(
  code: VendorUpdateIssue["code"],
  detail: string,
  selectedSourceId?: string,
): VendorUpdateIssue {
  return selectedSourceId === undefined
    ? { code, detail }
    : { code, detail, sourceId: selectedSourceId };
}

function nonEmpty<T>(values: readonly T[]): readonly [T, ...T[]] | null {
  const [first, ...rest] = values;
  return first === undefined ? null : [first, ...rest];
}

function rejected(
  sourceIds: readonly string[],
  issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]],
): VendorUpdateResult {
  return { kind: "Rejected", sourceIds, issues };
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

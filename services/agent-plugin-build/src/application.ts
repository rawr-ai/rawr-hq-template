import {
  createAgentPluginRelease,
  createAgentPluginReleaseSet,
  compareCanonicalText,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  verifyCompleteReleaseSetGraph,
  type AgentPluginRelease,
  type AgentPluginReleaseSet,
  type ArtifactRef,
  type CompleteSetArtifactRef,
  type PluginId,
  type ReleaseArtifactRef,
} from "@rawr/agent-plugin-release";

import type {
  ArtifactPublicationOptions,
  ArtifactPublicationResult,
  ArtifactStore,
  ArtifactStoreFailpoint,
  PublicationGuardResult,
} from "./artifact-store/filesystem-store";
import type {
  ContentWorkspacePolicy,
  ContentWorkspaceSnapshot,
  ContentWorkspaceSnapshotReader,
  SourceEligibilityIssue,
} from "./git/object-snapshot";

export type BuildMode =
  | Readonly<{ kind: "targeted"; pluginId: PluginId }>
  | Readonly<{ kind: "complete-set" }>;

export interface AgentPluginCheckRequest {
  readonly contentWorkspace: ContentWorkspacePolicy;
  readonly mode: BuildMode;
}

export interface AgentPluginBuildRequest extends AgentPluginCheckRequest {
  readonly failpoint?: BuildFailpoint;
  readonly artifactFailpoint?: ArtifactStoreFailpoint;
}

export type BuildIssue =
  | Readonly<{ kind: "SourceEligibility"; issue: SourceEligibilityIssue }>
  | Readonly<{ kind: "ReleaseConstruction"; detail: string }>
  | Readonly<{ kind: "ArtifactStore"; detail: string; cleanupFailure?: string }>;

export type CheckResult =
  | Readonly<{
    kind: "EligibleReport";
    mode: BuildMode;
    candidate: ArtifactRef;
    eligibilityBinding: string;
  }>
  | Readonly<{
    kind: "IneligibleReport";
    mode: BuildMode;
    issues: readonly [BuildIssue, ...BuildIssue[]];
  }>;

export type BuildResult =
  | Readonly<{
    kind: "RejectedBeforePublication";
    mode: BuildMode;
    issues: readonly [BuildIssue, ...BuildIssue[]];
  }>
  | Readonly<{
    kind: "PublicationIncomplete";
    mode: Readonly<{ kind: "complete-set" }>;
    newlyPublished: readonly ReleaseArtifactRef[];
    preExisting: readonly ReleaseArtifactRef[];
    requestedSetRefAbsent: true;
    issues: readonly [BuildIssue, ...BuildIssue[]];
  }>
  | Readonly<{
    kind: "PublicationUnsettled";
    mode: BuildMode;
    observedVerifiedReleases: readonly ReleaseArtifactRef[];
    requestedFinalCommit: "Unknown";
    issues: readonly [BuildIssue, ...BuildIssue[]];
  }>
  | Readonly<{
    kind: "Published";
    mode: BuildMode;
    ref: ArtifactRef;
    newlyPublished: readonly ReleaseArtifactRef[];
    preExisting: readonly ReleaseArtifactRef[];
  }>
  | Readonly<{
    kind: "ReadOnlyConverged";
    mode: BuildMode;
    ref: ArtifactRef;
  }>;

export type BuildFailpointEvent =
  | Readonly<{ kind: "AfterInitialInspection" }>
  | Readonly<{ kind: "BeforeStagingRevalidation" }>
  | Readonly<{ kind: "AfterStagingRevalidation" }>
  | Readonly<{ kind: "BeforeFinalRevalidation" }>
  | Readonly<{ kind: "AfterFinalRevalidation" }>
  | Readonly<{ kind: "AfterMemberPublication"; index: number; ref: ReleaseArtifactRef }>
  | Readonly<{ kind: "BeforeSetPublication" }>
  | Readonly<{ kind: "AfterSetPublication" }>;

export type BuildFailpoint = (event: BuildFailpointEvent) => void | Promise<void>;

export interface AgentPluginBuildApplications {
  check(request: AgentPluginCheckRequest): Promise<CheckResult>;
  build(request: AgentPluginBuildRequest): Promise<BuildResult>;
}

interface ConstructedPlan {
  readonly releases: readonly AgentPluginRelease[];
  readonly releaseSet?: AgentPluginReleaseSet;
  readonly finalRef: ArtifactRef;
}

export function createAgentPluginBuildApplications(options: {
  readonly source: ContentWorkspaceSnapshotReader;
  readonly artifacts: ArtifactStore;
}): AgentPluginBuildApplications {
  const applications: AgentPluginBuildApplications = {
    async check(request) {
      const inspected = await options.source.inspect(request.contentWorkspace);
      if (inspected.kind === "Ineligible") return ineligibleReport(request.mode, inspected.issues);
      const plan = constructPlan(inspected.snapshot, request.mode);
      if (!plan.ok) return { kind: "IneligibleReport", mode: request.mode, issues: plan.issues };
      return {
        kind: "EligibleReport",
        mode: request.mode,
        candidate: plan.value.finalRef,
        eligibilityBinding: inspected.snapshot.eligibilityBinding,
      };
    },
    async build(request) {
      const inspected = await options.source.inspect(request.contentWorkspace);
      if (inspected.kind === "Ineligible") return rejected(request.mode, sourceIssues(inspected.issues));
      try {
        await hit(request.failpoint, { kind: "AfterInitialInspection" });
      } catch (error) {
        return rejected(request.mode, [constructionIssue(errorMessage(error))]);
      }
      const plan = constructPlan(inspected.snapshot, request.mode);
      if (!plan.ok) return rejected(request.mode, plan.issues);

      try {
        await hit(request.failpoint, { kind: "BeforeStagingRevalidation" });
      } catch (error) {
        return rejected(request.mode, [constructionIssue(errorMessage(error))]);
      }
      const beforeStaging = await options.source.revalidate(
        request.contentWorkspace,
        inspected.snapshot.eligibilityBinding,
      );
      if (beforeStaging.kind === "Ineligible") return rejected(request.mode, sourceIssues(beforeStaging.issues));
      try {
        await hit(request.failpoint, { kind: "AfterStagingRevalidation" });
      } catch (error) {
        return rejected(request.mode, [constructionIssue(errorMessage(error))]);
      }

      const finalGate = createFinalEligibilityGate({
        source: options.source,
        policy: request.contentWorkspace,
        eligibilityBinding: inspected.snapshot.eligibilityBinding,
        failpoint: request.failpoint,
      });
      if (request.mode.kind === "targeted") {
        return await publishTargeted(options.artifacts, plan.value.releases[0]!, request, finalGate);
      }
      return await publishComplete(options.artifacts, plan.value, request, finalGate);
    },
  };
  return Object.freeze(applications);
}

async function publishTargeted(
  artifacts: ArtifactStore,
  release: AgentPluginRelease,
  request: AgentPluginBuildRequest,
  finalGate: FinalEligibilityGate,
): Promise<BuildResult> {
  const result = await artifacts.publishRelease(release, publicationOptions(request, finalGate));
  if (!finalGate.called && result.kind === "ReadOnlyConverged") {
    const gate = await finalGate.run();
    if (gate.kind === "Rejected") return rejected(request.mode, [constructionIssue(gate.failure)]);
  }
  const ref = createReleaseArtifactRef(release.releaseDigest, release.artifactDigest);
  if (result.kind === "Published") {
    return { kind: "Published", mode: request.mode, ref, newlyPublished: [ref], preExisting: [] };
  }
  if (result.kind === "ReadOnlyConverged") return { kind: "ReadOnlyConverged", mode: request.mode, ref };
  if (result.kind === "Unsettled") {
    return unsettled(request.mode, result.observation === "Verified" ? [ref] : [], result);
  }
  return rejected(request.mode, [storeIssue(result)]);
}

async function publishComplete(
  artifacts: ArtifactStore,
  plan: ConstructedPlan,
  request: AgentPluginBuildRequest,
  finalGate: FinalEligibilityGate,
): Promise<BuildResult> {
  const releaseSet = plan.releaseSet!;
  const setRef = createCompleteSetArtifactRef(releaseSet.releaseSetDigest);
  const existingSet = await artifacts.read(setRef);
  if (existingSet.kind === "Verified") {
    const gate = await finalGate.run();
    if (gate.kind === "Rejected") return rejected(request.mode, [constructionIssue(gate.failure)]);
    return { kind: "ReadOnlyConverged", mode: request.mode, ref: setRef };
  }
  if (existingSet.kind === "Mismatch") {
    return rejected(request.mode, [{
      kind: "ArtifactStore",
      detail: existingSet.issues.map((issue) => issue.detail).join("; "),
    }]);
  }

  const newlyPublished: ReleaseArtifactRef[] = [];
  const preExisting: ReleaseArtifactRef[] = [];
  for (let index = 0; index < plan.releases.length; index += 1) {
    const release = plan.releases[index]!;
    const ref = createReleaseArtifactRef(release.releaseDigest, release.artifactDigest);
    const result = await artifacts.publishRelease(release, publicationOptions(request, finalGate));
    if (result.kind === "Published") newlyPublished.push(ref);
    else if (result.kind === "ReadOnlyConverged") preExisting.push(ref);
    else if (result.kind === "Unsettled") {
      return unsettled(
        request.mode,
        verifiedRefs(newlyPublished, preExisting, result.observation === "Verified" ? [ref] : []),
        result,
      );
    } else {
      return await classifyWouldBeIncomplete(
        artifacts,
        setRef,
        newlyPublished,
        preExisting,
        [storeIssue(result)],
      );
    }
    try {
      await hit(request.failpoint, { kind: "AfterMemberPublication", index, ref });
    } catch (error) {
      return await classifyWouldBeIncomplete(
        artifacts,
        setRef,
        newlyPublished,
        preExisting,
        [constructionIssue(errorMessage(error))],
      );
    }
  }

  const graph = verifyCompleteReleaseSetGraph(releaseSet, plan.releases);
  if (!graph.ok) {
    return await classifyWouldBeIncomplete(
      artifacts,
      setRef,
      newlyPublished,
      preExisting,
      [constructionIssue(graph.issues.map((issue) => issue.code).join(","))],
    );
  }
  try {
    await hit(request.failpoint, { kind: "BeforeSetPublication" });
  } catch (error) {
    return await classifyWouldBeIncomplete(
      artifacts,
      setRef,
      newlyPublished,
      preExisting,
      [constructionIssue(errorMessage(error))],
    );
  }
  const setResult = await artifacts.publishReleaseSet(releaseSet, publicationOptions(request, finalGate));
  if (setResult.kind === "Rejected") {
    return await classifyWouldBeIncomplete(
      artifacts,
      setRef,
      newlyPublished,
      preExisting,
      [storeIssue(setResult)],
    );
  }
  if (setResult.kind === "Unsettled") {
    return unsettled(request.mode, verifiedRefs(newlyPublished, preExisting), setResult);
  }
  try {
    await hit(request.failpoint, { kind: "AfterSetPublication" });
  } catch (error) {
    const reclassified = await classifyWouldBeIncomplete(
      artifacts,
      setRef,
      newlyPublished,
      preExisting,
      [constructionIssue(errorMessage(error))],
    );
    if (reclassified.kind !== "ReadOnlyConverged") return reclassified;
  }
  return successfulCompleteSetResult(setResult, setRef, newlyPublished, preExisting);
}

function successfulCompleteSetResult(
  setResult: Extract<ArtifactPublicationResult, { kind: "Published" | "ReadOnlyConverged" }>,
  setRef: CompleteSetArtifactRef,
  newlyPublished: readonly ReleaseArtifactRef[],
  preExisting: readonly ReleaseArtifactRef[],
): BuildResult {
  if (setResult.kind === "ReadOnlyConverged" && newlyPublished.length === 0) {
    return { kind: "ReadOnlyConverged", mode: { kind: "complete-set" }, ref: setRef };
  }
  return {
    kind: "Published",
    mode: { kind: "complete-set" },
    ref: setRef,
    newlyPublished: Object.freeze([...newlyPublished]),
    preExisting: Object.freeze([...preExisting]),
  };
}

function constructPlan(
  snapshot: ContentWorkspaceSnapshot,
  mode: BuildMode,
): { readonly ok: true; readonly value: ConstructedPlan } | {
  readonly ok: false;
  readonly issues: readonly [BuildIssue, ...BuildIssue[]];
} {
  const members = mode.kind === "targeted"
    ? snapshot.releaseInput.body.members.filter((member) => member.pluginId === mode.pluginId)
    : snapshot.releaseInput.body.members;
  if (members.length === 0) {
    return { ok: false, issues: [constructionIssue("selected plugin is not declared by the release input")] };
  }
  const releases: AgentPluginRelease[] = [];
  for (const member of members) {
    const payload = snapshot.payloads.find((entry) => entry.pluginId === member.pluginId)?.payload;
    if (payload === undefined) {
      return { ok: false, issues: [constructionIssue(`verified payload is absent for ${member.pluginId}`)] };
    }
    const constructed = createAgentPluginRelease({
      releaseInput: snapshot.releaseInput,
      pluginId: member.pluginId,
      source: {
        sourceRepository: snapshot.repositoryIdentity,
        sourceCommit: snapshot.sourceCommit,
        sourceTree: snapshot.sourceTree,
      },
      payload,
    });
    if (!constructed.ok) {
      return { ok: false, issues: [constructionIssue(constructed.issues.map((issue) => issue.code).join(","))] };
    }
    releases.push(constructed.value);
  }
  if (mode.kind === "targeted") {
    const release = releases[0]!;
    return {
      ok: true,
      value: Object.freeze({
        releases: Object.freeze(releases),
        finalRef: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
      }),
    };
  }
  const set = createAgentPluginReleaseSet({ releaseInput: snapshot.releaseInput, releases });
  if (!set.ok) return { ok: false, issues: [constructionIssue(set.issues.map((issue) => issue.code).join(","))] };
  return {
    ok: true,
    value: Object.freeze({
      releases: Object.freeze(releases),
      releaseSet: set.value,
      finalRef: createCompleteSetArtifactRef(set.value.releaseSetDigest),
    }),
  };
}

interface FinalEligibilityGate {
  readonly called: boolean;
  run(): Promise<PublicationGuardResult>;
}

function createFinalEligibilityGate(options: {
  readonly source: ContentWorkspaceSnapshotReader;
  readonly policy: ContentWorkspacePolicy;
  readonly eligibilityBinding: string;
  readonly failpoint?: BuildFailpoint;
}): FinalEligibilityGate {
  let result: PublicationGuardResult | undefined;
  const gate: FinalEligibilityGate = {
    get called() {
      return result !== undefined;
    },
    async run() {
      if (result !== undefined) return result;
      try {
        await hit(options.failpoint, { kind: "BeforeFinalRevalidation" });
        const revalidated = await options.source.revalidate(options.policy, options.eligibilityBinding);
        result = revalidated.kind === "Eligible"
          ? { kind: "Allowed" }
          : {
            kind: "Rejected",
            failure: revalidated.issues.map((issue) => `${issue.code}:${issue.detail}`).join("; "),
          };
        if (result.kind === "Allowed") await hit(options.failpoint, { kind: "AfterFinalRevalidation" });
      } catch (error) {
        result = { kind: "Rejected", failure: errorMessage(error) };
      }
      return result;
    },
  };
  return Object.freeze(gate);
}

function publicationOptions(
  request: AgentPluginBuildRequest,
  gate: FinalEligibilityGate,
): ArtifactPublicationOptions {
  return {
    failpoint: request.artifactFailpoint,
    beforePublication: async () => await gate.run(),
  };
}

async function classifyWouldBeIncomplete(
  artifacts: ArtifactStore,
  setRef: CompleteSetArtifactRef,
  newlyPublished: readonly ReleaseArtifactRef[],
  preExisting: readonly ReleaseArtifactRef[],
  issues: readonly [BuildIssue, ...BuildIssue[]],
): Promise<BuildResult> {
  let observation;
  try {
    observation = await artifacts.read(setRef);
  } catch (error) {
    return unsettledSetObservation(
      newlyPublished,
      preExisting,
      appendIssue(issues, artifactObservationIssue(`set-marker read failed: ${errorMessage(error)}`)),
    );
  }
  if (observation.kind === "Verified") {
    if (
      observation.snapshot.kind !== "complete-set"
      || observation.snapshot.ref.releaseSetDigest !== setRef.releaseSetDigest
    ) {
      return unsettledSetObservation(
        newlyPublished,
        preExisting,
        appendIssue(issues, artifactObservationIssue("set-marker read returned another verified artifact")),
      );
    }
    if (newlyPublished.length === 0) {
      return { kind: "ReadOnlyConverged", mode: { kind: "complete-set" }, ref: setRef };
    }
    return {
      kind: "Published",
      mode: { kind: "complete-set" },
      ref: setRef,
      newlyPublished: Object.freeze([...newlyPublished]),
      preExisting: Object.freeze([...preExisting]),
    };
  }
  if (observation.kind === "Missing") {
    if (newlyPublished.length === 0 && preExisting.length === 0) {
      return rejected({ kind: "complete-set" }, issues);
    }
    return {
      kind: "PublicationIncomplete",
      mode: { kind: "complete-set" },
      newlyPublished: Object.freeze([...newlyPublished]),
      preExisting: Object.freeze([...preExisting]),
      requestedSetRefAbsent: true,
      issues,
    };
  }
  return unsettledSetObservation(
    newlyPublished,
    preExisting,
    appendIssue(issues, artifactObservationIssue(
      `set-marker read mismatched: ${observation.issues.map((issue) => issue.detail).join("; ")}`,
    )),
  );
}

function unsettledSetObservation(
  newlyPublished: readonly ReleaseArtifactRef[],
  preExisting: readonly ReleaseArtifactRef[],
  issues: readonly [BuildIssue, ...BuildIssue[]],
): BuildResult {
  return {
    kind: "PublicationUnsettled",
    mode: { kind: "complete-set" },
    observedVerifiedReleases: verifiedRefs(newlyPublished, preExisting),
    requestedFinalCommit: "Unknown",
    issues,
  };
}

function appendIssue(
  issues: readonly [BuildIssue, ...BuildIssue[]],
  issue: BuildIssue,
): readonly [BuildIssue, ...BuildIssue[]] {
  return Object.freeze([issues[0], ...issues.slice(1), issue]);
}

function artifactObservationIssue(detail: string): BuildIssue {
  return Object.freeze({ kind: "ArtifactStore", detail });
}

function unsettled(
  mode: BuildMode,
  observed: readonly ReleaseArtifactRef[],
  result: Extract<ArtifactPublicationResult, { kind: "Unsettled" }>,
): BuildResult {
  return {
    kind: "PublicationUnsettled",
    mode,
    observedVerifiedReleases: Object.freeze([...observed]),
    requestedFinalCommit: "Unknown",
    issues: [storeIssue(result)],
  };
}

function verifiedRefs(...groups: readonly (readonly ReleaseArtifactRef[])[]): readonly ReleaseArtifactRef[] {
  const byArtifact = new Map<string, ReleaseArtifactRef>();
  for (const group of groups) for (const ref of group) byArtifact.set(ref.artifactDigest, ref);
  return Object.freeze([...byArtifact.values()].sort((left, right) => compareCanonicalText(
    left.artifactDigest,
    right.artifactDigest,
  )));
}

function ineligibleReport(mode: BuildMode, issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]]): CheckResult {
  return { kind: "IneligibleReport", mode, issues: sourceIssues(issues) };
}

function rejected(mode: BuildMode, issues: readonly [BuildIssue, ...BuildIssue[]]): BuildResult {
  return { kind: "RejectedBeforePublication", mode, issues };
}

function sourceIssues(
  issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]],
): readonly [BuildIssue, ...BuildIssue[]] {
  return issues.map((issue) => Object.freeze({ kind: "SourceEligibility", issue })) as [BuildIssue, ...BuildIssue[]];
}

function constructionIssue(detail: string): BuildIssue {
  return Object.freeze({ kind: "ReleaseConstruction", detail });
}

function storeIssue(
  result: Extract<ArtifactPublicationResult, { kind: "Rejected" | "Unsettled" }>,
): BuildIssue {
  return Object.freeze({
    kind: "ArtifactStore",
    detail: result.failure,
    ...(result.cleanupFailure === undefined ? {} : { cleanupFailure: result.cleanupFailure }),
  });
}

async function hit(failpoint: BuildFailpoint | undefined, event: BuildFailpointEvent): Promise<void> {
  await failpoint?.(event);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

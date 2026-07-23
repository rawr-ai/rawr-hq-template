import type {
  ArtifactStore,
  BuildFailpoint,
  BuildFailpointEvent,
  ContentWorkspaceSnapshotReader,
} from "../../../model/dependencies/releases";

import type {
  ArtifactPublicationOptions,
  ArtifactPublicationResult,
  ArtifactStoreFailpoint,
  PublicationGuardResult,
} from "../../../model/dto/releases/artifact-repository";
import type {
  ContentWorkspacePolicy,
  SourceEligibilityIssue,
} from "../../../model/dto/releases/content-workspace";
import {
  type AgentPluginRelease,
  type CompleteSetArtifactRef,
  compareCanonicalText,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  type ReleaseArtifactRef,
  verifyCompleteReleaseSet,
} from "../../../shared/release";
import {
  type AgentPluginBuildRequest,
  artifactStoreBuildIssue,
  type BuildIssue,
  type BuildMode,
  type BuildResult,
  releaseConstructionBuildIssue,
} from "../model/dto/release-lifecycle";
import { type ConstructedPlan, constructPlan } from "../model/policy/release-plan";
import { module } from "../module";

interface BuildExecutionRequest extends AgentPluginBuildRequest {
  readonly failpoint?: BuildFailpoint;
  readonly artifactFailpoint?: ArtifactStoreFailpoint;
}

export const build = module.build.handler(async ({ context, input: request }) => {
  const execution: BuildExecutionRequest = Object.freeze({
    ...request,
    ...(context.buildFailpoint === undefined ? {} : { failpoint: context.buildFailpoint }),
    ...(context.artifactFailpoint === undefined
      ? {}
      : { artifactFailpoint: context.artifactFailpoint }),
  });
  const inspected = await context.source.inspect(execution.contentWorkspace);
  if (inspected.kind === "Ineligible")
    return rejected(execution.mode, sourceIssues(inspected.issues));
  try {
    await hit(execution.failpoint, { kind: "AfterInitialInspection" });
  } catch (error) {
    return rejected(execution.mode, [constructionIssue(errorMessage(error))]);
  }
  const plan = constructPlan(inspected.snapshot, execution.mode);
  if (!plan.ok) return rejected(execution.mode, plan.issues);

  try {
    await hit(execution.failpoint, { kind: "BeforeStagingRevalidation" });
  } catch (error) {
    return rejected(execution.mode, [constructionIssue(errorMessage(error))]);
  }
  const beforeStaging = await context.source.revalidate(
    execution.contentWorkspace,
    inspected.snapshot.eligibilityBinding
  );
  if (beforeStaging.kind === "Ineligible")
    return rejected(execution.mode, sourceIssues(beforeStaging.issues));
  try {
    await hit(execution.failpoint, { kind: "AfterStagingRevalidation" });
  } catch (error) {
    return rejected(execution.mode, [constructionIssue(errorMessage(error))]);
  }

  const finalGate = createFinalEligibilityGate({
    source: context.source,
    policy: execution.contentWorkspace,
    eligibilityBinding: inspected.snapshot.eligibilityBinding,
    failpoint: execution.failpoint,
  });
  if (execution.mode.kind === "targeted") {
    return await publishTargeted(context.artifacts, plan.value.releases[0]!, execution, finalGate);
  }
  return await publishComplete(context.artifacts, plan.value, execution, finalGate);
});

async function publishTargeted(
  artifacts: ArtifactStore,
  release: AgentPluginRelease,
  request: BuildExecutionRequest,
  finalGate: FinalEligibilityGate
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
  if (result.kind === "ReadOnlyConverged")
    return { kind: "ReadOnlyConverged", mode: request.mode, ref };
  if (result.kind === "Unsettled") {
    return unsettled(request.mode, result.observation === "Verified" ? [ref] : [], result);
  }
  return rejected(request.mode, [storeIssue(result)]);
}

async function publishComplete(
  artifacts: ArtifactStore,
  plan: ConstructedPlan,
  request: BuildExecutionRequest,
  finalGate: FinalEligibilityGate
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
    return rejected(request.mode, [
      artifactStoreBuildIssue(existingSet.issues.map((issue) => issue.detail).join("; ")),
    ]);
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
        result
      );
    } else {
      return await classifyWouldBeIncomplete(artifacts, setRef, newlyPublished, preExisting, [
        storeIssue(result),
      ]);
    }
    try {
      await hit(request.failpoint, { kind: "AfterMemberPublication", index, ref });
    } catch (error) {
      return await classifyWouldBeIncomplete(artifacts, setRef, newlyPublished, preExisting, [
        constructionIssue(errorMessage(error)),
      ]);
    }
  }

  const verification = verifyCompleteReleaseSet(releaseSet, plan.releases);
  if (!verification.ok) {
    return await classifyWouldBeIncomplete(artifacts, setRef, newlyPublished, preExisting, [
      constructionIssue(verification.issues.map((issue) => issue.code).join(",")),
    ]);
  }
  try {
    await hit(request.failpoint, { kind: "BeforeSetPublication" });
  } catch (error) {
    return await classifyWouldBeIncomplete(artifacts, setRef, newlyPublished, preExisting, [
      constructionIssue(errorMessage(error)),
    ]);
  }
  const setResult = await artifacts.publishReleaseSet(
    releaseSet,
    publicationOptions(request, finalGate)
  );
  if (setResult.kind === "Rejected") {
    return await classifyWouldBeIncomplete(artifacts, setRef, newlyPublished, preExisting, [
      storeIssue(setResult),
    ]);
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
      [constructionIssue(errorMessage(error))]
    );
    if (reclassified.kind !== "ReadOnlyConverged") return reclassified;
  }
  return successfulCompleteSetResult(setResult, setRef, newlyPublished, preExisting);
}

function successfulCompleteSetResult(
  setResult: Extract<ArtifactPublicationResult, { kind: "Published" | "ReadOnlyConverged" }>,
  setRef: CompleteSetArtifactRef,
  newlyPublished: readonly ReleaseArtifactRef[],
  preExisting: readonly ReleaseArtifactRef[]
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
        const revalidated = await options.source.revalidate(
          options.policy,
          options.eligibilityBinding
        );
        result =
          revalidated.kind === "Eligible"
            ? { kind: "Allowed" }
            : {
                kind: "Rejected",
                failure: revalidated.issues
                  .map((issue) => `${issue.code}:${issue.detail}`)
                  .join("; "),
              };
        if (result.kind === "Allowed")
          await hit(options.failpoint, { kind: "AfterFinalRevalidation" });
      } catch (error) {
        result = { kind: "Rejected", failure: errorMessage(error) };
      }
      return result;
    },
  };
  return Object.freeze(gate);
}

function publicationOptions(
  request: BuildExecutionRequest,
  gate: FinalEligibilityGate
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
  issues: readonly [BuildIssue, ...BuildIssue[]]
): Promise<BuildResult> {
  let observation;
  try {
    observation = await artifacts.read(setRef);
  } catch (error) {
    return unsettledSetObservation(
      newlyPublished,
      preExisting,
      appendIssue(
        issues,
        artifactObservationIssue(`set-marker read failed: ${errorMessage(error)}`)
      )
    );
  }
  if (observation.kind === "Verified") {
    if (
      observation.snapshot.kind !== "complete-set" ||
      observation.snapshot.ref.releaseSetDigest !== setRef.releaseSetDigest
    ) {
      return unsettledSetObservation(
        newlyPublished,
        preExisting,
        appendIssue(
          issues,
          artifactObservationIssue("set-marker read returned another verified artifact")
        )
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
    appendIssue(
      issues,
      artifactObservationIssue(
        `set-marker read mismatched: ${observation.issues.map((issue) => issue.detail).join("; ")}`
      )
    )
  );
}

function unsettledSetObservation(
  newlyPublished: readonly ReleaseArtifactRef[],
  preExisting: readonly ReleaseArtifactRef[],
  issues: readonly [BuildIssue, ...BuildIssue[]]
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
  issue: BuildIssue
): readonly [BuildIssue, ...BuildIssue[]] {
  return Object.freeze([issues[0], ...issues.slice(1), issue]);
}

function artifactObservationIssue(detail: string): BuildIssue {
  return artifactStoreBuildIssue(detail);
}

function unsettled(
  mode: BuildMode,
  observed: readonly ReleaseArtifactRef[],
  result: Extract<ArtifactPublicationResult, { kind: "Unsettled" }>
): BuildResult {
  return {
    kind: "PublicationUnsettled",
    mode,
    observedVerifiedReleases: Object.freeze([...observed]),
    requestedFinalCommit: "Unknown",
    issues: [storeIssue(result)],
  };
}

function verifiedRefs(
  ...groups: readonly (readonly ReleaseArtifactRef[])[]
): readonly ReleaseArtifactRef[] {
  const byArtifact = new Map<string, ReleaseArtifactRef>();
  for (const group of groups) for (const ref of group) byArtifact.set(ref.artifactDigest, ref);
  return Object.freeze(
    [...byArtifact.values()].sort((left, right) =>
      compareCanonicalText(left.artifactDigest, right.artifactDigest)
    )
  );
}

function rejected(mode: BuildMode, issues: readonly [BuildIssue, ...BuildIssue[]]): BuildResult {
  return { kind: "RejectedBeforePublication", mode, issues };
}

function sourceIssues(
  issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]]
): readonly [BuildIssue, ...BuildIssue[]] {
  return issues.map((issue) => Object.freeze({ kind: "SourceEligibility", issue })) as [
    BuildIssue,
    ...BuildIssue[],
  ];
}

function constructionIssue(detail: string): BuildIssue {
  return releaseConstructionBuildIssue(detail);
}

function storeIssue(
  result: Extract<ArtifactPublicationResult, { kind: "Rejected" | "Unsettled" }>
): BuildIssue {
  return artifactStoreBuildIssue(result.failure, result.cleanupFailure);
}

async function hit(
  failpoint: BuildFailpoint | undefined,
  event: BuildFailpointEvent
): Promise<void> {
  await failpoint?.(event);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import { decodeAgentPluginReleaseInput } from "../../../shared/release";

import {
  decodeLifecyclePolicy,
  isPathBelow,
  type LifecyclePolicy,
} from "../model/dto/acceptance";
import {
  decodeCurrentMainRecord,
  decodePromotionAttestation,
  type CurrentMainRecord,
  type PromotionAttestation,
} from "../model/dto/promotion";
import {
  ACCEPTANCE_ROOT,
  CURRENT_MAIN_PATH,
  LIFECYCLE_POLICY_PATH,
  PROMOTION_ROOT,
  parseCanonicalRef,
  parseRelativePath,
  type ReleaseRelativePath,
} from "../model/dto/primitives";
import { decodeGitLocator } from "../model/dto/boundary";
import type {
  CurrentMainResolution,
  GovernedAcceptanceObservation,
  ResolveCurrentMainInput,
} from "../model/dto/operations";
import type {
  RepositoryInspection,
} from "../ports/index";
import { readExactBlob } from "../model/repositories/exact-git";
import { module } from "../module";
import type { GovernanceLifecycleRuntime } from "../ports";
import { validateGovernedAcceptance } from "./validate-acceptance.router";

export const resolveCurrentMainProcedure = module.resolveCurrentMain.handler(async ({ context, input }) => {
  const locator = decodeGitLocator(input.locator);
  if (!locator.ok) return { kind: "WRONG_REPOSITORY", reason: locator.reason };
  return resolveCurrentMain(context.governance, { locator: locator.value });
});

export async function resolveCurrentMain(
  dependencies: GovernanceLifecycleRuntime,
  input: ResolveCurrentMainInput,
): Promise<CurrentMainResolution> {
  const canonicalRef = fixedCanonicalMainRef();
  const inspection = await dependencies.git.inspect(input.locator, canonicalRef);
  const repositoryFailure = classifyRepository(inspection, input.locator.expectedRepositoryIdentity);
  if (repositoryFailure !== undefined) return repositoryFailure;
  if (inspection.kind !== "Ready") return { kind: "UNREACHABLE_REPOSITORY", reason: "Repository inspection did not produce canonical state" };

  const fixed = fixedPaths();
  if (fixed === undefined) return { kind: "FORGED_RECORD", reason: "Compiled lifecycle paths are invalid" };
  const policyObservation = await dependencies.git.readBlob(input.locator, {
    repositoryIdentity: inspection.repositoryIdentity,
    ref: inspection.canonicalRef,
    commit: inspection.headCommit,
    tree: inspection.headTree,
    path: fixed.policy,
  });
  if (!policyObservation.ok) return { kind: "STALE_RECORD", reason: `Current policy is unavailable: ${policyObservation.failure.message}` };
  const policy = decodeLifecyclePolicy(policyObservation.observation.bytes);
  if (!policy.ok) return { kind: "FORGED_RECORD", reason: "Current policy is invalid or noncanonical" };
  if (
    policy.value.body.repositoryIdentity !== inspection.repositoryIdentity
    || policy.value.body.canonicalRef !== inspection.canonicalRef
    || policy.value.body.currentMainPath !== CURRENT_MAIN_PATH
  ) {
    return { kind: "WRONG_REPOSITORY", reason: "Current policy does not govern the inspected repository/ref" };
  }

  const channelObservation = await dependencies.git.readBlob(input.locator, {
    repositoryIdentity: inspection.repositoryIdentity,
    ref: inspection.canonicalRef,
    commit: inspection.headCommit,
    tree: inspection.headTree,
    path: fixed.currentMain,
  });
  if (!channelObservation.ok) return { kind: "STALE_RECORD", reason: `Fixed current-main record is unavailable: ${channelObservation.failure.message}` };
  const currentMain = decodeCurrentMainRecord(channelObservation.observation.bytes);
  if (!currentMain.ok) return { kind: "FORGED_RECORD", reason: "Fixed current-main record is invalid or noncanonical" };
  const recordFailure = validateCurrentMainBindings(currentMain.value, policy.value, inspection.repositoryIdentity);
  if (recordFailure !== undefined) return recordFailure;

  const acceptance = await validateGovernedAcceptance(dependencies, {
    locator: input.locator,
    policyObject: policyObservation.observation.pointer,
    requestObject: currentMain.value.body.requestObject,
    acceptanceObject: currentMain.value.body.acceptanceObject,
  });
  if (acceptance.kind !== "GovernedAccepted") {
    return acceptance.kind === "BlockedAcceptanceAuthority"
      ? { kind: "BLOCKED_ACCEPTANCE_AUTHORITY", reason: acceptance.reason }
      : { kind: "FORGED_RECORD", reason: `Current-main references non-governed acceptance: ${acceptance.kind}` };
  }

  const promotionBytes = await readExactBlob(
    dependencies.git,
    input.locator,
    currentMain.value.body.promotionObject,
  );
  if (!promotionBytes.ok) {
    return promotionBytes.failure.code === "WrongObject"
      ? { kind: "FORGED_RECORD", reason: promotionBytes.failure.message }
      : { kind: "STALE_RECORD", reason: promotionBytes.failure.message };
  }
  const promotion = decodePromotionAttestation(promotionBytes.bytes);
  if (!promotion.ok) return { kind: "FORGED_RECORD", reason: "Promotion attestation is invalid or noncanonical" };
  const transitiveFailure = validateTransitiveBindings(
    currentMain.value,
    acceptance.observation,
    promotion.value,
  );
  if (transitiveFailure !== undefined) return transitiveFailure;

  const reachable = await dependencies.git.isAncestor(
    input.locator,
    promotion.value.body.landedInput.object.commit,
    inspection.headCommit,
  );
  if (!reachable.ok) return { kind: "STALE_RECORD", reason: `Promotion reachability cannot be established: ${reachable.failure.message}` };
  if (!reachable.value) return { kind: "FORGED_RECORD", reason: "Promotion landed commit is not reachable from current canonical main" };

  const currentInput = await dependencies.git.readBlob(input.locator, {
    repositoryIdentity: inspection.repositoryIdentity,
    ref: inspection.canonicalRef,
    commit: inspection.headCommit,
    tree: inspection.headTree,
    path: policy.value.body.releaseInputPath,
  });
  if (!currentInput.ok) return { kind: "STALE_RECORD", reason: `Current release input is unavailable: ${currentInput.failure.message}` };
  const decodedInput = decodeAgentPluginReleaseInput(currentInput.observation.bytes);
  if (!decodedInput.ok) return { kind: "FORGED_RECORD", reason: "Current release input is invalid or noncanonical" };
  if (decodedInput.value.releaseInputDigest !== promotion.value.body.landedInput.releaseInputDigest) {
    return {
      kind: "CONTENT_AHEAD_OF_ACCEPTANCE",
      reason: "Current canonical release input differs from the accepted promotion identity",
    };
  }

  const observation = Object.freeze({
    record: currentMain.value,
    policy: policy.value,
    acceptance: acceptance.observation,
    promotion: promotion.value,
  });
  if (
    inspection.headCommit === promotion.value.body.landedInput.object.commit
    && inspection.headTree === promotion.value.body.landedInput.object.tree
  ) {
    return { kind: "CURRENT_ELIGIBLE", observation };
  }
  const changedPaths = await dependencies.git.listChangedPaths(
    input.locator,
    promotion.value.body.landedInput.object.commit,
    inspection.headCommit,
  );
  if (!changedPaths.ok) return { kind: "STALE_RECORD", reason: `Canonical delta cannot be classified: ${changedPaths.failure.message}` };
  return changedPaths.paths.length > 0
    && changedPaths.paths.every((path) => isLifecycleRecordPath(path, policy.value))
    ? { kind: "ACCEPTED_PENDING_CONVERGENCE", observation }
    : { kind: "CURRENT_ELIGIBLE", observation };
}

function fixedCanonicalMainRef() {
  const parsed = parseCanonicalRef("refs/heads/main", "canonicalRef");
  if (!parsed.ok) throw new Error("Compiled current-main ref is invalid");
  return parsed.value;
}

function validateCurrentMainBindings(
  record: CurrentMainRecord,
  policy: LifecyclePolicy,
  repositoryIdentity: string,
): CurrentMainResolution | undefined {
  if (
    record.body.policyIdentity !== policy.body.policyIdentity
    || record.body.policyDigest !== policy.policyDigest
    || record.body.contentAuthority !== policy.body.contentAuthority
  ) {
    return { kind: "STALE_RECORD", reason: "Current-main is bound to another lifecycle policy or content authority" };
  }
  const objects = [record.body.requestObject, record.body.acceptanceObject, record.body.promotionObject];
  if (objects.some((object) => object.repositoryIdentity !== repositoryIdentity)) {
    return { kind: "FORGED_RECORD", reason: "Current-main references a lifecycle object from another repository" };
  }
  if (!isPathBelow(record.body.requestObject.path, policy.body.requestRoot)) {
    return { kind: "FORGED_RECORD", reason: "Current-main request object is outside the governed request root" };
  }
  if (!isPathBelow(record.body.acceptanceObject.path, ACCEPTANCE_ROOT)) {
    return { kind: "FORGED_RECORD", reason: "Current-main acceptance object is outside the protected root" };
  }
  if (!isPathBelow(record.body.promotionObject.path, PROMOTION_ROOT)) {
    return { kind: "FORGED_RECORD", reason: "Current-main promotion object is outside the protected root" };
  }
  return undefined;
}

function validateTransitiveBindings(
  record: CurrentMainRecord,
  acceptance: GovernedAcceptanceObservation,
  promotion: PromotionAttestation,
): CurrentMainResolution | undefined {
  if (
    record.body.acceptanceRequestDigest !== acceptance.request.requestDigest
    || record.body.acceptanceEvidenceDigest !== acceptance.evidence.acceptanceDigest
    || record.body.promotionAttestationDigest !== promotion.attestationDigest
    || record.body.releaseSetDigest !== acceptance.request.body.releaseSetDigest
    || promotion.body.acceptanceRequestDigest !== acceptance.request.requestDigest
    || promotion.body.acceptanceEvidenceDigest !== acceptance.evidence.acceptanceDigest
    || promotion.body.releaseSetDigest !== acceptance.request.body.releaseSetDigest
    || promotion.body.policyIdentity !== acceptance.policy.body.policyIdentity
  ) {
    return { kind: "STALE_RECORD", reason: "Current-main transitive request, acceptance, promotion, or release-set bindings disagree" };
  }
  if (!sameProjectionSets(record.body.projections, acceptance.request.body.projections, promotion.body.projections)) {
    return { kind: "FORGED_RECORD", reason: "Current-main projection/capability/adapter bindings differ from accepted promotion" };
  }
  return undefined;
}

function sameProjectionSets(
  first: CurrentMainRecord["body"]["projections"],
  second: CurrentMainRecord["body"]["projections"],
  third: CurrentMainRecord["body"]["projections"],
): boolean {
  const key = (binding: typeof first[number]) => [
    binding.provider,
    binding.projectionDigest,
    binding.adapterProtocol,
    binding.capabilityProfileDigest,
  ].join("\u0000");
  return JSON.stringify(first.map(key)) === JSON.stringify(second.map(key))
    && JSON.stringify(first.map(key)) === JSON.stringify(third.map(key));
}

function classifyRepository(
  inspection: RepositoryInspection,
  expectedRepositoryIdentity: string,
): CurrentMainResolution | undefined {
  switch (inspection.kind) {
    case "DirtyRepository":
      return { kind: "DIRTY_REPOSITORY", reason: "Canonical content workspace is dirty" };
    case "WrongRepository":
      return { kind: "WRONG_REPOSITORY", reason: `Expected ${expectedRepositoryIdentity}, observed ${inspection.actualRepositoryIdentity}` };
    case "UnreachableRepository":
      return { kind: "UNREACHABLE_REPOSITORY", reason: inspection.reason };
    case "Ready":
      return inspection.repositoryIdentity === expectedRepositoryIdentity
        ? undefined
        : { kind: "WRONG_REPOSITORY", reason: "Canonical repository identity differs from the explicit locator" };
  }
}

function fixedPaths(): { readonly policy: ReleaseRelativePath; readonly currentMain: ReleaseRelativePath } | undefined {
  const policy = parseRelativePath(LIFECYCLE_POLICY_PATH, "policyPath");
  const currentMain = parseRelativePath(CURRENT_MAIN_PATH, "currentMainPath");
  return policy.ok && currentMain.ok ? { policy: policy.value, currentMain: currentMain.value } : undefined;
}

function isLifecycleRecordPath(path: ReleaseRelativePath, policy: LifecyclePolicy): boolean {
  return path === LIFECYCLE_POLICY_PATH
    || path === CURRENT_MAIN_PATH
    || isPathBelow(path, policy.body.requestRoot)
    || isPathBelow(path, ACCEPTANCE_ROOT)
    || isPathBelow(path, PROMOTION_ROOT);
}

import { decodeAgentPluginReleaseInput } from "../../../shared/release";

import {
  createPromotionAttestation,
} from "../model/dto/promotion";
import {
  decodeAcceptancePointers,
  decodeGitPointer,
} from "../model/dto/boundary";
import type {
  AttestPromotionInput,
  AttestPromotionResult,
} from "../model/dto/operations";
import { readExactBlob } from "../model/repositories/exact-git";
import { module } from "../module";
import type { GovernanceLifecycleRuntime } from "../ports";
import { validateGovernedAcceptance } from "./validate-acceptance.router";

export const attestPromotion = module.attestPromotion.handler(async ({ context, input }) => {
  const decoded = decodeAcceptancePointers(input);
  const landed = decodeGitPointer(input.landedReleaseInputObject);
  if (!decoded.ok) {
    return blockedRepository("WrongObject", decoded.reason);
  }
  if (!landed.ok) {
    return blockedRepository("WrongObject", landed.reason);
  }
  const acceptance = await validateGovernedAcceptance(context.governance, decoded.value);
  if (acceptance.kind !== "GovernedAccepted") return acceptance;
  return attestGovernedPromotion(context.governance, {
    locator: decoded.value.locator,
    acceptance: acceptance.observation,
    landedReleaseInputObject: landed.value,
  });
});

export async function attestGovernedPromotion(
  dependencies: Pick<GovernanceLifecycleRuntime, "git">,
  input: AttestPromotionInput,
): Promise<AttestPromotionResult> {
  const { policy, request, evidence } = input.acceptance;
  const inspection = await dependencies.git.inspect(input.locator, policy.body.canonicalRef);
  if (inspection.kind !== "Ready") return blockedRepository(inspection.kind, "Canonical repository is not clean and reachable");
  if (
    inspection.repositoryIdentity !== policy.body.repositoryIdentity
    || input.locator.expectedRepositoryIdentity !== policy.body.repositoryIdentity
    || input.landedReleaseInputObject.repositoryIdentity !== policy.body.repositoryIdentity
  ) {
    return blockedRepository("WrongRepository", "Landed release input is from another repository authority");
  }
  if (
    input.landedReleaseInputObject.ref !== policy.body.canonicalRef
    || input.landedReleaseInputObject.commit !== inspection.headCommit
    || input.landedReleaseInputObject.tree !== inspection.headTree
    || input.landedReleaseInputObject.path !== policy.body.releaseInputPath
    || request.body.releaseInputObject.path !== policy.body.releaseInputPath
  ) {
    return blockedRepository("WrongObject", "Promotion must compare the accepted source object with exact canonical-main release input");
  }

  const acceptedBytes = await readExactBlob(dependencies.git, input.locator, request.body.releaseInputObject);
  if (!acceptedBytes.ok) return blockedRepository("WrongObject", `Accepted release-input object is unavailable: ${acceptedBytes.failure.message}`);
  const landedBytes = await readExactBlob(dependencies.git, input.locator, input.landedReleaseInputObject);
  if (!landedBytes.ok) return blockedRepository("WrongObject", `Landed release-input object is unavailable: ${landedBytes.failure.message}`);

  const accepted = decodeAgentPluginReleaseInput(acceptedBytes.bytes);
  if (!accepted.ok) return { kind: "InvalidReleaseInput", side: "accepted", reason: "Accepted release-input bytes are not canonical release-domain input" };
  const landed = decodeAgentPluginReleaseInput(landedBytes.bytes);
  if (!landed.ok) return { kind: "InvalidReleaseInput", side: "landed", reason: "Landed release-input bytes are not canonical release-domain input" };
  if (accepted.value.releaseInputDigest !== landed.value.releaseInputDigest) {
    return {
      kind: "ReleaseInputChanged",
      acceptedDigest: accepted.value.releaseInputDigest,
      landedDigest: landed.value.releaseInputDigest,
    };
  }

  const attestation = createPromotionAttestation({
    schemaVersion: 1,
    policyIdentity: policy.body.policyIdentity,
    acceptanceRequestDigest: request.requestDigest,
    acceptanceEvidenceDigest: evidence.acceptanceDigest,
    releaseSetDigest: request.body.releaseSetDigest,
    acceptedInput: {
      object: request.body.releaseInputObject,
      releaseInputDigest: accepted.value.releaseInputDigest,
    },
    landedInput: {
      object: input.landedReleaseInputObject,
      releaseInputDigest: landed.value.releaseInputDigest,
    },
    projections: request.body.projections,
    equivalence: "equivalent",
  });
  if (!attestation.ok) {
    return { kind: "InvalidReleaseInput", side: "landed", reason: "Equivalent input could not produce a bounded promotion attestation" };
  }
  return { kind: "PromotionAttested", attestation: attestation.value };
}

function blockedRepository(
  kind: "DirtyRepository" | "WrongRepository" | "UnreachableRepository" | "WrongObject",
  reason: string,
): AttestPromotionResult {
  const states = {
    DirtyRepository: "DIRTY_REPOSITORY",
    WrongRepository: "WRONG_REPOSITORY",
    UnreachableRepository: "UNREACHABLE_REPOSITORY",
    WrongObject: "WRONG_GIT_OBJECT",
  } as const;
  return { kind: "BlockedRepository", state: states[kind], reason };
}

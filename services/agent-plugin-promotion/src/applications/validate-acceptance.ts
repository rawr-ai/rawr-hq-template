import {
  decodeAcceptanceEvidence,
  decodeAcceptanceRequest,
  decodeLifecyclePolicy,
  isPathBelow,
  type AcceptanceEvidence,
  type AcceptanceRequest,
  type LifecyclePolicy,
} from "../domain/acceptance";
import {
  sameEvidenceHandle,
  sameProviderBinding,
  type MechanicalEvidenceObservation,
  type MechanicalTargetFact,
  type ProviderAcceptanceBinding,
} from "../domain/evidence";
import {
  LIFECYCLE_POLICY_PATH,
  type CanonicalRef,
} from "../domain/primitives";
import type { ExactGitBlobPointer, GitLocator } from "../domain/git";
import type {
  ExactGitReader,
  HostedApprovalObservation,
  HostedApprovalReader,
  MechanicalEvidenceReader,
  RepositoryInspection,
} from "../ports/index";
import { readExactBlob } from "./git-read";

export interface ValidateGovernedAcceptanceInput {
  readonly locator: GitLocator;
  readonly policyObject: ExactGitBlobPointer;
  readonly requestObject: ExactGitBlobPointer;
  readonly acceptanceObject: ExactGitBlobPointer;
}

export interface GovernedAcceptanceObservation {
  readonly policy: LifecyclePolicy;
  readonly request: AcceptanceRequest;
  readonly evidence: AcceptanceEvidence;
  readonly policyObject: ExactGitBlobPointer;
  readonly requestObject: ExactGitBlobPointer;
  readonly acceptanceObject: ExactGitBlobPointer;
  readonly approval: HostedApprovalObservation;
}

export type GovernedAcceptanceResult =
  | { readonly kind: "GovernedAccepted"; readonly observation: GovernedAcceptanceObservation }
  | { readonly kind: "RejectedAcceptance"; readonly evidence: AcceptanceEvidence }
  | {
    readonly kind: "InvalidAcceptance";
    readonly code: "INVALID_ACCEPTANCE_RECORD" | "INVALID_MECHANICAL_EVIDENCE";
    readonly reason: string;
  }
  | {
    readonly kind: "BlockedAcceptanceAuthority";
    readonly code: "BLOCKED_ACCEPTANCE_AUTHORITY";
    readonly reason: string;
  };

export interface GovernedAcceptanceDependencies {
  readonly git: ExactGitReader;
  readonly evidence: MechanicalEvidenceReader;
  readonly approvals: HostedApprovalReader;
}

export function createValidateGovernedAcceptance(
  dependencies: GovernedAcceptanceDependencies,
): (input: ValidateGovernedAcceptanceInput) => Promise<GovernedAcceptanceResult> {
  return async (input) => {
    const records = await readAcceptanceRecords(dependencies.git, input);
    if (!records.ok) return records.result;
    const { policy, request, evidence } = records;

    const bindingFailure = validateRecordBindings(input, policy, request, evidence);
    if (bindingFailure !== undefined) return bindingFailure;

    const inspection = await dependencies.git.inspect(input.locator, policy.body.canonicalRef);
    const authorityFailure = classifyRepositoryAuthority(inspection, policy.body.canonicalRef);
    if (authorityFailure !== undefined) return authorityFailure;

    if (evidence.body.outcome === "rejected") {
      return { kind: "RejectedAcceptance", evidence };
    }

    const evidenceFailure = await validateMechanicalEvidence(dependencies.evidence, request);
    if (evidenceFailure !== undefined) return evidenceFailure;

    const approval = await dependencies.approvals.read({ object: input.acceptanceObject, outcome: "accepted" });
    if (!approval.ok) {
      return blocked(`Hosted approval is missing, unavailable, or bound to another object: ${approval.failure.message}`);
    }
    if (
      approval.observation.decision !== "approved"
      || approval.observation.approverIdentity !== policy.body.humanApproverIdentity
      || !sameApprovalObject(approval.observation, input.acceptanceObject)
    ) {
      return blocked("Hosted approval does not bind the exact acceptance object and policy-named human authority");
    }

    return {
      kind: "GovernedAccepted",
      observation: Object.freeze({
        policy,
        request,
        evidence,
        policyObject: input.policyObject,
        requestObject: input.requestObject,
        acceptanceObject: input.acceptanceObject,
        approval: approval.observation,
      }),
    };
  };
}

async function readAcceptanceRecords(
  git: ExactGitReader,
  input: ValidateGovernedAcceptanceInput,
): Promise<
  | { readonly ok: true; readonly policy: LifecyclePolicy; readonly request: AcceptanceRequest; readonly evidence: AcceptanceEvidence }
  | { readonly ok: false; readonly result: GovernedAcceptanceResult }
> {
  const policyBytes = await readExactBlob(git, input.locator, input.policyObject);
  if (!policyBytes.ok) return { ok: false, result: blocked(`Policy Git object is unavailable: ${policyBytes.failure.message}`) };
  const requestBytes = await readExactBlob(git, input.locator, input.requestObject);
  if (!requestBytes.ok) return { ok: false, result: invalid(`Acceptance request Git object is unavailable: ${requestBytes.failure.message}`) };
  const acceptanceBytes = await readExactBlob(git, input.locator, input.acceptanceObject);
  if (!acceptanceBytes.ok) return { ok: false, result: blocked(`Acceptance Git object is unavailable: ${acceptanceBytes.failure.message}`) };

  const policy = decodeLifecyclePolicy(policyBytes.bytes);
  if (!policy.ok) return { ok: false, result: blocked("Repository lifecycle policy is invalid or noncanonical") };
  const request = decodeAcceptanceRequest(requestBytes.bytes);
  if (!request.ok) return { ok: false, result: invalid("Acceptance request is invalid, oversized, or noncanonical") };
  const evidence = decodeAcceptanceEvidence(acceptanceBytes.bytes);
  if (!evidence.ok) return { ok: false, result: blocked("Acceptance evidence is invalid, self-shaped, or noncanonical") };
  return { ok: true, policy: policy.value, request: request.value, evidence: evidence.value };
}

function validateRecordBindings(
  input: ValidateGovernedAcceptanceInput,
  policy: LifecyclePolicy,
  request: AcceptanceRequest,
  evidence: AcceptanceEvidence,
): GovernedAcceptanceResult | undefined {
  const repositoryIdentity = policy.body.repositoryIdentity;
  if (
    input.locator.expectedRepositoryIdentity !== repositoryIdentity
    || input.policyObject.repositoryIdentity !== repositoryIdentity
    || input.requestObject.repositoryIdentity !== repositoryIdentity
    || input.acceptanceObject.repositoryIdentity !== repositoryIdentity
    || request.body.repositoryIdentity !== repositoryIdentity
  ) {
    return blocked("Policy, locator, request, and governed records do not name one repository authority");
  }
  if (input.policyObject.path !== LIFECYCLE_POLICY_PATH || input.policyObject.ref !== policy.body.canonicalRef) {
    return blocked("Lifecycle policy was not read from its fixed path on canonical policy ref");
  }
  if (!isPathBelow(input.requestObject.path, policy.body.requestRoot)) {
    return invalid("Acceptance request object is outside the policy-selected request root");
  }
  if (input.acceptanceObject.path !== request.body.acceptancePath) {
    return blocked("Acceptance object path differs from the request-selected protected path");
  }
  if (
    evidence.body.requestDigest !== request.requestDigest
    || evidence.body.requestPath !== input.requestObject.path
    || evidence.body.policyIdentity !== policy.body.policyIdentity
    || request.body.policyIdentity !== policy.body.policyIdentity
    || request.body.contentAuthority !== policy.body.contentAuthority
  ) {
    return invalid("Acceptance request, evidence, and lifecycle policy digest bindings disagree");
  }
  if (
    evidence.body.issuerProtocol !== policy.body.issuerProtocol
    || evidence.body.issuerIdentity !== policy.body.issuerIdentity
    || evidence.body.issuerSchemaProtocol !== policy.body.issuerSchemaProtocol
    || !evidence.body.issuerTask.taskId.startsWith(`${policy.body.cleanTaskNamespace}/`)
  ) {
    return blocked("Acceptance was not issued by the policy-selected independent clean-context authority");
  }
  return undefined;
}

async function validateMechanicalEvidence(
  reader: MechanicalEvidenceReader,
  request: AcceptanceRequest,
): Promise<GovernedAcceptanceResult | undefined> {
  const observedBindings: ProviderAcceptanceBinding[] = [];
  const observedTargets: MechanicalTargetFact[] = [];
  for (const handle of request.body.evidence) {
    const result = await reader.read(handle);
    if (!result.ok) return invalidEvidence(`Immutable mechanical evidence is unavailable: ${result.failure.message}`);
    const observation = result.observation;
    const mismatch = validateEvidenceObservation(handle, observation, request);
    if (mismatch !== undefined) return invalidEvidence(mismatch);
    observedBindings.push(...observation.projections);
    observedTargets.push(...observation.targets);
  }
  if (!sameBindingSet(observedBindings, request.body.projections)) {
    return invalidEvidence("Mechanical evidence does not cover each accepted projection exactly once");
  }
  if (observedTargets.some((fact) => fact.outcome !== "passed")) {
    return invalidEvidence("Mechanical evidence contains one or more failed target verifications");
  }
  const requiredFreshTargets = observedTargets.filter(
    (fact) => fact.targetIdentity === request.body.freshAgentTarget,
  );
  if (requiredFreshTargets.length !== 1 || requiredFreshTargets[0]?.outcome !== "passed") {
    return invalidEvidence("Mechanical evidence does not contain exactly one passed fact for the request-selected fresh-agent target");
  }
  return undefined;
}

function validateEvidenceObservation(
  expectedHandle: AcceptanceRequest["body"]["evidence"][number],
  observation: MechanicalEvidenceObservation,
  request: AcceptanceRequest,
): string | undefined {
  if (!sameEvidenceHandle(expectedHandle, observation.handle)) return "Evidence reader returned a different immutable handle";
  if (observation.releaseSetDigest !== request.body.releaseSetDigest) return "Mechanical evidence release set differs from the request";
  if (observation.evaluationProfile !== request.body.evaluationProfile) return "Mechanical evidence evaluation profile differs from the request";
  const projectionDigests = new Set(observation.projections.map((binding) => `${binding.provider}\u0000${binding.projectionDigest}`));
  if (observation.targets.some((fact) => !projectionDigests.has(`${fact.provider}\u0000${fact.projectionDigest}`))) {
    return "Mechanical target facts reference a projection outside the verified evidence observation";
  }
  return undefined;
}

function sameBindingSet(
  observed: readonly ProviderAcceptanceBinding[],
  expected: readonly ProviderAcceptanceBinding[],
): boolean {
  if (observed.length !== expected.length) return false;
  const unmatched = [...expected];
  for (const candidate of observed) {
    const index = unmatched.findIndex((value) => sameProviderBinding(value, candidate));
    if (index < 0) return false;
    unmatched.splice(index, 1);
  }
  return unmatched.length === 0;
}

function classifyRepositoryAuthority(
  inspection: RepositoryInspection,
  canonicalRef: CanonicalRef,
): GovernedAcceptanceResult | undefined {
  if (inspection.kind !== "Ready") {
    return blocked(`Repository authority is unavailable: ${inspection.kind}`);
  }
  if (inspection.canonicalRef !== canonicalRef) {
    return blocked("Repository inspection resolved a different canonical policy ref");
  }
  return undefined;
}

function sameApprovalObject(
  approval: HostedApprovalObservation,
  object: ExactGitBlobPointer,
): boolean {
  return approval.object.repositoryIdentity === object.repositoryIdentity
    && approval.object.ref === object.ref
    && approval.object.commit === object.commit
    && approval.object.tree === object.tree
    && approval.object.path === object.path
    && approval.object.blob === object.blob
    && approval.outcome === "accepted";
}

function blocked(reason: string): GovernedAcceptanceResult {
  return { kind: "BlockedAcceptanceAuthority", code: "BLOCKED_ACCEPTANCE_AUTHORITY", reason };
}

function invalid(reason: string): GovernedAcceptanceResult {
  return { kind: "InvalidAcceptance", code: "INVALID_ACCEPTANCE_RECORD", reason };
}

function invalidEvidence(reason: string): GovernedAcceptanceResult {
  return { kind: "InvalidAcceptance", code: "INVALID_MECHANICAL_EVIDENCE", reason };
}

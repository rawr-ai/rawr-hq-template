import {
  decodeAcceptanceEvidence,
  decodeAcceptanceRequest,
  decodeLifecyclePolicy,
  isPathBelow,
  type AcceptanceEvidence,
  type AcceptanceRequest,
  type LifecyclePolicy,
} from "../model/dto/acceptance";
import {
  sameEvidenceHandle,
  sameProviderBinding,
  type MechanicalEvidenceObservation,
  type MechanicalTargetFact,
  type ProviderAcceptanceBinding,
} from "../model/dto/evidence";
import {
  LIFECYCLE_POLICY_PATH,
  type CanonicalRef,
} from "../model/dto/primitives";
import { decodeAcceptancePointers } from "../model/dto/boundary";
import type {
  GovernedAcceptanceResult,
  ValidateGovernedAcceptanceInput,
} from "../model/dto/operations";
import type {
  ExactGitReader,
  MechanicalEvidenceReader,
  RepositoryInspection,
} from "../ports/index";
import { readExactBlob } from "../model/repositories/exact-git";
import {
  createHostedApprovalHistoryQuery,
  selectHostedApproval,
} from "../model/policy/hosted-approval";
import { module } from "../module";
import type { GovernanceLifecycleRuntime } from "../ports";

export const validateAcceptance = module.validateAcceptance.handler(async ({ context, input }) => {
  const decoded = decodeAcceptancePointers(input);
  if (!decoded.ok) {
    return {
      kind: "InvalidAcceptance",
      code: "INVALID_ACCEPTANCE_RECORD",
      reason: decoded.reason,
    };
  }
  return validateGovernedAcceptance(context.governance, decoded.value);
});

export async function validateGovernedAcceptance(
  dependencies: GovernanceLifecycleRuntime,
  input: ValidateGovernedAcceptanceInput,
): Promise<GovernedAcceptanceResult> {
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

  const approvalQuery = createHostedApprovalHistoryQuery(request, input.acceptanceObject);
  const approvalHistory = await dependencies.approvals.read(approvalQuery);
  if (!approvalHistory.ok) {
    return blocked(`Hosted approval history is unavailable: ${approvalHistory.failure.message}`);
  }
  const approval = selectHostedApproval(
    approvalHistory.history,
    approvalQuery,
    input.acceptanceObject,
    policy.body.humanApproverIdentity,
  );
  if (!approval.ok) return blocked(approval.reason);

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

function blocked(reason: string): GovernedAcceptanceResult {
  return { kind: "BlockedAcceptanceAuthority", code: "BLOCKED_ACCEPTANCE_AUTHORITY", reason };
}

function invalid(reason: string): GovernedAcceptanceResult {
  return { kind: "InvalidAcceptance", code: "INVALID_ACCEPTANCE_RECORD", reason };
}

function invalidEvidence(reason: string): GovernedAcceptanceResult {
  return { kind: "InvalidAcceptance", code: "INVALID_MECHANICAL_EVIDENCE", reason };
}

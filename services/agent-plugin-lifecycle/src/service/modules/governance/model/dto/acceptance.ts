import {
  bytesEqual,
  canonicalJsonLine,
  decodeCanonicalJson,
  sha256Digest,
  type CanonicalJsonValue,
} from "../helpers/canonical";
import {
  ACCEPTANCE_ROOT,
  CURRENT_MAIN_PATH,
  INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
  LIFECYCLE_POLICY_PATH,
  MAX_BINDINGS,
  PROMOTION_ROOT,
  parseAcceptanceEvidenceDigest,
  parseAcceptanceRequestDigest,
  parseAuthority,
  parseCanonicalId,
  parseCanonicalRef,
  parseIsoInstant,
  parseLifecyclePolicyDigest,
  parseRelativePath,
  parseReleaseSet,
  parseRepository,
  parseTargetDigest,
  sortCanonical,
  type AcceptanceEvidenceDigest,
  type AcceptanceRequestDigest,
  type CanonicalId,
  type CanonicalRef,
  type ContentAuthority,
  type LifecyclePolicyDigest,
  type ReleaseRelativePath,
  type ReleaseSetDigest,
  type RepositoryIdentity,
  type TargetIdentityDigest,
} from "./primitives";
import {
  evidenceHandleValue,
  parseMechanicalEvidenceHandle,
  parseProviderBindings,
  providerBindingKey,
  providerBindingValue,
  type MechanicalEvidenceHandle,
  type ProviderAcceptanceBinding,
} from "./evidence";
import {
  gitPointerValue,
  parseExactGitBlobPointer,
  type ExactGitBlobPointer,
} from "./git";
import { failures, issue, success, type PromotionIssue, type PromotionResult } from "../errors/promotion-result";
import {
  boundedArray,
  collect,
  exactRecord,
  parseBoundedInteger,
  reportDuplicateOrOrder,
} from "../helpers/schema";

export const ACCEPTANCE_REQUEST_SCHEMA_VERSION = 2 as const;
export const ACCEPTANCE_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const LIFECYCLE_POLICY_SCHEMA_VERSION = 1 as const;

export interface HostedApprovalSelector {
  readonly provider: "github";
  readonly pullRequest: number;
}

export interface AcceptanceRequestBody {
  readonly schemaVersion: typeof ACCEPTANCE_REQUEST_SCHEMA_VERSION;
  readonly repositoryIdentity: RepositoryIdentity;
  readonly contentAuthority: ContentAuthority;
  readonly policyIdentity: CanonicalId;
  readonly releaseSetDigest: ReleaseSetDigest;
  readonly releaseInputObject: ExactGitBlobPointer;
  readonly hostedApproval: HostedApprovalSelector;
  readonly projections: readonly ProviderAcceptanceBinding[];
  readonly evidence: readonly MechanicalEvidenceHandle[];
  readonly evaluationProfile: CanonicalId;
  readonly freshAgentTarget: TargetIdentityDigest;
  readonly acceptancePath: ReleaseRelativePath;
}

export interface AcceptanceRequest {
  readonly schemaVersion: typeof ACCEPTANCE_REQUEST_SCHEMA_VERSION;
  readonly requestDigest: AcceptanceRequestDigest;
  readonly body: AcceptanceRequestBody;
}

export interface IssuerTaskIdentity {
  readonly taskId: CanonicalId;
  readonly context: "clean";
  readonly forkedFrom: null;
}

export interface AcceptanceEvidenceBody {
  readonly schemaVersion: typeof ACCEPTANCE_EVIDENCE_SCHEMA_VERSION;
  readonly requestDigest: AcceptanceRequestDigest;
  readonly requestPath: ReleaseRelativePath;
  readonly outcome: "accepted" | "rejected";
  readonly issuerIdentity: CanonicalId;
  readonly issuerProtocol: typeof INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL;
  readonly issuerSchemaProtocol: CanonicalId;
  readonly issuerTask: IssuerTaskIdentity;
  readonly issuedAt: string;
  readonly issuerImplementationIdentity: CanonicalId;
  readonly policyIdentity: CanonicalId;
}

export interface AcceptanceEvidence {
  readonly schemaVersion: typeof ACCEPTANCE_EVIDENCE_SCHEMA_VERSION;
  readonly acceptanceDigest: AcceptanceEvidenceDigest;
  readonly body: AcceptanceEvidenceBody;
}

export interface LifecyclePolicyBody {
  readonly schemaVersion: typeof LIFECYCLE_POLICY_SCHEMA_VERSION;
  readonly policyIdentity: CanonicalId;
  readonly repositoryIdentity: RepositoryIdentity;
  readonly contentAuthority: ContentAuthority;
  readonly canonicalRef: CanonicalRef;
  readonly releaseInputPath: ReleaseRelativePath;
  readonly requestRoot: ReleaseRelativePath;
  readonly acceptanceRoot: typeof ACCEPTANCE_ROOT;
  readonly promotionRoot: typeof PROMOTION_ROOT;
  readonly currentMainPath: typeof CURRENT_MAIN_PATH;
  readonly issuerIdentity: CanonicalId;
  readonly issuerProtocol: typeof INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL;
  readonly issuerSchemaProtocol: CanonicalId;
  readonly cleanTaskNamespace: CanonicalId;
  readonly humanApproverIdentity: CanonicalId;
}

export interface LifecyclePolicy {
  readonly schemaVersion: typeof LIFECYCLE_POLICY_SCHEMA_VERSION;
  readonly policyDigest: LifecyclePolicyDigest;
  readonly body: LifecyclePolicyBody;
}

export function createAcceptanceRequest(input: unknown): PromotionResult<AcceptanceRequest> {
  const body = parseAcceptanceRequestBody(input, "acceptanceRequest.body", true);
  if (!body.ok) return body;
  return success(freezeAcceptanceRequest(body.value));
}

export function decodeAcceptanceRequest(bytes: unknown): PromotionResult<AcceptanceRequest> {
  const decoded = decodeCanonicalJson(bytes, "acceptanceRequest");
  if (!decoded.ok) return decoded;
  const issues: PromotionIssue[] = [];
  const envelope = exactRecord(decoded.value, ["body", "requestDigest", "schemaVersion"], "acceptanceRequest", issues);
  if (envelope === undefined) return failures(issues);
  if (envelope.schemaVersion !== ACCEPTANCE_REQUEST_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", "acceptanceRequest.schemaVersion", "Unsupported acceptance request schema"));
  }
  const digest = collect(parseAcceptanceRequestDigest(envelope.requestDigest, "acceptanceRequest.requestDigest"), issues);
  const body = collect(parseAcceptanceRequestBody(envelope.body, "acceptanceRequest.body", false), issues);
  if (issues.length > 0 || digest === undefined || body === undefined) return failures(issues);
  const result = freezeAcceptanceRequest(body);
  if (result.requestDigest !== digest) {
    return { ok: false, issues: [issue("DIGEST_MISMATCH", "acceptanceRequest.requestDigest", "Acceptance request digest does not match its body")] };
  }
  if (!(bytes instanceof Uint8Array) || !bytesEqual(bytes, canonicalSerializeAcceptanceRequest(result))) {
    return { ok: false, issues: [issue("NON_CANONICAL_ENVELOPE", "acceptanceRequest", "Acceptance request bytes are not canonical")] };
  }
  return success(result);
}

export function canonicalSerializeAcceptanceRequest(request: AcceptanceRequest): Uint8Array {
  return canonicalJsonLine({
    schemaVersion: request.schemaVersion,
    requestDigest: request.requestDigest,
    body: acceptanceRequestBodyValue(request.body),
  });
}

export function createAcceptanceEvidence(input: unknown): PromotionResult<AcceptanceEvidence> {
  const body = parseAcceptanceEvidenceBody(input, "acceptanceEvidence.body");
  if (!body.ok) return body;
  return success(freezeAcceptanceEvidence(body.value));
}

export function decodeAcceptanceEvidence(bytes: unknown): PromotionResult<AcceptanceEvidence> {
  const decoded = decodeCanonicalJson(bytes, "acceptanceEvidence");
  if (!decoded.ok) return decoded;
  const issues: PromotionIssue[] = [];
  const envelope = exactRecord(decoded.value, ["acceptanceDigest", "body", "schemaVersion"], "acceptanceEvidence", issues);
  if (envelope === undefined) return failures(issues);
  if (envelope.schemaVersion !== ACCEPTANCE_EVIDENCE_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", "acceptanceEvidence.schemaVersion", "Unsupported acceptance evidence schema"));
  }
  const digest = collect(parseAcceptanceEvidenceDigest(envelope.acceptanceDigest, "acceptanceEvidence.acceptanceDigest"), issues);
  const body = collect(parseAcceptanceEvidenceBody(envelope.body, "acceptanceEvidence.body"), issues);
  if (issues.length > 0 || digest === undefined || body === undefined) return failures(issues);
  const result = freezeAcceptanceEvidence(body);
  if (result.acceptanceDigest !== digest) {
    return { ok: false, issues: [issue("DIGEST_MISMATCH", "acceptanceEvidence.acceptanceDigest", "Acceptance evidence digest does not match its body")] };
  }
  if (!(bytes instanceof Uint8Array) || !bytesEqual(bytes, canonicalSerializeAcceptanceEvidence(result))) {
    return { ok: false, issues: [issue("NON_CANONICAL_ENVELOPE", "acceptanceEvidence", "Acceptance evidence bytes are not canonical")] };
  }
  return success(result);
}

export function canonicalSerializeAcceptanceEvidence(evidence: AcceptanceEvidence): Uint8Array {
  return canonicalJsonLine({
    schemaVersion: evidence.schemaVersion,
    acceptanceDigest: evidence.acceptanceDigest,
    body: acceptanceEvidenceBodyValue(evidence.body),
  });
}

export function createLifecyclePolicy(input: unknown): PromotionResult<LifecyclePolicy> {
  const body = parseLifecyclePolicyBody(input, "lifecyclePolicy.body");
  if (!body.ok) return body;
  return success(freezeLifecyclePolicy(body.value));
}

export function decodeLifecyclePolicy(bytes: unknown): PromotionResult<LifecyclePolicy> {
  const decoded = decodeCanonicalJson(bytes, "lifecyclePolicy");
  if (!decoded.ok) return decoded;
  const issues: PromotionIssue[] = [];
  const envelope = exactRecord(decoded.value, ["body", "policyDigest", "schemaVersion"], "lifecyclePolicy", issues);
  if (envelope === undefined) return failures(issues);
  if (envelope.schemaVersion !== LIFECYCLE_POLICY_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", "lifecyclePolicy.schemaVersion", "Unsupported lifecycle policy schema"));
  }
  const digest = collect(parseLifecyclePolicyDigest(envelope.policyDigest, "lifecyclePolicy.policyDigest"), issues);
  const body = collect(parseLifecyclePolicyBody(envelope.body, "lifecyclePolicy.body"), issues);
  if (issues.length > 0 || digest === undefined || body === undefined) return failures(issues);
  const result = freezeLifecyclePolicy(body);
  if (result.policyDigest !== digest) {
    return { ok: false, issues: [issue("DIGEST_MISMATCH", "lifecyclePolicy.policyDigest", "Lifecycle policy digest does not match its body")] };
  }
  if (!(bytes instanceof Uint8Array) || !bytesEqual(bytes, canonicalSerializeLifecyclePolicy(result))) {
    return { ok: false, issues: [issue("NON_CANONICAL_ENVELOPE", "lifecyclePolicy", "Lifecycle policy bytes are not canonical")] };
  }
  return success(result);
}

export function canonicalSerializeLifecyclePolicy(policy: LifecyclePolicy): Uint8Array {
  return canonicalJsonLine({
    schemaVersion: policy.schemaVersion,
    policyDigest: policy.policyDigest,
    body: lifecyclePolicyBodyValue(policy.body),
  });
}

export function isPathBelow(path: ReleaseRelativePath, root: string): boolean {
  return path.startsWith(`${root}/`) && path.endsWith(".json");
}

export function acceptanceRequestBodyValue(body: AcceptanceRequestBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    repositoryIdentity: body.repositoryIdentity,
    contentAuthority: body.contentAuthority,
    policyIdentity: body.policyIdentity,
    releaseSetDigest: body.releaseSetDigest,
    releaseInputObject: gitPointerValue(body.releaseInputObject),
    hostedApproval: {
      provider: body.hostedApproval.provider,
      pullRequest: body.hostedApproval.pullRequest,
    },
    projections: body.projections.map(providerBindingValue),
    evidence: body.evidence.map(evidenceHandleValue),
    evaluationProfile: body.evaluationProfile,
    freshAgentTarget: body.freshAgentTarget,
    acceptancePath: body.acceptancePath,
  };
}

export function acceptanceEvidenceBodyValue(body: AcceptanceEvidenceBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    requestDigest: body.requestDigest,
    requestPath: body.requestPath,
    outcome: body.outcome,
    issuerIdentity: body.issuerIdentity,
    issuerProtocol: body.issuerProtocol,
    issuerSchemaProtocol: body.issuerSchemaProtocol,
    issuerTask: {
      taskId: body.issuerTask.taskId,
      context: body.issuerTask.context,
      forkedFrom: body.issuerTask.forkedFrom,
    },
    issuedAt: body.issuedAt,
    issuerImplementationIdentity: body.issuerImplementationIdentity,
    policyIdentity: body.policyIdentity,
  };
}

export function lifecyclePolicyBodyValue(body: LifecyclePolicyBody): CanonicalJsonValue {
  return {
    schemaVersion: body.schemaVersion,
    policyIdentity: body.policyIdentity,
    repositoryIdentity: body.repositoryIdentity,
    contentAuthority: body.contentAuthority,
    canonicalRef: body.canonicalRef,
    releaseInputPath: body.releaseInputPath,
    requestRoot: body.requestRoot,
    acceptanceRoot: body.acceptanceRoot,
    promotionRoot: body.promotionRoot,
    currentMainPath: body.currentMainPath,
    issuerIdentity: body.issuerIdentity,
    issuerProtocol: body.issuerProtocol,
    issuerSchemaProtocol: body.issuerSchemaProtocol,
    cleanTaskNamespace: body.cleanTaskNamespace,
    humanApproverIdentity: body.humanApproverIdentity,
  };
}

function parseAcceptanceRequestBody(
  input: unknown,
  path: string,
  canonicalize: boolean,
): PromotionResult<AcceptanceRequestBody> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(input, [
    "acceptancePath",
    "contentAuthority",
    "evaluationProfile",
    "evidence",
    "freshAgentTarget",
    "hostedApproval",
    "policyIdentity",
    "projections",
    "releaseInputObject",
    "releaseSetDigest",
    "repositoryIdentity",
    "schemaVersion",
  ], path, issues);
  if (record === undefined) return failures(issues);
  if (record.schemaVersion !== ACCEPTANCE_REQUEST_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", `${path}.schemaVersion`, "Unsupported acceptance request schema"));
  }
  const repositoryIdentity = collect(parseRepository(record.repositoryIdentity, `${path}.repositoryIdentity`), issues);
  const contentAuthority = collect(parseAuthority(record.contentAuthority, `${path}.contentAuthority`), issues);
  const policyIdentity = collect(parseCanonicalId(record.policyIdentity, `${path}.policyIdentity`), issues);
  const releaseSetDigest = collect(parseReleaseSet(record.releaseSetDigest, `${path}.releaseSetDigest`), issues);
  const releaseInputObject = collect(parseExactGitBlobPointer(record.releaseInputObject, `${path}.releaseInputObject`), issues);
  const hostedApproval = parseHostedApprovalSelector(record.hostedApproval, `${path}.hostedApproval`, issues);
  const projections = parseProviderBindings(record.projections, `${path}.projections`, issues, canonicalize);
  const evidence = parseEvidenceHandles(record.evidence, `${path}.evidence`, issues, canonicalize);
  const evaluationProfile = collect(parseCanonicalId(record.evaluationProfile, `${path}.evaluationProfile`), issues);
  const freshAgentTarget = collect(parseTargetDigest(record.freshAgentTarget, `${path}.freshAgentTarget`), issues);
  const acceptancePath = collect(parseRelativePath(record.acceptancePath, `${path}.acceptancePath`), issues);
  if (acceptancePath !== undefined && !isPathBelow(acceptancePath, ACCEPTANCE_ROOT)) {
    issues.push(issue("INVALID_LIFECYCLE_PATH", `${path}.acceptancePath`, "Acceptance path is outside the protected acceptance root"));
  }
  if (repositoryIdentity !== undefined && releaseInputObject !== undefined && repositoryIdentity !== releaseInputObject.repositoryIdentity) {
    issues.push(issue("RECORD_MISMATCH", `${path}.releaseInputObject.repositoryIdentity`, "Release-input repository differs from request repository"));
  }
  if (
    issues.length > 0
    || repositoryIdentity === undefined
    || contentAuthority === undefined
    || policyIdentity === undefined
    || releaseSetDigest === undefined
    || releaseInputObject === undefined
    || hostedApproval === undefined
    || projections === undefined
    || evidence === undefined
    || evaluationProfile === undefined
    || freshAgentTarget === undefined
    || acceptancePath === undefined
  ) {
    return failures(issues);
  }
  return success(Object.freeze({
    schemaVersion: ACCEPTANCE_REQUEST_SCHEMA_VERSION,
    repositoryIdentity,
    contentAuthority,
    policyIdentity,
    releaseSetDigest,
    releaseInputObject,
    hostedApproval,
    projections,
    evidence,
    evaluationProfile,
    freshAgentTarget,
    acceptancePath,
  }));
}

function parseHostedApprovalSelector(
  input: unknown,
  path: string,
  issues: PromotionIssue[],
): HostedApprovalSelector | undefined {
  const record = exactRecord(input, ["provider", "pullRequest"], path, issues);
  if (record === undefined) return undefined;
  if (record.provider !== "github") {
    issues.push(issue(
      "INVALID_CANONICAL_VALUE",
      `${path}.provider`,
      "Hosted approval provider must be github",
    ));
  }
  const pullRequest = parseBoundedInteger(
    record.pullRequest,
    `${path}.pullRequest`,
    1,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  return record.provider === "github" && pullRequest !== undefined
    ? Object.freeze({ provider: "github", pullRequest })
    : undefined;
}

function parseAcceptanceEvidenceBody(
  input: unknown,
  path: string,
): PromotionResult<AcceptanceEvidenceBody> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(input, [
    "issuedAt",
    "issuerIdentity",
    "issuerImplementationIdentity",
    "issuerProtocol",
    "issuerSchemaProtocol",
    "issuerTask",
    "outcome",
    "policyIdentity",
    "requestDigest",
    "requestPath",
    "schemaVersion",
  ], path, issues);
  if (record === undefined) return failures(issues);
  if (record.schemaVersion !== ACCEPTANCE_EVIDENCE_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", `${path}.schemaVersion`, "Unsupported acceptance evidence schema"));
  }
  const requestDigest = collect(parseAcceptanceRequestDigest(record.requestDigest, `${path}.requestDigest`), issues);
  const requestPath = collect(parseRelativePath(record.requestPath, `${path}.requestPath`), issues);
  const outcome = parseAcceptanceOutcome(record.outcome, `${path}.outcome`, issues);
  const issuerIdentity = collect(parseCanonicalId(record.issuerIdentity, `${path}.issuerIdentity`), issues);
  if (record.issuerProtocol !== INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL) {
    issues.push(issue("INVALID_SCHEMA", `${path}.issuerProtocol`, `Issuer protocol must be ${INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL}`));
  }
  const issuerSchemaProtocol = collect(parseCanonicalId(record.issuerSchemaProtocol, `${path}.issuerSchemaProtocol`), issues);
  const issuerTask = parseIssuerTask(record.issuerTask, `${path}.issuerTask`, issues);
  const issuedAt = collect(parseIsoInstant(record.issuedAt, `${path}.issuedAt`), issues);
  const issuerImplementationIdentity = collect(parseCanonicalId(record.issuerImplementationIdentity, `${path}.issuerImplementationIdentity`), issues);
  const policyIdentity = collect(parseCanonicalId(record.policyIdentity, `${path}.policyIdentity`), issues);
  if (
    issues.length > 0
    || requestDigest === undefined
    || requestPath === undefined
    || outcome === undefined
    || issuerIdentity === undefined
    || issuerSchemaProtocol === undefined
    || issuerTask === undefined
    || issuedAt === undefined
    || issuerImplementationIdentity === undefined
    || policyIdentity === undefined
  ) {
    return failures(issues);
  }
  return success(Object.freeze({
    schemaVersion: ACCEPTANCE_EVIDENCE_SCHEMA_VERSION,
    requestDigest,
    requestPath,
    outcome,
    issuerIdentity,
    issuerProtocol: INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
    issuerSchemaProtocol,
    issuerTask,
    issuedAt,
    issuerImplementationIdentity,
    policyIdentity,
  }));
}

function parseLifecyclePolicyBody(
  input: unknown,
  path: string,
): PromotionResult<LifecyclePolicyBody> {
  const issues: PromotionIssue[] = [];
  const record = exactRecord(input, [
    "acceptanceRoot",
    "canonicalRef",
    "cleanTaskNamespace",
    "contentAuthority",
    "currentMainPath",
    "humanApproverIdentity",
    "issuerIdentity",
    "issuerProtocol",
    "issuerSchemaProtocol",
    "policyIdentity",
    "promotionRoot",
    "releaseInputPath",
    "repositoryIdentity",
    "requestRoot",
    "schemaVersion",
  ], path, issues);
  if (record === undefined) return failures(issues);
  if (record.schemaVersion !== LIFECYCLE_POLICY_SCHEMA_VERSION) {
    issues.push(issue("INVALID_SCHEMA", `${path}.schemaVersion`, "Unsupported lifecycle policy schema"));
  }
  const policyIdentity = collect(parseCanonicalId(record.policyIdentity, `${path}.policyIdentity`), issues);
  const repositoryIdentity = collect(parseRepository(record.repositoryIdentity, `${path}.repositoryIdentity`), issues);
  const contentAuthority = collect(parseAuthority(record.contentAuthority, `${path}.contentAuthority`), issues);
  const canonicalRef = collect(parseCanonicalRef(record.canonicalRef, `${path}.canonicalRef`), issues);
  const releaseInputPath = collect(parseRelativePath(record.releaseInputPath, `${path}.releaseInputPath`), issues);
  const requestRoot = collect(parseRelativePath(record.requestRoot, `${path}.requestRoot`), issues);
  if (record.acceptanceRoot !== ACCEPTANCE_ROOT) {
    issues.push(issue("INVALID_LIFECYCLE_PATH", `${path}.acceptanceRoot`, `Acceptance root must be ${ACCEPTANCE_ROOT}`));
  }
  if (record.promotionRoot !== PROMOTION_ROOT) {
    issues.push(issue("INVALID_LIFECYCLE_PATH", `${path}.promotionRoot`, `Promotion root must be ${PROMOTION_ROOT}`));
  }
  if (record.currentMainPath !== CURRENT_MAIN_PATH) {
    issues.push(issue("INVALID_LIFECYCLE_PATH", `${path}.currentMainPath`, `Current-main path must be ${CURRENT_MAIN_PATH}`));
  }
  if (record.issuerProtocol !== INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL) {
    issues.push(issue("INVALID_SCHEMA", `${path}.issuerProtocol`, `Issuer protocol must be ${INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL}`));
  }
  const issuerIdentity = collect(parseCanonicalId(record.issuerIdentity, `${path}.issuerIdentity`), issues);
  const issuerSchemaProtocol = collect(parseCanonicalId(record.issuerSchemaProtocol, `${path}.issuerSchemaProtocol`), issues);
  const cleanTaskNamespace = collect(parseCanonicalId(record.cleanTaskNamespace, `${path}.cleanTaskNamespace`), issues);
  const humanApproverIdentity = collect(parseCanonicalId(record.humanApproverIdentity, `${path}.humanApproverIdentity`), issues);
  if (
    issues.length > 0
    || policyIdentity === undefined
    || repositoryIdentity === undefined
    || contentAuthority === undefined
    || canonicalRef === undefined
    || releaseInputPath === undefined
    || requestRoot === undefined
    || issuerIdentity === undefined
    || issuerSchemaProtocol === undefined
    || cleanTaskNamespace === undefined
    || humanApproverIdentity === undefined
  ) {
    return failures(issues);
  }
  return success(Object.freeze({
    schemaVersion: LIFECYCLE_POLICY_SCHEMA_VERSION,
    policyIdentity,
    repositoryIdentity,
    contentAuthority,
    canonicalRef,
    releaseInputPath,
    requestRoot,
    acceptanceRoot: ACCEPTANCE_ROOT,
    promotionRoot: PROMOTION_ROOT,
    currentMainPath: CURRENT_MAIN_PATH,
    issuerIdentity,
    issuerProtocol: INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
    issuerSchemaProtocol,
    cleanTaskNamespace,
    humanApproverIdentity,
  }));
}

function parseEvidenceHandles(
  input: unknown,
  path: string,
  issues: PromotionIssue[],
  canonicalize: boolean,
): readonly MechanicalEvidenceHandle[] | undefined {
  const raw = boundedArray(input, path, MAX_BINDINGS, issues);
  if (raw === undefined) return undefined;
  const parsed: MechanicalEvidenceHandle[] = [];
  raw.forEach((candidate, index) => {
    const handle = collect(parseMechanicalEvidenceHandle(candidate, `${path}[${index}]`), issues);
    if (handle !== undefined) parsed.push(handle);
  });
  const values = canonicalize ? sortCanonical(parsed, (value) => value.digest) : Object.freeze(parsed);
  reportDuplicateOrOrder(values, (value) => value.digest, path, issues);
  return values;
}

function parseIssuerTask(
  input: unknown,
  path: string,
  issues: PromotionIssue[],
): IssuerTaskIdentity | undefined {
  const record = exactRecord(input, ["context", "forkedFrom", "taskId"], path, issues);
  if (record === undefined) return undefined;
  const taskId = collect(parseCanonicalId(record.taskId, `${path}.taskId`), issues);
  if (record.context !== "clean") {
    issues.push(issue("INVALID_SCHEMA", `${path}.context`, "Acceptance issuer task must be clean-context"));
  }
  if (record.forkedFrom !== null) {
    issues.push(issue("INVALID_SCHEMA", `${path}.forkedFrom`, "Acceptance issuer task must not fork the content or deployment task"));
  }
  return taskId === undefined || record.context !== "clean" || record.forkedFrom !== null
    ? undefined
    : Object.freeze({ taskId, context: "clean", forkedFrom: null });
}

function parseAcceptanceOutcome(
  value: unknown,
  path: string,
  issues: PromotionIssue[],
): "accepted" | "rejected" | undefined {
  if (value === "accepted" || value === "rejected") return value;
  issues.push(issue("INVALID_CANONICAL_VALUE", path, "Acceptance outcome must be accepted or rejected"));
  return undefined;
}

function freezeAcceptanceRequest(body: AcceptanceRequestBody): AcceptanceRequest {
  const digest = sha256Digest("arq1_", canonicalJsonLine(acceptanceRequestBodyValue(body))) as AcceptanceRequestDigest;
  return Object.freeze({ schemaVersion: ACCEPTANCE_REQUEST_SCHEMA_VERSION, requestDigest: digest, body });
}

function freezeAcceptanceEvidence(body: AcceptanceEvidenceBody): AcceptanceEvidence {
  const digest = sha256Digest("ace1_", canonicalJsonLine(acceptanceEvidenceBodyValue(body))) as AcceptanceEvidenceDigest;
  return Object.freeze({ schemaVersion: ACCEPTANCE_EVIDENCE_SCHEMA_VERSION, acceptanceDigest: digest, body });
}

function freezeLifecyclePolicy(body: LifecyclePolicyBody): LifecyclePolicy {
  const digest = sha256Digest("lpy1_", canonicalJsonLine(lifecyclePolicyBodyValue(body))) as LifecyclePolicyDigest;
  return Object.freeze({ schemaVersion: LIFECYCLE_POLICY_SCHEMA_VERSION, policyDigest: digest, body });
}

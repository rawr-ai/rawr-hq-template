import {
  canonicalSerializeAgentPluginReleaseInput,
  contentDigest,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
  type AgentPluginReleaseInput,
  type ReleaseResult,
} from "../../../src/service/shared/release";

import {
  ACCEPTANCE_ROOT,
  CURRENT_MAIN_PATH,
  INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
  LIFECYCLE_POLICY_PATH,
  PROMOTION_ROOT,
  canonicalSerializeAcceptanceEvidence,
  canonicalSerializeAcceptanceRequest,
  canonicalSerializeCurrentMainRecord,
  canonicalSerializeLifecyclePolicy,
  canonicalSerializePromotionAttestation,
  createAcceptanceEvidence,
  createAcceptanceRequest,
  createCurrentMainRecord,
  createExactGitBlobPointer,
  createLifecyclePolicy,
  createMechanicalEvidenceHandle,
  createMechanicalEvidenceObservation,
  createPromotionAttestation,
  createProviderAcceptanceBinding,
  type AcceptanceEvidence,
  type AcceptanceRequest,
  type CurrentMainRecord,
  type ExactGitBlobObservation,
  type ExactGitBlobPointer,
  type ExactGitReader,
  type GitBlobSelection,
  type GitLocator,
  type GovernedAcceptanceObservation,
  type HostedApprovalHistory,
  type HostedApprovalHistoryQuery,
  type HostedApprovalHistoryReader,
  type HostedApprovalObservation,
  type LifecyclePolicy,
  type MechanicalEvidenceHandle,
  type MechanicalEvidenceObservation,
  type MechanicalEvidenceReader,
  type PromotionAttestation,
  type PromotionResult,
  type ProviderAcceptanceBinding,
  type RepositoryInspection,
} from "../../../src/service/modules/governance/internal";

const encoder = new TextEncoder();

export const REPOSITORY = "git:github.com/example/personal-rawr-hq";
export const MAIN_REF = "refs/heads/main";
export const FEATURE_REF = "refs/heads/candidate";
export const CONTENT_AUTHORITY = "personal-rawr-hq";
export const SOURCE_COMMIT = oid("a");
export const SOURCE_TREE = oid("b");
export const LANDED_COMMIT = oid("c");
export const LANDED_TREE = oid("d");
export const RECORD_COMMIT = oid("e");
export const RECORD_TREE = oid("f");
export const RELEASE_INPUT_PATH = "plugins/agents/release-input.json";
export const REQUEST_PATH = "docs/lifecycle/requests/request.json";
export const ACCEPTANCE_PATH = `${ACCEPTANCE_ROOT}/accepted.json`;
export const PROMOTION_PATH = `${PROMOTION_ROOT}/promotion.json`;

export interface PromotionFixture {
  readonly locator: GitLocator;
  readonly releaseInput: AgentPluginReleaseInput;
  readonly releaseInputBytes: Uint8Array;
  readonly sourceInputObject: ExactGitBlobPointer;
  readonly landedInputObject: ExactGitBlobPointer;
  readonly currentInputObject: ExactGitBlobPointer;
  readonly policy: LifecyclePolicy;
  readonly request: AcceptanceRequest;
  readonly acceptance: AcceptanceEvidence;
  readonly promotion: PromotionAttestation;
  readonly currentMain: CurrentMainRecord;
  readonly policyObject: ExactGitBlobPointer;
  readonly requestObject: ExactGitBlobPointer;
  readonly acceptanceObject: ExactGitBlobPointer;
  readonly promotionObject: ExactGitBlobPointer;
  readonly currentMainObject: ExactGitBlobPointer;
  readonly projections: readonly ProviderAcceptanceBinding[];
  readonly handles: readonly MechanicalEvidenceHandle[];
  readonly observations: readonly MechanicalEvidenceObservation[];
  readonly git: MemoryGitReader;
  readonly evidenceReader: MemoryEvidenceReader;
  readonly approvalReader: MemoryApprovalReader;
}

export function promotionFixture(): PromotionFixture {
  const releaseInput = releaseInputFixture("alpha\n");
  const releaseInputBytes = canonicalSerializeAgentPluginReleaseInput(releaseInput);
  const sourceInputObject = pointer({
    ref: FEATURE_REF,
    commit: SOURCE_COMMIT,
    tree: SOURCE_TREE,
    path: RELEASE_INPUT_PATH,
    blob: oid("1"),
  });
  const landedInputObject = pointer({
    ref: MAIN_REF,
    commit: LANDED_COMMIT,
    tree: LANDED_TREE,
    path: RELEASE_INPUT_PATH,
    blob: oid("2"),
  });
  const currentInputObject = pointer({
    ref: MAIN_REF,
    commit: RECORD_COMMIT,
    tree: RECORD_TREE,
    path: RELEASE_INPUT_PATH,
    blob: oid("a"),
  });
  const projections = [
    mustPromotion(createProviderAcceptanceBinding({
      provider: "codex",
      projectionDigest: digest("ap1_", "3"),
      adapterProtocol: "codex-native-adapter@v1",
      capabilityProfileDigest: digest("cp1_", "4"),
    })),
    mustPromotion(createProviderAcceptanceBinding({
      provider: "claude",
      projectionDigest: digest("ap1_", "5"),
      adapterProtocol: "claude-native-adapter@v1",
      capabilityProfileDigest: digest("cp1_", "6"),
    })),
  ];
  const handles = [
    mustPromotion(createMechanicalEvidenceHandle({
      protocol: "agent-plugin-mechanical-evidence/v1",
      digest: digest("me1_", "7"),
      byteLength: 1024,
    })),
    mustPromotion(createMechanicalEvidenceHandle({
      protocol: "agent-plugin-mechanical-evidence/v1",
      digest: digest("me1_", "8"),
      byteLength: 2048,
    })),
  ];
  const releaseSetDigest = digest("rs1_", "9");
  const targets = [digest("pt1_", "a"), digest("pt1_", "b")];
  const observations = [
    mustPromotion(createMechanicalEvidenceObservation({
      handle: handles[0],
      releaseSetDigest,
      projections: [projections[0]],
      evaluationProfile: "fresh-agent-v1",
      targets: [{
        targetIdentity: targets[0],
        provider: projections[0]!.provider,
        projectionDigest: projections[0]!.projectionDigest,
        outcome: "passed",
        factDigest: digest("mtf1_", "c"),
      }],
    })),
    mustPromotion(createMechanicalEvidenceObservation({
      handle: handles[1],
      releaseSetDigest,
      projections: [projections[1]],
      evaluationProfile: "fresh-agent-v1",
      targets: [{
        targetIdentity: targets[1],
        provider: projections[1]!.provider,
        projectionDigest: projections[1]!.projectionDigest,
        outcome: "passed",
        factDigest: digest("mtf1_", "d"),
      }],
    })),
  ];
  const policy = mustPromotion(createLifecyclePolicy({
    schemaVersion: 1,
    policyIdentity: "personal-main-policy-v1",
    repositoryIdentity: REPOSITORY,
    contentAuthority: CONTENT_AUTHORITY,
    canonicalRef: MAIN_REF,
    releaseInputPath: RELEASE_INPUT_PATH,
    requestRoot: "docs/lifecycle/requests",
    acceptanceRoot: ACCEPTANCE_ROOT,
    promotionRoot: PROMOTION_ROOT,
    currentMainPath: CURRENT_MAIN_PATH,
    issuerIdentity: "independent-evaluator",
    issuerProtocol: INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
    issuerSchemaProtocol: "acceptance-schema/v1",
    cleanTaskNamespace: "acceptance",
    humanApproverIdentity: "repository-owner",
  }));
  const request = mustPromotion(createAcceptanceRequest({
    schemaVersion: 2,
    repositoryIdentity: REPOSITORY,
    contentAuthority: CONTENT_AUTHORITY,
    policyIdentity: policy.body.policyIdentity,
    releaseSetDigest,
    releaseInputObject: sourceInputObject,
    hostedApproval: { provider: "github", pullRequest: 42 },
    projections: [projections[0], projections[1]],
    evidence: [handles[1], handles[0]],
    evaluationProfile: "fresh-agent-v1",
    freshAgentTarget: targets[0],
    acceptancePath: ACCEPTANCE_PATH,
  }));
  const acceptance = mustPromotion(createAcceptanceEvidence({
    schemaVersion: 1,
    requestDigest: request.requestDigest,
    requestPath: REQUEST_PATH,
    outcome: "accepted",
    issuerIdentity: policy.body.issuerIdentity,
    issuerProtocol: INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
    issuerSchemaProtocol: policy.body.issuerSchemaProtocol,
    issuerTask: { taskId: "acceptance/task-001", context: "clean", forkedFrom: null },
    issuedAt: "2026-07-16T18:00:00.000Z",
    issuerImplementationIdentity: "codex-0.144.5",
    policyIdentity: policy.body.policyIdentity,
  }));
  const policyObject = pointer({ ref: MAIN_REF, commit: RECORD_COMMIT, tree: RECORD_TREE, path: LIFECYCLE_POLICY_PATH, blob: oid("b") });
  const requestObject = pointer({ ref: FEATURE_REF, commit: SOURCE_COMMIT, tree: SOURCE_TREE, path: REQUEST_PATH, blob: oid("c") });
  const acceptanceObject = pointer({ ref: FEATURE_REF, commit: SOURCE_COMMIT, tree: SOURCE_TREE, path: ACCEPTANCE_PATH, blob: oid("d") });
  const promotion = mustPromotion(createPromotionAttestation({
    schemaVersion: 1,
    policyIdentity: policy.body.policyIdentity,
    acceptanceRequestDigest: request.requestDigest,
    acceptanceEvidenceDigest: acceptance.acceptanceDigest,
    releaseSetDigest,
    acceptedInput: { object: sourceInputObject, releaseInputDigest: releaseInput.releaseInputDigest },
    landedInput: { object: landedInputObject, releaseInputDigest: releaseInput.releaseInputDigest },
    projections,
    equivalence: "equivalent",
  }));
  const promotionObject = pointer({ ref: MAIN_REF, commit: RECORD_COMMIT, tree: RECORD_TREE, path: PROMOTION_PATH, blob: oid("e") });
  const currentMain = mustPromotion(createCurrentMainRecord({
    schemaVersion: 1,
    channel: "current-main",
    contentAuthority: CONTENT_AUTHORITY,
    policyIdentity: policy.body.policyIdentity,
    policyDigest: policy.policyDigest,
    releaseSetDigest,
    projections,
    requestObject,
    acceptanceObject,
    promotionObject,
    acceptanceRequestDigest: request.requestDigest,
    acceptanceEvidenceDigest: acceptance.acceptanceDigest,
    promotionAttestationDigest: promotion.attestationDigest,
  }));
  const currentMainObject = pointer({ ref: MAIN_REF, commit: RECORD_COMMIT, tree: RECORD_TREE, path: CURRENT_MAIN_PATH, blob: oid("f") });
  const locator = mustLocator();
  const git = new MemoryGitReader({
    kind: "Ready",
    repositoryIdentity: policyObject.repositoryIdentity,
    canonicalRef: policyObject.ref,
    headCommit: policyObject.commit,
    headTree: policyObject.tree,
  });
  git.add(sourceInputObject, releaseInputBytes);
  git.add(landedInputObject, releaseInputBytes);
  git.add(currentInputObject, releaseInputBytes);
  git.add(policyObject, canonicalSerializeLifecyclePolicy(policy));
  git.add(requestObject, canonicalSerializeAcceptanceRequest(request));
  git.add(acceptanceObject, canonicalSerializeAcceptanceEvidence(acceptance));
  git.add(promotionObject, canonicalSerializePromotionAttestation(promotion));
  git.add(currentMainObject, canonicalSerializeCurrentMainRecord(currentMain));
  git.changedPaths = [PROMOTION_PATH, CURRENT_MAIN_PATH];
  const evidenceReader = new MemoryEvidenceReader(observations);
  const approvalReader = new MemoryApprovalReader({
    provider: "github",
    selector: {
      provider: "github",
      repositoryIdentity: REPOSITORY,
      pullRequest: 42,
      revision: acceptanceObject.commit,
    },
    order: "oldest-to-newest",
    observations: [{
      recordId: 9001,
      state: "APPROVED",
      revision: acceptanceObject.commit,
      actorIdentity: "repository-owner",
    }],
  });
  return {
    locator,
    releaseInput,
    releaseInputBytes,
    sourceInputObject,
    landedInputObject,
    currentInputObject,
    policy,
    request,
    acceptance,
    promotion,
    currentMain,
    policyObject,
    requestObject,
    acceptanceObject,
    promotionObject,
    currentMainObject,
    projections,
    handles,
    observations,
    git,
    evidenceReader,
    approvalReader,
  };
}

export class MemoryGitReader implements ExactGitReader {
  readonly calls = { inspect: 0, readBlob: 0, isAncestor: 0, listChangedPaths: 0 };
  readonly inspectedRefs: string[] = [];
  inspection: RepositoryInspection;
  changedPaths: readonly string[] = [];
  ancestor = true;
  private readonly objects = new Map<string, ExactGitBlobObservation>();

  constructor(inspection: RepositoryInspection) {
    this.inspection = inspection;
  }

  add(pointerValue: ExactGitBlobPointer, bytes: Uint8Array): void {
    this.objects.set(selectionKey(pointerValue), { pointer: pointerValue, bytes });
  }

  inspect = async (...[, canonicalRef]: Parameters<ExactGitReader["inspect"]>): Promise<RepositoryInspection> => {
    this.calls.inspect += 1;
    this.inspectedRefs.push(canonicalRef);
    return this.inspection;
  };

  readBlob = async (_locator: GitLocator, selection: GitBlobSelection) => {
    this.calls.readBlob += 1;
    const observation = this.objects.get(selectionKey(selection));
    return observation === undefined
      ? { ok: false as const, failure: { code: "MissingObject" as const, message: "missing fixture object" } }
      : { ok: true as const, observation };
  };

  isAncestor = async () => {
    this.calls.isAncestor += 1;
    return { ok: true as const, value: this.ancestor };
  };

  listChangedPaths = async () => {
    this.calls.listChangedPaths += 1;
    return { ok: true as const, paths: this.changedPaths as readonly import("../../../src/service/shared/release").ReleaseRelativePath[] };
  };
}

export class MemoryEvidenceReader implements MechanicalEvidenceReader {
  calls = 0;
  private readonly observations: Map<string, MechanicalEvidenceObservation>;

  constructor(observations: readonly MechanicalEvidenceObservation[]) {
    this.observations = new Map(observations.map((value) => [value.handle.digest, value]));
  }

  read = async (handle: MechanicalEvidenceHandle) => {
    this.calls += 1;
    const observation = this.observations.get(handle.digest);
    return observation === undefined
      ? { ok: false as const, failure: { code: "MissingEvidence" as const, message: "missing fixture evidence" } }
      : { ok: true as const, observation };
  };
}

export class MemoryApprovalReader implements HostedApprovalHistoryReader {
  calls = 0;
  queries: HostedApprovalHistoryQuery[] = [];
  history: HostedApprovalHistory | undefined;

  constructor(history: HostedApprovalHistory | undefined) {
    this.history = history;
  }

  read = async (query: HostedApprovalHistoryQuery) => {
    this.calls += 1;
    this.queries.push(query);
    return this.history === undefined
      ? { ok: false as const, failure: { code: "UnavailableApproval" as const, message: "missing fixture approval history" } }
      : { ok: true as const, history: this.history };
  };
}

export function governedObservation(fixture: PromotionFixture): GovernedAcceptanceObservation {
  const history = fixture.approvalReader.history;
  const review = history?.observations[0];
  if (history === undefined || review === undefined) throw new Error("Fixture approval missing");
  const recordId = mustCanonicalId(`github-review-${review.recordId}`);
  const approverIdentity = mustCanonicalId(review.actorIdentity);
  const approval: HostedApprovalObservation = {
    provider: "github",
    pullRequest: history.selector.pullRequest,
    recordId,
    object: fixture.acceptanceObject,
    approverIdentity,
    decision: "approved",
    outcome: "accepted",
  };
  return {
    policy: fixture.policy,
    request: fixture.request,
    evidence: fixture.acceptance,
    policyObject: fixture.policyObject,
    requestObject: fixture.requestObject,
    acceptanceObject: fixture.acceptanceObject,
    approval,
  };
}

export function releaseInputFixture(payloadText: string): AgentPluginReleaseInput {
  const payload = mustRelease(createAgentPluginPayload([
    { path: "skills/alpha/SKILL.md", mode: 0o644, bytes: encoder.encode(payloadText) },
  ]));
  return mustRelease(createAgentPluginReleaseInput({
    schemaVersion: 1,
    contentAuthority: CONTENT_AUTHORITY,
    members: [{
      kind: "agent-plugin",
      pluginId: "alpha",
      skillInventory: [{ identity: "alpha-skill", manifestPath: "skills/alpha/SKILL.md" }],
      payload: {
        protocolVersion: payload.protocolVersion,
        manifest: payload.manifest,
        payloadDigest: payload.payloadDigest,
      },
      vendor: [{ id: "vendor-alpha", protocol: "vendor-v1", contentDigest: contentDigest(encoder.encode("vendor\n")) }],
      curation: [{ id: "curation-alpha", protocol: "curation-v1", contentDigest: contentDigest(encoder.encode("curation\n")) }],
    }],
    ownershipClaims: [
      { kind: "skill", identity: "alpha-skill", ownerPluginId: "alpha" },
      { kind: "provider-identity", identity: "codex:alpha", ownerPluginId: "alpha" },
    ],
    locks: [{ id: "vendor-lock", protocol: "vendor-lock-v1", contentDigest: contentDigest(encoder.encode("lock\n")) }],
    qualityPolicies: [{ id: "quality-policy", protocol: "quality-v1", contentDigest: contentDigest(encoder.encode("quality\n")) }],
  }));
}

export function pointer(input: {
  readonly ref: string;
  readonly commit: string;
  readonly tree: string;
  readonly path: string;
  readonly blob: string;
}): ExactGitBlobPointer {
  return mustPromotion(createExactGitBlobPointer({ repositoryIdentity: REPOSITORY, ...input }));
}

export function digest(prefix: string, character: string): string {
  return `${prefix}${character.repeat(64)}`;
}

export function oid(character: string): string {
  return character.repeat(40);
}

export function mustPromotion<T>(result: PromotionResult<T>): T {
  if (!result.ok) throw new Error(`Expected promotion result success: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function mustRelease<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok) throw new Error(`Expected release result success: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function mustLocator(): GitLocator {
  const source = pointer({ ref: MAIN_REF, commit: RECORD_COMMIT, tree: RECORD_TREE, path: LIFECYCLE_POLICY_PATH, blob: oid("0") });
  return { workspacePath: "/tmp/personal-rawr-hq", expectedRepositoryIdentity: source.repositoryIdentity };
}

function mustCanonicalId(value: string): HostedApprovalObservation["recordId"] {
  const binding = mustPromotion(createProviderAcceptanceBinding({
    provider: "codex",
    projectionDigest: digest("ap1_", "1"),
    adapterProtocol: value,
    capabilityProfileDigest: digest("cp1_", "2"),
  }));
  return binding.adapterProtocol;
}

function selectionKey(selection: GitBlobSelection): string {
  return [
    selection.repositoryIdentity,
    selection.ref,
    selection.commit,
    selection.tree,
    selection.path,
  ].join("\u0000");
}

import { describe, expect, it } from "vitest";

import {
  INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
  canonicalSerializeAcceptanceEvidence,
  createAcceptanceEvidence,
  createMechanicalEvidenceObservation,
  type ValidateGovernedAcceptanceInput,
} from "../../../src/service/modules/governance/model";
import type {
  GovernanceLifecycleRuntime,
  HostedApprovalHistory,
} from "../../../src/service/modules/governance/ports";
import { createLifecycleTestClient, testInvocation } from "../../support/client";
import {
  MemoryApprovalReader,
  MemoryEvidenceReader,
  mustPromotion,
  oid,
  pointer,
  promotionFixture,
} from "./fixtures";

describe("governed acceptance (B12)", () => {
  it("admits accepted evidence only after exact Git, immutable evidence, and human approval reads", async () => {
    const fixture = promotionFixture();
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals: fixture.approvalReader,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result.kind).toBe("GovernedAccepted");
    expect(fixture.git.calls).toEqual({ inspect: 1, readBlob: 3, isAncestor: 0, listChangedPaths: 0 });
    expect(fixture.evidenceReader.calls).toBe(2);
    expect(fixture.approvalReader.calls).toBe(1);
    expect(fixture.approvalReader.queries).toEqual([{
      provider: "github",
      repositoryIdentity: fixture.request.body.repositoryIdentity,
      pullRequest: 42,
      revision: fixture.acceptanceObject.commit,
    }]);
    expect(result).toMatchObject({
      kind: "GovernedAccepted",
      observation: {
        approval: {
          provider: "github",
          pullRequest: 42,
          recordId: "github-review-9001",
          object: fixture.acceptanceObject,
        },
      },
    });
  });

  it("blocks schema-valid self-issued accepted evidence before evidence or approval reads", async () => {
    const fixture = promotionFixture();
    const selfIssued = mustPromotion(createAcceptanceEvidence({
      ...fixture.acceptance.body,
      issuerIdentity: "ordinary-worker",
      issuerProtocol: INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
    }));
    const selfIssuedObject = pointer({
      ref: fixture.acceptanceObject.ref,
      commit: fixture.acceptanceObject.commit,
      tree: fixture.acceptanceObject.tree,
      path: fixture.acceptanceObject.path,
      blob: oid("7"),
    });
    fixture.git.add(selfIssuedObject, canonicalSerializeAcceptanceEvidence(selfIssued));
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals: fixture.approvalReader,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: selfIssuedObject,
    });

    expect(result).toMatchObject({
      kind: "BlockedAcceptanceAuthority",
      code: "BLOCKED_ACCEPTANCE_AUTHORITY",
    });
    expect(fixture.evidenceReader.calls).toBe(0);
    expect(fixture.approvalReader.calls).toBe(0);
  });

  it("does not confuse a correct policy approver name with an actual hosted approval", async () => {
    const fixture = promotionFixture();
    const approvals = new MemoryApprovalReader(undefined);
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result).toMatchObject({
      kind: "BlockedAcceptanceAuthority",
      code: "BLOCKED_ACCEPTANCE_AUTHORITY",
    });
    expect(approvals.calls).toBe(1);
  });

  it("blocks mechanically valid history that echoes another governed selector", async () => {
    const fixture = promotionFixture();
    const history = fixture.approvalReader.history;
    if (history === undefined) throw new Error("Expected fixture approval history");
    const approvals = new MemoryApprovalReader({
      ...history,
      selector: { ...history.selector, pullRequest: 43 },
    });
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result).toMatchObject({
      kind: "BlockedAcceptanceAuthority",
      code: "BLOCKED_ACCEPTANCE_AUTHORITY",
    });
  });

  it("blocks when the latest policy-named authority review revokes an earlier exact approval", async () => {
    const fixture = promotionFixture();
    const history = fixture.approvalReader.history;
    if (history === undefined) throw new Error("Expected fixture approval history");
    const approvals = new MemoryApprovalReader({
      ...history,
      observations: [
        ...history.observations,
        {
          recordId: 9002,
          state: "CHANGES_REQUESTED",
          revision: fixture.acceptanceObject.commit,
          actorIdentity: fixture.policy.body.humanApproverIdentity,
        },
      ],
    });
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result).toMatchObject({
      kind: "BlockedAcceptanceAuthority",
      reason: expect.stringContaining("latest policy-named authority review"),
    });
  });

  it("blocks review history that does not attest oldest-to-newest ordering", async () => {
    const fixture = promotionFixture();
    const history = fixture.approvalReader.history;
    if (history === undefined) throw new Error("Expected fixture approval history");
    fixture.approvalReader.history = {
      ...history,
      order: "newest-to-oldest",
      observations: [...history.observations].reverse(),
    } as unknown as HostedApprovalHistory;
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals: fixture.approvalReader,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result).toMatchObject({
      kind: "BlockedAcceptanceAuthority",
      reason: expect.stringContaining("oldest-to-newest"),
    });
  });

  it("blocks when the latest policy-named approval names another revision", async () => {
    const fixture = promotionFixture();
    const history = fixture.approvalReader.history;
    if (history === undefined) throw new Error("Expected fixture approval history");
    fixture.approvalReader.history = {
      ...history,
      observations: [
        ...history.observations,
        {
          recordId: 9002,
          state: "APPROVED",
          revision: oid("8"),
          actorIdentity: fixture.policy.body.humanApproverIdentity,
        },
      ],
    };
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals: fixture.approvalReader,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result).toMatchObject({
      kind: "BlockedAcceptanceAuthority",
      reason: expect.stringContaining("exact acceptance revision"),
    });
  });

  it("retains an exact approval across later non-authority review rows", async () => {
    const fixture = promotionFixture();
    const history = fixture.approvalReader.history;
    if (history === undefined) throw new Error("Expected fixture approval history");
    fixture.approvalReader.history = {
      ...history,
      observations: [
        ...history.observations,
        {
          recordId: 9002,
          state: "COMMENTED",
          revision: oid("8"),
          actorIdentity: fixture.policy.body.humanApproverIdentity,
        },
      ],
    };
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals: fixture.approvalReader,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result.kind).toBe("GovernedAccepted");
  });

  it("blocks duplicate review identities instead of selecting by array position", async () => {
    const fixture = promotionFixture();
    const history = fixture.approvalReader.history;
    const review = history?.observations[0];
    if (history === undefined || review === undefined) throw new Error("Expected fixture approval history");
    fixture.approvalReader.history = {
      ...history,
      observations: [review, { ...review, state: "COMMENTED" }],
    };
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals: fixture.approvalReader,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result).toMatchObject({
      kind: "BlockedAcceptanceAuthority",
      reason: expect.stringContaining("duplicate review observation"),
    });
  });

  it("rejects failed or mismatched mechanical evidence without creating acceptance authority", async () => {
    const fixture = promotionFixture();
    const failed = mustPromotion(createMechanicalEvidenceObservation({
      ...fixture.observations[0],
      targets: fixture.observations[0]!.targets.map((fact) => ({ ...fact, outcome: "failed" })),
    }));
    const evidence = new MemoryEvidenceReader([failed, fixture.observations[1]]);
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence,
      approvals: fixture.approvalReader,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: fixture.acceptanceObject,
    });

    expect(result).toMatchObject({
      kind: "InvalidAcceptance",
      code: "INVALID_MECHANICAL_EVIDENCE",
    });
    expect(fixture.approvalReader.calls).toBe(0);
  });

  it("returns a repository-governed rejection without consulting approval or later mutation surfaces", async () => {
    const fixture = promotionFixture();
    const rejected = mustPromotion(createAcceptanceEvidence({
      ...fixture.acceptance.body,
      outcome: "rejected",
    }));
    const rejectedObject = pointer({
      ref: fixture.acceptanceObject.ref,
      commit: fixture.acceptanceObject.commit,
      tree: fixture.acceptanceObject.tree,
      path: fixture.acceptanceObject.path,
      blob: oid("9"),
    });
    fixture.git.add(rejectedObject, canonicalSerializeAcceptanceEvidence(rejected));
    const validate = createValidateGovernedAcceptance({
      git: fixture.git,
      evidence: fixture.evidenceReader,
      approvals: fixture.approvalReader,
    });

    const result = await validate({
      locator: fixture.locator,
      policyObject: fixture.policyObject,
      requestObject: fixture.requestObject,
      acceptanceObject: rejectedObject,
    });

    expect(result.kind).toBe("RejectedAcceptance");
    expect(fixture.evidenceReader.calls).toBe(0);
    expect(fixture.approvalReader.calls).toBe(0);
  });
});

function createValidateGovernedAcceptance(runtime: GovernanceLifecycleRuntime) {
  const client = createLifecycleTestClient({ governance: runtime });
  return (request: ValidateGovernedAcceptanceInput) =>
    client.governance.validateAcceptance(request, testInvocation);
}

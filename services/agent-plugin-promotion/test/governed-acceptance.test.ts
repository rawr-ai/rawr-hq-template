import { describe, expect, it } from "vitest";

import {
  INDEPENDENT_ACCEPTANCE_ISSUER_PROTOCOL,
  canonicalSerializeAcceptanceEvidence,
  createAcceptanceEvidence,
  createMechanicalEvidenceObservation,
  createValidateGovernedAcceptance,
} from "../src/index";
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

  it("blocks approval from the right human when it names another exact object", async () => {
    const fixture = promotionFixture();
    const approval = fixture.approvalReader.observation;
    if (approval === undefined) throw new Error("Expected fixture approval");
    const approvals = new MemoryApprovalReader({
      ...approval,
      object: pointer({
        ref: approval.object.ref,
        commit: approval.object.commit,
        tree: approval.object.tree,
        path: approval.object.path,
        blob: oid("8"),
      }),
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

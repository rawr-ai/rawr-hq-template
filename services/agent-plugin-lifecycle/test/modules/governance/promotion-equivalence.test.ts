import { canonicalSerializeAgentPluginReleaseInput } from "../../../src/service/shared/release";
import { describe, expect, it } from "vitest";

import { createLifecycleTestClient, testInvocation } from "../../support/client";
import {
  oid,
  pointer,
  promotionFixture,
  releaseInputFixture,
} from "./fixtures";

describe("release-input-equivalence promotion (B13)", () => {
  it("attests a squash-equivalent landing without rebuilding or changing accepted provenance", async () => {
    const fixture = promotionFixture();
    fixture.git.inspection = {
      kind: "Ready",
      repositoryIdentity: fixture.landedInputObject.repositoryIdentity,
      canonicalRef: fixture.landedInputObject.ref,
      headCommit: fixture.landedInputObject.commit,
      headTree: fixture.landedInputObject.tree,
    };
    const result = await attest(fixture, fixture.landedInputObject);

    expect(result.kind).toBe("PromotionAttested");
    if (result.kind === "PromotionAttested") {
      expect(result.attestation.body.acceptedInput.object.commit).toBe(fixture.sourceInputObject.commit);
      expect(result.attestation.body.landedInput.object.commit).toBe(fixture.landedInputObject.commit);
      expect(result.attestation.body.acceptedInput.releaseInputDigest).toBe(
        result.attestation.body.landedInput.releaseInputDigest,
      );
      expect(result.attestation.body.releaseSetDigest).toBe(fixture.request.body.releaseSetDigest);
    }
    expect(fixture.git.calls).toEqual({ inspect: 2, readBlob: 5, isAncestor: 0, listChangedPaths: 0 });
  });

  it("rejects one changed canonical release-input byte instead of rebuilding", async () => {
    const fixture = promotionFixture();
    const changed = releaseInputFixture("changed-alpha\n");
    const changedObject = pointer({
      ref: fixture.landedInputObject.ref,
      commit: fixture.landedInputObject.commit,
      tree: fixture.landedInputObject.tree,
      path: fixture.landedInputObject.path,
      blob: oid("3"),
    });
    fixture.git.add(changedObject, canonicalSerializeAgentPluginReleaseInput(changed));
    fixture.git.inspection = {
      kind: "Ready",
      repositoryIdentity: changedObject.repositoryIdentity,
      canonicalRef: changedObject.ref,
      headCommit: changedObject.commit,
      headTree: changedObject.tree,
    };
    const result = await attest(fixture, changedObject);

    expect(result.kind).toBe("ReleaseInputChanged");
    if (result.kind === "ReleaseInputChanged") {
      expect(result.acceptedDigest).not.toBe(result.landedDigest);
    }
    expect(fixture.git.calls.readBlob).toBe(5);
  });

  it.each([
    ["DirtyRepository", { kind: "DirtyRepository" }],
    ["WrongRepository", { kind: "WrongRepository", actualRepositoryIdentity: "git:github.com/example/other" }],
    ["UnreachableRepository", { kind: "UnreachableRepository", reason: "offline" }],
  ] as const)("blocks %s before any release-input read", async (_label, inspection) => {
    const fixture = promotionFixture();
    fixture.git.inspection = inspection;
    const result = await attest(fixture, fixture.landedInputObject);

    expect(result.kind).toBe("BlockedAcceptanceAuthority");
    expect(fixture.git.calls.readBlob).toBe(3);
  });
});

function attest(
  fixture: ReturnType<typeof promotionFixture>,
  landedReleaseInputObject: ReturnType<typeof pointer>,
) {
  const client = createLifecycleTestClient({ governance: {
    git: fixture.git,
    evidence: fixture.evidenceReader,
    approvals: fixture.approvalReader,
  } });
  return client.governance.attestPromotion({
    locator: fixture.locator,
    policyObject: fixture.policyObject,
    requestObject: fixture.requestObject,
    acceptanceObject: fixture.acceptanceObject,
    landedReleaseInputObject,
  }, testInvocation);
}

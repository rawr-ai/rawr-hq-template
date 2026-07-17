import { canonicalSerializeAgentPluginReleaseInput } from "../../../src/service/shared/release";
import { describe, expect, it } from "vitest";

import {
  canonicalSerializeCurrentMainRecord,
  createCurrentMainRecord,
  createResolveCurrentMain,
} from "../../../src/service/modules/governance/internal";
import {
  MAIN_REF,
  MemoryApprovalReader,
  mustPromotion,
  oid,
  pointer,
  promotionFixture,
  releaseInputFixture,
} from "./fixtures";

describe("fixed current-main resolution (B14)", () => {
  it("classifies a lifecycle-record-only landed commit as accepted pending convergence", async () => {
    const fixture = promotionFixture();
    const result = await resolve(fixture);

    expect(result.kind).toBe("ACCEPTED_PENDING_CONVERGENCE");
    expect(fixture.git.inspectedRefs).toEqual([MAIN_REF, MAIN_REF]);
    expect(fixture.git.calls.isAncestor).toBe(1);
    expect(fixture.git.calls.listChangedPaths).toBe(1);
  });

  it("classifies equivalent current input with ordinary later tree changes as current eligible", async () => {
    const fixture = promotionFixture();
    fixture.git.changedPaths = ["README.md"];
    const result = await resolve(fixture);

    expect(result.kind).toBe("CURRENT_ELIGIBLE");
  });

  it("distinguishes content ahead of acceptance without rebuilding", async () => {
    const fixture = promotionFixture();
    const changed = releaseInputFixture("content-ahead\n");
    const changedObject = pointer({
      ref: fixture.currentInputObject.ref,
      commit: fixture.currentInputObject.commit,
      tree: fixture.currentInputObject.tree,
      path: fixture.currentInputObject.path,
      blob: oid("1"),
    });
    fixture.git.add(changedObject, canonicalSerializeAgentPluginReleaseInput(changed));

    const result = await resolve(fixture);

    expect(result.kind).toBe("CONTENT_AHEAD_OF_ACCEPTANCE");
    expect(fixture.git.calls.listChangedPaths).toBe(0);
  });

  it("classifies missing transitive promotion bytes as stale", async () => {
    const fixture = promotionFixture();
    const missingPromotion = pointer({
      ref: MAIN_REF,
      commit: oid("4"),
      tree: oid("5"),
      path: fixture.promotionObject.path,
      blob: oid("2"),
    });
    const stale = mustPromotion(createCurrentMainRecord({
      ...fixture.currentMain.body,
      promotionObject: missingPromotion,
    }));
    fixture.git.add(fixture.currentMainObject, canonicalSerializeCurrentMainRecord(stale));

    const result = await resolve(fixture);

    expect(result.kind).toBe("STALE_RECORD");
  });

  it("classifies an unreachable external promotion attestation as forged", async () => {
    const fixture = promotionFixture();
    fixture.git.ancestor = false;
    const result = await resolve(fixture);

    expect(result.kind).toBe("FORGED_RECORD");
  });

  it("blocks a valid-looking channel when hosted acceptance authority is unavailable", async () => {
    const fixture = promotionFixture();
    fixture.approvalReader.observation = undefined;
    const result = await resolve(fixture);

    expect(result.kind).toBe("BLOCKED_ACCEPTANCE_AUTHORITY");
  });

  it("classifies altered current-main bytes as forged", async () => {
    const fixture = promotionFixture();
    const bytes = canonicalSerializeCurrentMainRecord(fixture.currentMain);
    const wire = JSON.parse(new TextDecoder().decode(bytes)) as {
      body: { releaseSetDigest: string };
    };
    wire.body.releaseSetDigest = `rs1_${"0".repeat(64)}`;
    fixture.git.add(fixture.currentMainObject, new TextEncoder().encode(`${JSON.stringify(wire)}\n`));

    const result = await resolve(fixture);

    expect(result.kind).toBe("FORGED_RECORD");
  });

  it.each([
    ["DIRTY_REPOSITORY", { kind: "DirtyRepository" }],
    ["WRONG_REPOSITORY", { kind: "WrongRepository", actualRepositoryIdentity: "git:github.com/example/other" }],
    ["UNREACHABLE_REPOSITORY", { kind: "UnreachableRepository", reason: "offline" }],
  ] as const)("returns %s before record reads", async (expected, inspection) => {
    const fixture = promotionFixture();
    fixture.git.inspection = inspection;
    const result = await resolve(fixture);

    expect(result.kind).toBe(expected);
    expect(fixture.git.calls.readBlob).toBe(0);
    expect(fixture.evidenceReader.calls).toBe(0);
    expect(fixture.approvalReader.calls).toBe(0);
  });
});

async function resolve(fixture: ReturnType<typeof promotionFixture>) {
  return createResolveCurrentMain({
    git: fixture.git,
    evidence: fixture.evidenceReader,
    approvals: fixture.approvalReader,
  })({ locator: fixture.locator });
}

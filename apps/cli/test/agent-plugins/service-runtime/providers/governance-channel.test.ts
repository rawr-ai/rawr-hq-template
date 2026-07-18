import { describe, expect, it } from "vitest";

import { createGovernanceCanonicalChannelReader } from "../../../../src/lib/agent-plugins/service-runtime/providers/governance-channel";
import {
  MAIN_REF,
  promotionFixture,
} from "../../../../../../services/agent-plugin-lifecycle/test/modules/governance/fixtures";

const SCOPE = Object.freeze({
  controllerIdentity: "controller:test",
  controllerDataRootIdentity: "controller-data:test",
});

describe("governance-backed canonical provider channel", () => {
  it("traverses the governance oRPC procedure before translating accepted authority", async () => {
    const fixture = promotionFixture();
    const channel = createGovernanceCanonicalChannelReader({
      governance: {
        git: fixture.git,
        evidence: fixture.evidenceReader,
        approvals: fixture.approvalReader,
      },
      operation: "providers.canonicalStatus",
      scope: SCOPE,
    });

    const result = await channel.resolve({
      repositoryIdentity: fixture.locator.expectedRepositoryIdentity,
      workspaceRoot: fixture.locator.workspacePath,
    } as Parameters<typeof channel.resolve>[0]);

    expect(result).toMatchObject({
      ok: true,
      value: {
        kind: "accepted-pending-convergence",
        releaseSet: {
          kind: "complete-set",
          releaseSetDigest: fixture.currentMain.body.releaseSetDigest,
        },
      },
    });
    expect(fixture.git.inspectedRefs).toEqual([MAIN_REF, MAIN_REF]);
    expect(fixture.evidenceReader.calls).toBeGreaterThan(0);
    expect(fixture.approvalReader.calls).toBeGreaterThan(0);
  });

  it("preserves a governance authority refusal without touching provider state", async () => {
    const fixture = promotionFixture();
    fixture.approvalReader.history = undefined;
    const channel = createGovernanceCanonicalChannelReader({
      governance: {
        git: fixture.git,
        evidence: fixture.evidenceReader,
        approvals: fixture.approvalReader,
      },
      operation: "providers.canonicalStatus",
      scope: SCOPE,
    });

    await expect(channel.resolve({
      repositoryIdentity: fixture.locator.expectedRepositoryIdentity,
      workspaceRoot: fixture.locator.workspacePath,
    } as Parameters<typeof channel.resolve>[0])).resolves.toEqual({
      ok: true,
      value: { kind: "blocked-acceptance-authority" },
    });
  });
});

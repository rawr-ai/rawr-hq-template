import { describe, expect, it } from "vitest";

import { parseCanonicalStatusRequest } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { createGovernanceCanonicalChannelReader } from "../../../../src/lib/agent-plugins/service-runtime/providers/governance-channel";
import {
  MAIN_REF,
  promotionFixture,
} from "../../../../../../services/agent-plugin-lifecycle/test/modules/governance/fixtures";

describe("governance-backed canonical provider channel", () => {
  it("translates accepted authority through the governance-owned resolver", async () => {
    const fixture = promotionFixture();
    const channel = createGovernanceCanonicalChannelReader({
      governance: {
        git: fixture.git,
        evidence: fixture.evidenceReader,
        approvals: fixture.approvalReader,
      },
    });

    const result = await channel.resolve(currentMainLocator(fixture));

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
    });

    await expect(channel.resolve(currentMainLocator(fixture))).resolves.toEqual({
      ok: true,
      value: { kind: "blocked-acceptance-authority" },
    });
  });
});

function currentMainLocator(fixture: ReturnType<typeof promotionFixture>) {
  const parsed = parseCanonicalStatusRequest({
    kind: "canonical-status",
    channel: "current-main",
    locator: {
      repositoryIdentity: fixture.locator.expectedRepositoryIdentity,
      workspaceRoot: fixture.locator.workspacePath,
    },
    targets: [{ provider: "codex", home: "/tmp/codex-home" }],
  });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error("Expected a valid canonical-status locator fixture");
  return parsed.value.locator;
}

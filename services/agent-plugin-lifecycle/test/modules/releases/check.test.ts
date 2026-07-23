import { makeNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { afterEach, describe, expect, it } from "vitest";

import { createLifecycleTestClient, testInvocation } from "../../support/client";
import {
  createGeneratedMultiMemberGitRepository,
  GIT_EXECUTABLE,
} from "../../support/git-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../support/owned-fixture-root";

describe("release check", () => {
  let root: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (root !== undefined) await disposeOwnedFixtureRoot(root);
    root = undefined;
  });

  it("derives deterministic targeted and complete-set facts without durable lifecycle state", async () => {
    root = await createOwnedFixtureRoot();
    const repository = await createGeneratedMultiMemberGitRepository(root);
    const client = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspacePort({ gitExecutable: GIT_EXECUTABLE }),
    });

    const targetedRequest = {
      contentWorkspace: repository.policy,
      mode: { kind: "targeted" as const, pluginId: repository.pluginIds[0]! },
    };
    const firstTargeted = await client.releases.check(targetedRequest, testInvocation);
    const repeatedTargeted = await client.releases.check(targetedRequest, testInvocation);
    const complete = await client.releases.check(
      {
        contentWorkspace: repository.policy,
        mode: { kind: "complete-set" },
      },
      testInvocation
    );

    expect(repeatedTargeted).toEqual(firstTargeted);
    expect(firstTargeted).toMatchObject({
      kind: "EligibleReport",
      derivation: {
        kind: "release",
        pluginId: repository.pluginIds[0],
        releaseDigest: expect.stringMatching(/^rd1_[0-9a-f]{64}$/u),
        artifactDigest: expect.stringMatching(/^ad1_[0-9a-f]{64}$/u),
      },
      eligibilityBinding: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    expect(complete).toMatchObject({
      kind: "EligibleReport",
      derivation: {
        kind: "complete-set",
        releaseSetDigest: expect.stringMatching(/^rs1_[0-9a-f]{64}$/u),
        members: repository.pluginIds.map((pluginId) => ({ pluginId })),
      },
      eligibilityBinding: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
  });
});

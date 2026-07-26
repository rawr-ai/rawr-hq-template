import { symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@rawr/resource-content-workspace";
import { makeNodeContentWorkspaceResource } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../support/client";
import {
  createGeneratedGitRepository,
  type GeneratedGitRepository,
  GIT_EXECUTABLE,
  git,
  unsafeFixturePolicy,
} from "../../support/git-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../support/owned-fixture-root";

describe("public release Git eligibility", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await disposeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("distinguishes tracked and untracked consumed-path state", async () => {
    fixture = await createOwnedFixtureRoot();
    const tracked = await createGeneratedGitRepository(fixture);
    const trackedClient = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE }),
    });
    await writeFile(tracked.payloadFile, "changed\n");
    await expect(
      trackedClient.releases.check(
        {
          contentWorkspace: tracked.policy,
          mode: { kind: "complete-set" },
        },
        testInvocation
      )
    ).resolves.toMatchObject({
      kind: "IneligibleReport",
      issues: [
        {
          kind: "SourceEligibility",
          issue: { code: "DirtyTrackedWorktree" },
        },
      ],
    });

    await disposeOwnedFixtureRoot(fixture);
    fixture = await createOwnedFixtureRoot();
    const untracked = await createGeneratedGitRepository(fixture);
    await writeFile(
      join(
        untracked.root,
        ...untracked.policy.pluginRoot.split("/"),
        untracked.pluginId,
        "extra.txt"
      ),
      "extra\n"
    );
    const untrackedClient = createLifecycleTestClient({
      contentWorkspace: makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE }),
    });
    await expect(
      untrackedClient.releases.check(
        {
          contentWorkspace: untracked.policy,
          mode: { kind: "complete-set" },
        },
        testInvocation
      )
    ).resolves.toMatchObject({
      kind: "IneligibleReport",
      issues: [
        {
          kind: "SourceEligibility",
          issue: { code: "UntrackedConsumedPath" },
        },
      ],
    });
  });

  it("reports source change when admitted bytes move between evidence captures", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const delegate = makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE });
    let captures = 0;
    const contentWorkspace: ContentWorkspaceResource<never> = Object.freeze({
      ...delegate,
      captureGitWorkspaceEvidence: (
        input: Parameters<ContentWorkspaceResource<never>["captureGitWorkspaceEvidence"]>[0]
      ) =>
        Effect.tap(delegate.captureGitWorkspaceEvidence(input), () =>
          Effect.promise(async () => {
            captures += 1;
            if (captures === 1) {
              await writeFile(repository.payloadFile, "changed between captures\n");
            }
          })
        ),
    });
    const client = createLifecycleTestClient({ contentWorkspace });

    await expect(
      client.releases.check(
        {
          contentWorkspace: repository.policy,
          mode: { kind: "complete-set" },
        },
        testInvocation
      )
    ).resolves.toMatchObject({
      kind: "IneligibleReport",
      issues: [
        {
          kind: "SourceEligibility",
          issue: { code: "SourceChanged" },
        },
      ],
    });
  });

  it.each([
    {
      name: "staged",
      code: "DirtyIndex",
      arrange: async (repository: GeneratedGitRepository) => {
        await writeFile(repository.payloadFile, "staged\n");
        await git(repository.root, ["add", repository.payloadFile]);
      },
    },
    {
      name: "ignored",
      code: "IgnoredConsumedPath",
      arrange: async (repository: GeneratedGitRepository) => {
        await writeFile(repository.ignoredFile, "ignored\n");
      },
    },
  ])("distinguishes $name consumed-path state", async ({ arrange, code }) => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    await arrange(repository);

    await expectSourceIssue(
      makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE }),
      repository.policy,
      code
    );
  });

  it.each([
    {
      name: "branch",
      mutate: async (repository: GeneratedGitRepository) => {
        await git(repository.root, ["checkout", "-b", "raced-branch"]);
      },
    },
    {
      name: "assume-unchanged index flag",
      mutate: async (repository: GeneratedGitRepository) => {
        await git(repository.root, [
          "update-index",
          "--assume-unchanged",
          memberPayloadPath(repository),
        ]);
      },
    },
    {
      name: "skip-worktree index flag",
      mutate: async (repository: GeneratedGitRepository) => {
        await git(repository.root, [
          "update-index",
          "--skip-worktree",
          memberPayloadPath(repository),
        ]);
      },
    },
  ])("rejects a late $name change", async ({ mutate }) => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const delegate = makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE });
    let captures = 0;
    const contentWorkspace: ContentWorkspaceResource<never> = Object.freeze({
      ...delegate,
      captureGitWorkspaceEvidence: (
        input: Parameters<ContentWorkspaceResource<never>["captureGitWorkspaceEvidence"]>[0]
      ) =>
        Effect.tap(delegate.captureGitWorkspaceEvidence(input), () =>
          Effect.promise(async () => {
            captures += 1;
            if (captures === 1) await mutate(repository);
          })
        ),
    });

    await expectSourceIssue(contentWorkspace, repository.policy, "SourceChanged");
    expect(captures).toBe(2);
  });

  it("distinguishes wrong repository, ref, tree, and aliased locator policy", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const contentWorkspace = makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE });

    await expectSourceIssue(
      contentWorkspace,
      {
        ...repository.policy,
        remoteUrl: "https://example.invalid/different.git",
      },
      "WrongRepository"
    );
    await expectSourceIssue(
      contentWorkspace,
      {
        ...repository.policy,
        refName: "refs/heads/different",
      },
      "WrongRef"
    );
    await expectSourceIssue(
      contentWorkspace,
      {
        ...repository.policy,
        sourceTree: mutateObjectId(repository.policy.sourceTree),
      },
      "WrongTree"
    );

    const alias = join(fixture.path, "repository-alias");
    await symlink(repository.root, alias);
    await expectSourceIssue(
      contentWorkspace,
      {
        ...repository.policy,
        locator: alias,
      },
      "AliasedLocator"
    );
  });

  it("rejects malformed clean tree facts through the public operation", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    const delegate = makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE });
    const unsupported: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "read-git-tree",
      reason: "UnsupportedEntry",
      path: `${repository.policy.pluginRoot}/link`,
      detail: "Git tree contains a non-regular entry",
    };
    const cases: readonly ContentWorkspaceResource<never>[] = [
      Object.freeze({
        ...delegate,
        readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
          Effect.map(delegate.readGitTree(input), (entries) => {
            const first = entries[0];
            if (first === undefined) throw new Error("Expected a clean tree fixture entry");
            return Object.freeze([...entries, first]);
          }),
      }),
      Object.freeze({
        ...delegate,
        readGitTree: () => Effect.fail(unsupported),
      }),
    ];

    for (const contentWorkspace of cases) {
      await expectSourceIssue(contentWorkspace, repository.policy, "InvalidTree");
    }
  });

  it("does not let assume-unchanged state hide modified admitted bytes", async () => {
    fixture = await createOwnedFixtureRoot();
    const repository = await createGeneratedGitRepository(fixture);
    await git(repository.root, [
      "update-index",
      "--assume-unchanged",
      memberPayloadPath(repository),
    ]);
    await writeFile(repository.payloadFile, "hidden modification\n");

    await expectSourceIssue(
      makeNodeContentWorkspaceResource({ gitExecutable: GIT_EXECUTABLE }),
      repository.policy,
      "DirtyIndex"
    );
  });

  it("rejects invalid source policy before content I/O", async () => {
    let inspections = 0;
    const client = createLifecycleTestClient({
      contentWorkspace: {
        ...unavailableContentWorkspace(),
        inspectGitWorkspace: () =>
          Effect.sync(() => {
            inspections += 1;
            throw new Error("Invalid policy reached content I/O");
          }),
      },
    });
    const invalidPolicies = [
      unsafeFixturePolicy({ remoteName: "--origin" }),
      unsafeFixturePolicy({ refName: "--help" }),
      unsafeFixturePolicy({ releaseInputPath: "../release.json" }),
    ];

    for (const contentWorkspace of invalidPolicies) {
      await expect(
        client.releases.check(
          {
            contentWorkspace,
            mode: { kind: "complete-set" },
          },
          testInvocation
        )
      ).rejects.toBeDefined();
    }
    expect(inspections).toBe(0);
  });
});

async function expectSourceIssue(
  contentWorkspace: ContentWorkspaceResource<never>,
  policy: GeneratedGitRepository["policy"],
  code: string
): Promise<void> {
  const client = createLifecycleTestClient({ contentWorkspace });
  await expect(
    client.releases.check(
      {
        contentWorkspace: policy,
        mode: { kind: "complete-set" },
      },
      testInvocation
    )
  ).resolves.toMatchObject({
    kind: "IneligibleReport",
    issues: [
      {
        kind: "SourceEligibility",
        issue: { code },
      },
    ],
  });
}

function memberPayloadPath(repository: GeneratedGitRepository): string {
  return `${repository.policy.pluginRoot}/${repository.pluginId}/skills/example/SKILL.md`;
}

function mutateObjectId<Value extends string>(value: Value): Value {
  const final = value.at(-1) === "0" ? "1" : "0";
  return `${value.slice(0, -1)}${final}` as Value;
}

import { chmod, realpath, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  parseGitTreeId,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  createResourceContentWorkspaceSnapshotReader,
  type ResourceContentWorkspaceSnapshotReadPort,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
import type { Deps } from "@rawr/agent-plugin-lifecycle/client";
import { makeNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";

import {
  GIT_EXECUTABLE,
  createGeneratedGitRepository,
  git,
  installCaseCollisionCommit,
  unsafeFixturePolicy,
} from "./fixtures/git-repository";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./owned-fixture-root";

type ContentWorkspaceSnapshotReader = Deps["releaseSource"];

describe("exact Git-object eligibility", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("reads a clean generated repository from Git objects and revalidates the exact binding", async () => {
    const repository = await generated();
    const reader = await realReader();
    const inspected = await reader.inspect(repository.policy);
    expect(inspected.kind).toBe("Eligible");
    if (inspected.kind !== "Eligible") return;
    expect(inspected.snapshot.payloads).toHaveLength(1);
    expect(inspected.snapshot.payloads[0]?.pluginId).toBe(repository.pluginId);
    expect(inspected.snapshot.objectBindings.map((entry) => entry.path)).toEqual([
      ".rawr/release-input.json",
      `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`,
    ]);
    await expect(reader.revalidate(repository.policy, inspected.snapshot.eligibilityBinding)).resolves.toMatchObject({
      kind: "Eligible",
    });
  });

  it("uses only the exact Git resource port and never requests worktree file reads", async () => {
    const repository = await generated();
    const delegate = await realPort();
    const observed: string[] = [];
    const blobReadLimits: number[] = [];
    const contentWorkspace = overrideGitReadPort(delegate, {
      async inspectGitWorkspace(input) {
        observed.push("inspectGitWorkspace");
        return await delegate.inspectGitWorkspace(input);
      },
      async readGitTree(input) {
        observed.push("readGitTree");
        return await delegate.readGitTree(input);
      },
      async readGitBlob(input) {
        observed.push("readGitBlob");
        blobReadLimits.push(input.maxBytes);
        return await delegate.readGitBlob(input);
      },
      async captureGitWorkspaceEvidence(input) {
        observed.push("captureGitWorkspaceEvidence");
        return await delegate.captureGitWorkspaceEvidence(input);
      },
    });

    const inspected = await createResourceContentWorkspaceSnapshotReader({ contentWorkspace }).inspect(repository.policy);

    expect(inspected.kind).toBe("Eligible");
    expect(new Set(observed)).toEqual(new Set([
      "inspectGitWorkspace",
      "readGitTree",
      "readGitBlob",
      "captureGitWorkspaceEvidence",
    ]));
    expect(blobReadLimits).toEqual([
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      MAX_PAYLOAD_BYTES_PER_MEMBER,
    ]);
  });

  it("rejects one resource capture whose opening and closing anchors disagree", async () => {
    const repository = await generated();
    const delegate = await realPort();
    let injected = false;
    const inconsistentPort = overrideGitReadPort(delegate, {
      async captureGitWorkspaceEvidence(input) {
        const evidence = await delegate.captureGitWorkspaceEvidence(input);
        if (injected) return evidence;
        injected = true;
        return Object.freeze({
          ...evidence,
          closingAnchor: Object.freeze({
            ...evidence.closingAnchor,
            tree: mutateObjectId(evidence.closingAnchor.tree),
          }),
        });
      },
    });

    await expect(createResourceContentWorkspaceSnapshotReader({
      contentWorkspace: inconsistentPort,
    }).inspect(repository.policy)).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "SourceChanged" }],
    });
    expect(injected).toBe(true);
  });

  it("rejects a payload mutation after the final repository anchor", async () => {
    const repository = await generated();
    const delegate = await realPort();
    let evidenceCaptures = 0;
    let mutated = false;
    const racingPort = overrideGitReadPort(delegate, {
      async captureGitWorkspaceEvidence(input) {
        const result = await delegate.captureGitWorkspaceEvidence(input);
        evidenceCaptures += 1;
        if (evidenceCaptures === 1) {
          mutated = true;
          await writeFile(repository.payloadFile, "mutated after final repository anchor\n");
        }
        return result;
      },
    });

    const inspected = await createResourceContentWorkspaceSnapshotReader({
      contentWorkspace: racingPort,
    }).inspect(repository.policy);

    expect(mutated).toBe(true);
    expect(inspected).toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "SourceChanged" }],
    });
  });

  it("rejects a branch switch after the final repository anchor", async () => {
    const repository = await generated();
    const delegate = await realPort();
    let evidenceCaptures = 0;
    let switched = false;
    const racingPort = overrideGitReadPort(delegate, {
      async captureGitWorkspaceEvidence(input) {
        const result = await delegate.captureGitWorkspaceEvidence(input);
        evidenceCaptures += 1;
        if (evidenceCaptures === 1) {
          switched = true;
          await git(repository.root, ["checkout", "-b", "raced-branch"]);
        }
        return result;
      },
    });

    const inspected = await createResourceContentWorkspaceSnapshotReader({
      contentWorkspace: racingPort,
    }).inspect(repository.policy);

    expect(switched).toBe(true);
    expect(inspected).toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "SourceChanged" }],
    });
  });

  it.each(["assume-unchanged", "skip-worktree"] as const)(
    "rejects a late %s transition after the final repository anchor",
    async (flag) => {
      const repository = await generated();
      const delegate = await realPort();
      const relativePayload = `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`;
      let evidenceCaptures = 0;
      let changed = false;
      const racingPort = overrideGitReadPort(delegate, {
        async captureGitWorkspaceEvidence(input) {
          const result = await delegate.captureGitWorkspaceEvidence(input);
          evidenceCaptures += 1;
          if (evidenceCaptures === 1) {
            changed = true;
            await git(repository.root, ["update-index", `--${flag}`, relativePayload]);
          }
          return result;
        },
      });

      const inspected = await createResourceContentWorkspaceSnapshotReader({
        contentWorkspace: racingPort,
      }).inspect(repository.policy);

      expect(changed).toBe(true);
      expect(inspected).toMatchObject({
        kind: "Ineligible",
        issues: [{ code: "SourceChanged" }],
      });
    },
  );

  it("distinguishes tracked, staged, untracked-consumed, and ignored-consumed state", async () => {
    const reader = await realReader();

    const tracked = await generated();
    await writeFile(tracked.payloadFile, "changed\n");
    await expect(reader.inspect(tracked.policy)).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "DirtyTrackedWorktree" }],
    });

    await removeOwnedFixtureRoot(fixture!);
    fixture = undefined;
    const staged = await generated();
    await writeFile(staged.payloadFile, "changed\n");
    await git(staged.root, ["add", staged.payloadFile]);
    await expect(reader.inspect(staged.policy)).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "DirtyIndex" }],
    });

    await removeOwnedFixtureRoot(fixture!);
    fixture = undefined;
    const untracked = await generated();
    await writeFile(join(untracked.root, "plugins", "agent", untracked.pluginId, "extra.txt"), "extra\n");
    await expect(reader.inspect(untracked.policy)).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "UntrackedConsumedPath" }],
    });

    await removeOwnedFixtureRoot(fixture!);
    fixture = undefined;
    const ignored = await generated();
    await writeFile(ignored.ignoredFile, "ignored\n");
    await expect(reader.inspect(ignored.policy)).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "IgnoredConsumedPath" }],
    });
  });

  it("rejects a changed binding and a case-colliding Git tree", async () => {
    const repository = await generated();
    const reader = await realReader();
    const inspected = await reader.inspect(repository.policy);
    expect(inspected.kind).toBe("Eligible");
    if (inspected.kind !== "Eligible") return;
    await writeFile(repository.payloadFile, "changed after snapshot\n");
    await expect(reader.revalidate(repository.policy, inspected.snapshot.eligibilityBinding)).resolves.toMatchObject({
      kind: "Ineligible",
    });

    await removeOwnedFixtureRoot(fixture!);
    fixture = undefined;
    const collision = await generated();
    const collisionPolicy = await installCaseCollisionCommit(collision);
    await expect(reader.inspect(collisionPolicy)).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "InvalidTree", detail: expect.stringContaining("collision") }],
    });
  });

  it("distinguishes wrong repository, wrong tree, wrong ref, and aliased locator policy", async () => {
    const repository = await generated();
    const reader = await realReader();
    await expect(reader.inspect({
      ...repository.policy,
      remoteUrl: "https://example.invalid/different.git",
    })).resolves.toMatchObject({ kind: "Ineligible", issues: [{ code: "WrongRepository" }] });

    const wrongTree = must(parseGitTreeId(mutateObjectId(repository.policy.sourceTree)));
    await expect(reader.inspect({ ...repository.policy, sourceTree: wrongTree })).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "WrongTree" }],
    });
    await expect(reader.inspect({ ...repository.policy, refName: "refs/heads/different" })).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "WrongRef" }],
    });

    const alias = join(fixture!.path, "repository-alias");
    await symlink(repository.root, alias);
    await expect(reader.inspect({ ...repository.policy, locator: alias })).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "AliasedLocator" }],
    });
  });

  it("does not let assume-unchanged index state hide modified worktree bytes", async () => {
    const repository = await generated();
    const relativePayload = `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`;
    await git(repository.root, ["update-index", "--assume-unchanged", relativePayload]);
    await writeFile(repository.payloadFile, "hidden modification\n");
    const reader = await realReader();
    await expect(reader.inspect(repository.policy)).resolves.toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "DirtyIndex" }],
    });
  });

  it("rejects option-like/cast policy values before invoking Git", async () => {
    let calls = 0;
    const reader = createResourceContentWorkspaceSnapshotReader({
      contentWorkspace: unreachableGitReadPort(() => { calls += 1; }),
    });
    await expect(reader.inspect(unsafeFixturePolicy({ remoteName: "--origin" }))).resolves.toMatchObject({ kind: "Ineligible" });
    await expect(reader.inspect(unsafeFixturePolicy({ refName: "--help" }))).resolves.toMatchObject({ kind: "Ineligible" });
    await expect(reader.inspect(unsafeFixturePolicy({ releaseInputPath: "../release.json" }))).resolves.toMatchObject({
      kind: "Ineligible",
    });
    expect(calls).toBe(0);
  });

  it("requires an absolute canonical non-symlink Git executable", async () => {
    fixture = await createOwnedFixtureRoot();
    const request = {
      locator: fixture.path,
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
    } as const;
    await expect(makeNodeContentWorkspacePort({ gitExecutable: "git" }).inspectGitWorkspace(request))
      .rejects.toMatchObject({ reason: "InvalidInput" });
    const alias = join(fixture.path, "git-alias");
    await symlink(await realpath(GIT_EXECUTABLE), alias);
    await expect(makeNodeContentWorkspacePort({ gitExecutable: alias }).inspectGitWorkspace(request))
      .rejects.toMatchObject({ reason: "Aliased" });
    const inert = join(fixture.path, "not-executable");
    await writeFile(inert, "not executable\n");
    await chmod(inert, 0o600);
    await expect(makeNodeContentWorkspacePort({ gitExecutable: inert }).inspectGitWorkspace(request))
      .rejects.toMatchObject({ reason: "UnsupportedEntry" });
  });

  async function generated() {
    fixture = await createOwnedFixtureRoot();
    return await createGeneratedGitRepository(fixture);
  }

  async function realReader(): Promise<ContentWorkspaceSnapshotReader> {
    return createResourceContentWorkspaceSnapshotReader({
      contentWorkspace: await realPort(),
    });
  }

  async function realPort(): Promise<ResourceContentWorkspaceSnapshotReadPort> {
    return makeNodeContentWorkspacePort({ gitExecutable: await realpath(GIT_EXECUTABLE) });
  }
});

function overrideGitReadPort(
  delegate: ResourceContentWorkspaceSnapshotReadPort,
  overrides: Partial<ResourceContentWorkspaceSnapshotReadPort>,
): ResourceContentWorkspaceSnapshotReadPort {
  return Object.freeze({ ...delegate, ...overrides });
}

function unreachableGitReadPort(onCall: () => void): ResourceContentWorkspaceSnapshotReadPort {
  const unreachable = async (): Promise<never> => {
    onCall();
    throw new Error("Git resource must remain unreachable");
  };
  return Object.freeze({
    inspectGitWorkspace: unreachable,
    readGitTree: unreachable,
    readGitBlob: unreachable,
    captureGitWorkspaceEvidence: unreachable,
  });
}

function mutateObjectId(value: string): string {
  const final = value.at(-1) === "0" ? "1" : "0";
  return `${value.slice(0, -1)}${final}`;
}

function must<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly E[] }): T {
  if (!result.ok) throw new Error(`Git fixture parse failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}

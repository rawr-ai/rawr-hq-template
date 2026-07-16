import { chmod, lstat, mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  parseGitTreeId,
} from "@rawr/agent-plugin-release";

import {
  createGitObjectSnapshotReader,
  type ContentWorkspaceSnapshotReader,
  type GitWorkspaceMetadataReader,
} from "../src/git/object-snapshot";
import { createGitCommandRunner, type GitCommandRunner } from "../src/git/process";
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

  it("uses a metadata-only filesystem port and never asks it to open payload bytes", async () => {
    const repository = await generated();
    const observed: Array<Readonly<{ operation: "lstat" | "realpath"; path: string }>> = [];
    const metadata: GitWorkspaceMetadataReader = {
      async lstat(candidate) {
        observed.push({ operation: "lstat", path: candidate });
        return await lstat(candidate, { bigint: true });
      },
      async realpath(candidate) {
        observed.push({ operation: "realpath", path: candidate });
        return await realpath(candidate);
      },
    };
    const runner = await createGitCommandRunner({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });

    const inspected = await createGitObjectSnapshotReader(runner, metadata).inspect(repository.policy);

    expect(inspected.kind).toBe("Eligible");
    expect(observed.length).toBeGreaterThan(0);
    expect(new Set(observed.map((entry) => entry.path))).toEqual(new Set([repository.root]));
    expect(observed.some((entry) => entry.operation === "lstat")).toBe(true);
    expect(observed.some((entry) => entry.operation === "realpath")).toBe(true);
  });

  it("rejects a payload mutation after the final repository anchor", async () => {
    const repository = await generated();
    const delegate = await createGitCommandRunner({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
    let treeObservations = 0;
    let mutated = false;
    const racingRunner: GitCommandRunner = {
      async run(cwd, args, limits) {
        const result = await delegate.run(cwd, args, limits);
        if (args[0] === "rev-parse" && args.at(-1) === "HEAD^{tree}") {
          treeObservations += 1;
          if (treeObservations === 5) {
            mutated = true;
            await writeFile(repository.payloadFile, "mutated after final repository anchor\n");
          }
        }
        return result;
      },
    };

    const inspected = await createGitObjectSnapshotReader(racingRunner).inspect(repository.policy);

    expect(mutated).toBe(true);
    expect(inspected).toMatchObject({
      kind: "Ineligible",
      issues: [{ code: "SourceChanged" }],
    });
  });

  it("rejects a branch switch after the final repository anchor", async () => {
    const repository = await generated();
    const delegate = await createGitCommandRunner({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
    let treeObservations = 0;
    let switched = false;
    const racingRunner: GitCommandRunner = {
      async run(cwd, args, limits) {
        const result = await delegate.run(cwd, args, limits);
        if (args[0] === "rev-parse" && args.at(-1) === "HEAD^{tree}") {
          treeObservations += 1;
          if (treeObservations === 5) {
            switched = true;
            await git(repository.root, ["checkout", "-b", "raced-branch"]);
          }
        }
        return result;
      },
    };

    const inspected = await createGitObjectSnapshotReader(racingRunner).inspect(repository.policy);

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
      const delegate = await createGitCommandRunner({
        gitExecutable: GIT_EXECUTABLE,
        pathEnvironment: "/usr/bin:/bin",
      });
      const relativePayload = `plugins/agent/${repository.pluginId}/skills/example/SKILL.md`;
      let treeObservations = 0;
      let changed = false;
      const racingRunner: GitCommandRunner = {
        async run(cwd, args, limits) {
          const result = await delegate.run(cwd, args, limits);
          if (args[0] === "rev-parse" && args.at(-1) === "HEAD^{tree}") {
            treeObservations += 1;
            if (treeObservations === 5) {
              changed = true;
              await git(repository.root, ["update-index", `--${flag}`, relativePayload]);
            }
          }
          return result;
        },
      };

      const inspected = await createGitObjectSnapshotReader(racingRunner).inspect(repository.policy);

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
    const runner: GitCommandRunner = {
      async run() {
        calls += 1;
        return { exitCode: 0, stdout: new Uint8Array(), stderr: new Uint8Array() };
      },
    };
    const reader = createGitObjectSnapshotReader(runner);
    await expect(reader.inspect(unsafeFixturePolicy({ remoteName: "--origin" }))).resolves.toMatchObject({ kind: "Ineligible" });
    await expect(reader.inspect(unsafeFixturePolicy({ refName: "--help" }))).resolves.toMatchObject({ kind: "Ineligible" });
    await expect(reader.inspect(unsafeFixturePolicy({ releaseInputPath: "../release.json" }))).resolves.toMatchObject({
      kind: "Ineligible",
    });
    expect(calls).toBe(0);
  });

  it("requires an absolute canonical non-symlink Git executable", async () => {
    fixture = await createOwnedFixtureRoot();
    await expect(createGitCommandRunner({ gitExecutable: "git" })).rejects.toThrow("absolute normalized");
    const alias = join(fixture.path, "git-alias");
    await symlink(GIT_EXECUTABLE, alias);
    await expect(createGitCommandRunner({ gitExecutable: alias })).rejects.toThrow("non-symlink");
    const inert = join(fixture.path, "not-executable");
    await writeFile(inert, "not executable\n");
    await chmod(inert, 0o600);
    await expect(createGitCommandRunner({ gitExecutable: inert })).rejects.toThrow("executable");
  });

  async function generated() {
    fixture = await createOwnedFixtureRoot();
    return await createGeneratedGitRepository(fixture);
  }

  async function realReader(): Promise<ContentWorkspaceSnapshotReader> {
    const runner = await createGitCommandRunner({
      gitExecutable: GIT_EXECUTABLE,
      pathEnvironment: "/usr/bin:/bin",
    });
    return createGitObjectSnapshotReader(runner);
  }
});

function mutateObjectId(value: string): string {
  const final = value.at(-1) === "0" ? "1" : "0";
  return `${value.slice(0, -1)}${final}`;
}

function must<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly E[] }): T {
  if (!result.ok) throw new Error(`Git fixture parse failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}

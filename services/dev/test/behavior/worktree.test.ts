import { access, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture } from "../support/service/fixture";

const fixtures: Fixture[] = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await fixture.cleanup();
});
async function setup() {
  const fixture = await createFixture();
  fixtures.push(fixture);
  return fixture;
}

describe("native worktree cleanup", () => {
  it("preserves exact spaced paths, prefix boundaries, locks and pins, then removes only eligible worktrees", async () => {
    const fixture = await setup();
    const target = await fixture.worktree("wt-owned space", "feature.dotted");
    const pinned = await fixture.worktree("wt-pinned", "pinned");
    const locked = await fixture.worktree("wt-locked", "locked");
    const unrelated = await fixture.worktree("other-wt-owned", "unrelated");
    fixture.git(["worktree", "lock", locked, "--reason", "fixture lock"]);
    const input = {
      repositoryPath: fixture.repositoryPath,
      prefix: "wt-",
      trunk: "trunk",
      pinnedBranches: ["pinned"],
    };
    const planned = await fixture.client.worktree.cleanup(input);
    expect(planned.kind).toBe("Planned");
    expect(planned.candidates).toEqual([{ path: target, branch: "feature.dotted" }]);
    expect(planned.skipped).toEqual(
      expect.arrayContaining([
        { path: pinned, reason: "pinned" },
        { path: locked, reason: "locked" },
      ])
    );
    expect(
      fixture.calls.some((call) => call.args[0] === "worktree" && call.args[1] === "remove")
    ).toBe(false);
    const applied = await fixture.client.worktree.cleanup({ ...input, apply: true });
    expect(applied.kind).toBe("Applied");
    expect(applied.removed).toEqual([target]);
    await expect(access(target)).rejects.toThrow();
    await access(pinned);
    await access(locked);
    await access(unrelated);
    expect(fixture.git(["show-ref", "--verify", "refs/heads/feature.dotted"])).toContain(
      "refs/heads/feature.dotted"
    );
    expect(
      fixture.calls.some((call) => call.args.includes("--force") || call.args.includes("prune"))
    ).toBe(false);
  });

  it("protects the physical current worktree, explicit non-main trunk and detached worktrees", async () => {
    const fixture = await setup();
    await fixture.worktree("wt-one", "one");
    const current = await fixture.client.worktree.cleanup({
      repositoryPath: fixture.repositoryPath,
      prefix: "repository",
      trunk: "trunk",
      mergedOnly: false,
      apply: true,
    });
    expect(current.kind).toBe("Refused");
    expect(current.issues.some((entry) => entry.code === "CurrentWorktreeProtected")).toBe(true);
    const fromOther = await fixture.client.worktree.cleanup({
      repositoryPath: join(fixture.root, "wt-one"),
      prefix: "repository",
      trunk: "trunk",
      mergedOnly: false,
      apply: true,
    });
    expect(fromOther.kind).toBe("Applied");
    expect(fromOther.skipped).toContainEqual({
      path: fixture.git(["rev-parse", "--show-toplevel"]).replace(/\n$/, ""),
      reason: "trunk",
    });
    const detached = join(fixture.root, "wt-detached");
    fixture.git(["worktree", "add", "--detach", detached, "HEAD"]);
    const result = await fixture.client.worktree.cleanup({
      repositoryPath: fixture.repositoryPath,
      prefix: "wt-detached",
      trunk: "trunk",
      apply: true,
      mergedOnly: false,
    });
    expect(result.skipped).toContainEqual({
      path: fixture.git(["rev-parse", "--show-toplevel"], detached).replace(/\n$/, ""),
      reason: "detached",
    });
    expect(result.removed).toEqual([]);
  });

  it("retains unmerged branches by default and stops at native removal failure without force", async () => {
    const fixture = await setup();
    const unmerged = await fixture.worktree("wt-unmerged", "unmerged");
    await writeFile(join(unmerged, "new.txt"), "new commit\n");
    fixture.git(["add", "."], unmerged);
    fixture.git(["commit", "-m", "unmerged"], unmerged);
    const planned = await fixture.client.worktree.cleanup({
      repositoryPath: fixture.repositoryPath,
      prefix: "wt-",
      trunk: "trunk",
    });
    expect(planned.skipped).toContainEqual({ path: unmerged, reason: "not-merged" });
    const dirty = await fixture.worktree("wt-a-dirty", "dirty");
    const after = await fixture.worktree("wt-b-after", "after");
    await writeFile(join(dirty, "untracked.txt"), "do not remove\n");
    const failed = await fixture.client.worktree.cleanup({
      repositoryPath: fixture.repositoryPath,
      prefix: "wt-",
      trunk: "trunk",
      apply: true,
    });
    expect(failed.kind).toBe("Failed");
    expect(failed.removed).toEqual([]);
    expect(
      failed.steps.filter((step) => step.args[1] === "remove").map((step) => step.status)
    ).toEqual(["failed", "skipped"]);
    await access(dirty);
    await access(after);
    await access(unmerged);
  });

  it.skipIf(process.platform === "win32")(
    "uses physical identities for symlinked repository and pinned path locators",
    async () => {
      const fixture = await setup();
      const target = await fixture.worktree("wt-target", "target");
      const alias = join(fixture.root, "pin-alias");
      const repositoryAlias = join(fixture.root, "repo-alias");
      await symlink(target, alias);
      await symlink(fixture.repositoryPath, repositoryAlias);
      const result = await fixture.client.worktree.cleanup({
        repositoryPath: repositoryAlias,
        prefix: "wt-",
        trunk: "trunk",
        pinnedPaths: [alias],
        apply: true,
      });
      expect(result.kind).toBe("Applied");
      expect(result.repositoryRoot).toBe(fixture.repositoryPath);
      expect(result.skipped).toContainEqual({ path: target, reason: "pinned" });
      await access(target);
    }
  );
});

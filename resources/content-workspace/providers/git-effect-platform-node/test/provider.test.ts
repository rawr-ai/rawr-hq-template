import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "bun:test";
import { FileSystem } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { Effect } from "effect";

import type { NodeContentWorkspaceResult } from "../index";
import { makeContentWorkspaceResource, runNodeContentWorkspace } from "../index";

const gitExecutable = requireExecutable("git");
const FIXTURE_PREFIX = "rawr-content-workspace-test-";
interface FixtureOwner {
  readonly parent: string;
  readonly root: string;
  readonly dev: number;
  readonly ino: number;
}
const roots: FixtureOwner[] = [];

afterEach(async () => {
  for (const owner of roots.splice(0)) await removeOwnedFixture(owner);
});

describe("Git Effect Platform content workspace provider", () => {
  test("inspects a canonical workspace and reads a bounded mechanical tree", async () => {
    const root = await createRepository();
    await mkdir(path.join(root, "payload"));
    await writeFile(path.join(root, "payload", "tool.sh"), "#!/bin/sh\necho ok\n");
    await chmod(path.join(root, "payload", "tool.sh"), 0o755);
    await git(root, "add", ".");
    await git(root, "commit", "-m", "add payload");

    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });
    const identity = unwrap(await runNodeContentWorkspace(resource.inspectWorkspace({ locator: root })));
    const entries = unwrap(await runNodeContentWorkspace(resource.readTree({
      root,
      path: "payload",
      objectFormat: identity.objectFormat,
      maxEntries: 10,
      maxBytes: 1024,
    })));

    expect(identity.root).toBe(root);
    expect(identity.refName).toBe("refs/heads/main");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.path).toBe("tool.sh");
    expect(entries[0]?.mode).toBe("100755");
    expect(entries[0]?.blob).toMatch(/^[0-9a-f]{40}$/u);
  });

  test("applies an exact ordered write plan and restores captured preimages", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "record.txt"), "before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });
    const capture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-1",
      paths: ["record.txt", "tree"],
      maxEntries: 10,
      maxBytes: 1024,
    })));

    const applied = unwrap(await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-1",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [
        { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") },
        {
          kind: "ReplaceTree",
          path: "tree",
          entries: [{ path: "nested/value.txt", mode: "100644", blob: "opaque", bytes: bytes("value\n") }],
        },
      ],
    })));

    expect(applied.changedPaths).toEqual(["record.txt", "tree"]);
    expect(applied.outcome).toBe("Applied");
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("after\n");
    expect(await readFile(path.join(root, "tree", "nested", "value.txt"), "utf8")).toBe("value\n");

    const converged = unwrap(await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-1",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [
        { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") },
        {
          kind: "ReplaceTree",
          path: "tree",
          entries: [{ path: "nested/value.txt", mode: "100644", blob: "opaque", bytes: bytes("value\n") }],
        },
      ],
    })));
    expect(converged.outcome).toBe("Converged");
    expect(converged.changedPaths).toEqual([]);

    const restored = unwrap(await runNodeContentWorkspace(resource.restore({
      root,
      planDigest: "plan-1",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
    expect(restored.changedPaths).toEqual(["record.txt", "tree"]);
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("before\n");
    expect(await Bun.file(path.join(root, "tree")).exists()).toBe(false);
  });

  test("observes and materializes a private remote ref without leaking semantic policy", async () => {
    const root = await createRepository();
    await mkdir(path.join(root, "payload"));
    await writeFile(path.join(root, "payload", "value.txt"), "remote value\n");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "remote payload");
    const resource = makeContentWorkspaceResource({ gitExecutable });

    const observed = unwrap(await runNodeContentWorkspace(resource.observeRemote({
      repositoryIdentity: root,
      refName: "refs/heads/main",
      sourcePath: "payload",
      maxEntries: 10,
    })));
    const materialized = unwrap(await runNodeContentWorkspace(resource.materializeRemote({
      repositoryIdentity: root,
      refName: "refs/heads/main",
      sourcePath: "payload",
      maxEntries: 10,
      maxBytes: 1024,
    })));

    expect(materialized.commit).toBe(observed.commit);
    expect(materialized.tree).toBe(observed.tree);
    expect(materialized.entries.map((entry) => entry.path)).toEqual(["value.txt"]);
    expect(new TextDecoder().decode(materialized.entries[0]?.bytes)).toBe("remote value\n");
  });

  test("rejects non-canonical roots and paths as typed input failures", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const result = await runNodeContentWorkspace(resource.readFile({
      root,
      path: "../outside",
      maxBytes: 1024,
    }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.reason).toBe("InvalidInput");
      expect(result.failure.operation).toBe("read-file");
    }
  });

  test("rejects stale captures before any write", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "record.txt"), "before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-stale",
      paths: ["record.txt"],
      maxEntries: 5,
      maxBytes: 1024,
    })));
    await writeFile(path.join(root, "record.txt"), "concurrent\n");

    const result = await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-stale",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [{ kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("desired\n") }],
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.reason).toBe("IdentityChanged");
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("concurrent\n");
  });

  test("makes forged restore authority impossible and rejects filesystem-root mutation", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "record.txt"), "preserved\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const restore = await runNodeContentWorkspace(resource.restore({
      root,
      planDigest: "plan-invalid",
      readToken: "read-invalid",
      captureHandle: "forged-handle",
    }));
    expect(restore.ok).toBe(false);
    if (!restore.ok) expect(restore.failure.reason).toBe("InvalidHandle");
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("preserved\n");

    const rootCapture = await runNodeContentWorkspace(resource.capture({
      root: path.parse(root).root,
      readToken: "read-root",
      paths: ["tmp"],
      maxEntries: 1,
      maxBytes: 1,
    }));
    expect(rootCapture.ok).toBe(false);
    if (!rootCapture.ok) expect(rootCapture.failure.reason).toBe("InvalidInput");
  });

  test("refuses restore drift without overwriting any path", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "first.txt"), "first-before\n");
    await writeFile(path.join(root, "second.txt"), "second-before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-restore-drift",
      paths: ["first.txt", "second.txt"],
      maxEntries: 5,
      maxBytes: 1024,
    })));
    unwrap(await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-restore-drift",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [
        { kind: "ReplaceFile", path: "first.txt", mode: "100644", bytes: bytes("first-after\n") },
        { kind: "ReplaceFile", path: "second.txt", mode: "100644", bytes: bytes("second-after\n") },
      ],
    })));
    await writeFile(path.join(root, "second.txt"), "concurrent\n");

    const restored = await runNodeContentWorkspace(resource.restore({
      root,
      planDigest: "plan-restore-drift",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    }));
    expect(restored.ok).toBe(false);
    if (!restored.ok) expect(restored.failure.reason).toBe("IdentityChanged");
    expect(await readFile(path.join(root, "first.txt"), "utf8")).toBe("first-after\n");
    expect(await readFile(path.join(root, "second.txt"), "utf8")).toBe("concurrent\n");
    const released = unwrap(await runNodeContentWorkspace(resource.release({
      root,
      readToken: capture.readToken,
      captureHandle: capture.handle,
      disposition: "UnsettledRecovery",
    })));
    expect(released.outcome).toBe("ReleasedUnsettled");
  });

  test("binds handles to root and token, then settles and refuses reuse", async () => {
    const root = await createRepository();
    const otherRoot = await createRepository();
    await writeFile(path.join(root, "record.txt"), "before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-owned",
      paths: ["record.txt"],
      maxEntries: 5,
      maxBytes: 1024,
    })));
    const wrongRoot = await runNodeContentWorkspace(resource.apply({
      root: otherRoot,
      planDigest: "plan-owned",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [{ kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") }],
    }));
    expect(wrongRoot.ok).toBe(false);
    if (!wrongRoot.ok) expect(wrongRoot.failure.reason).toBe("WrongRoot");
    const wrongToken = await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-owned",
      readToken: "wrong-token",
      captureHandle: capture.handle,
      writes: [{ kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") }],
    }));
    expect(wrongToken.ok).toBe(false);
    if (!wrongToken.ok) expect(wrongToken.failure.reason).toBe("WrongToken");

    unwrap(await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-owned",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [{ kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") }],
    })));
    const settled = unwrap(await runNodeContentWorkspace(resource.settle({
      root,
      planDigest: "plan-owned",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
    expect(settled.outcome).toBe("Settled");
    const reused = await runNodeContentWorkspace(resource.restore({
      root,
      planDigest: "plan-owned",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    }));
    expect(reused.ok).toBe(false);
    if (!reused.ok) expect(reused.failure.reason).toBe("HandleConsumed");
  });

  test("binds a handle to the captured Git-root filesystem identity", async () => {
    const container = await createFixtureDirectory();
    const root = path.join(container, "repo");
    await mkdir(root);
    await initializeRepository(root);
    await writeFile(path.join(root, "record.txt"), "before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-root-identity",
      paths: ["record.txt"],
      maxEntries: 5,
      maxBytes: 1024,
    })));
    await rename(root, path.join(container, "captured-repo"));
    await mkdir(root);
    await initializeRepository(root);
    await writeFile(path.join(root, "record.txt"), "replacement\n");

    const applied = await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-root-identity",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [{ kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") }],
    }));
    expect(applied.ok).toBe(false);
    if (!applied.ok) expect(applied.failure.reason).toBe("WrongRoot");
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("replacement\n");
  });

  test("retries restoration after a transient late-path filesystem failure", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "first.txt"), "first-before\n");
    await writeFile(path.join(root, "second.txt"), "second-before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-restore-retry",
      paths: ["first.txt", "second.txt"],
      maxEntries: 5,
      maxBytes: 1024,
    })));
    unwrap(await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-restore-retry",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [
        { kind: "ReplaceFile", path: "first.txt", mode: "100644", bytes: bytes("first-after\n") },
        { kind: "ReplaceFile", path: "second.txt", mode: "100644", bytes: bytes("second-after\n") },
      ],
    })));

    let injected = false;
    const failingRestore = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const faulting: FileSystem.FileSystem = {
        ...fs,
        remove: (candidate, options) => {
          if (!injected && candidate === path.join(root, "second.txt")) {
            injected = true;
            return Effect.fail(new SystemError({
              module: "FileSystem",
              method: "remove",
              reason: "Busy",
              pathOrDescriptor: candidate,
            }));
          }
          return fs.remove(candidate, options);
        },
      };
      return yield* resource.restore({
        root,
        planDigest: "plan-restore-retry",
        readToken: capture.readToken,
        captureHandle: capture.handle,
      }).pipe(Effect.provideService(FileSystem.FileSystem, faulting));
    });
    const failed = await runNodeContentWorkspace(failingRestore);
    expect(failed.ok).toBe(false);
    expect(await readFile(path.join(root, "first.txt"), "utf8")).toBe("first-before\n");
    expect(await readFile(path.join(root, "second.txt"), "utf8")).toBe("second-after\n");

    const retried = unwrap(await runNodeContentWorkspace(resource.restore({
      root,
      planDigest: "plan-restore-retry",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
    expect(retried.outcome).toBe("Restored");
    expect(retried.changedPaths).toEqual(["second.txt"]);
    expect(await readFile(path.join(root, "second.txt"), "utf8")).toBe("second-before\n");
  });

  test("enforces capture and Git materialization byte limits", async () => {
    const root = await createRepository();
    await mkdir(path.join(root, "payload"));
    await writeFile(path.join(root, "payload", "large.txt"), "0123456789");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "large payload");
    const resource = makeContentWorkspaceResource({ gitExecutable });

    const captured = await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-limited",
      paths: ["payload"],
      maxEntries: 10,
      maxBytes: 4,
    }));
    expect(captured.ok).toBe(false);
    if (!captured.ok) expect(captured.failure.reason).toBe("LimitExceeded");

    const materialized = await runNodeContentWorkspace(resource.materializeRemote({
      repositoryIdentity: root,
      refName: "refs/heads/main",
      sourcePath: "payload",
      maxEntries: 10,
      maxBytes: 4,
    }));
    expect(materialized.ok).toBe(false);
    if (!materialized.ok) expect(materialized.failure.reason).toBe("LimitExceeded");
  });

  test("retains capture entry and byte budgets across concurrent expansion", async () => {
    const root = await createRepository();
    await mkdir(path.join(root, "tree"));
    await writeFile(path.join(root, "tree", "first.txt"), "a");
    await writeFile(path.join(root, "record.txt"), "a");
    const resource = makeContentWorkspaceResource({ gitExecutable });

    const entryCapture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-entry-expansion",
      paths: ["tree"],
      maxEntries: 2,
      maxBytes: 16,
    })));
    await writeFile(path.join(root, "tree", "second.txt"), "b");
    const entryExpanded = await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-entry-expansion",
      readToken: entryCapture.readToken,
      captureHandle: entryCapture.handle,
      writes: [{
        kind: "ReplaceTree",
        path: "tree",
        entries: [{ path: "first.txt", mode: "100644", blob: "opaque", bytes: bytes("desired") }],
      }],
    }));
    expect(entryExpanded.ok).toBe(false);
    if (!entryExpanded.ok) {
      expect(entryExpanded.failure.reason).toBe("LimitExceeded");
      expect(entryExpanded.failure.operation).toBe("apply");
    }
    expect(await readFile(path.join(root, "tree", "first.txt"), "utf8")).toBe("a");
    expect(await readFile(path.join(root, "tree", "second.txt"), "utf8")).toBe("b");

    const byteCapture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-byte-expansion",
      paths: ["record.txt"],
      maxEntries: 1,
      maxBytes: 1,
    })));
    await writeFile(path.join(root, "record.txt"), "expanded");
    const byteExpanded = await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-byte-expansion",
      readToken: byteCapture.readToken,
      captureHandle: byteCapture.handle,
      writes: [{ kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("desired") }],
    }));
    expect(byteExpanded.ok).toBe(false);
    if (!byteExpanded.ok) {
      expect(byteExpanded.failure.reason).toBe("LimitExceeded");
      expect(byteExpanded.failure.operation).toBe("apply");
    }
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("expanded");
  });

  test("cleans private Git state after fetch failure and releases no-mutation captures", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const temp = await realpath(tmpdir());
    const before = (await readdir(temp)).filter((name) => name.startsWith("rawr-content-workspace-git-")).sort();
    const fetched = await runNodeContentWorkspace(resource.observeRemote({
      repositoryIdentity: path.join(root, "missing.git"),
      refName: "refs/heads/main",
      sourcePath: "",
      maxEntries: 1,
    }));
    expect(fetched.ok).toBe(false);
    const after = (await readdir(temp)).filter((name) => name.startsWith("rawr-content-workspace-git-")).sort();
    expect(after).toEqual(before);

    const capture = unwrap(await runNodeContentWorkspace(resource.capture({
      root,
      readToken: "read-release",
      paths: [".gitkeep"],
      maxEntries: 2,
      maxBytes: 16,
    })));
    const released = unwrap(await runNodeContentWorkspace(resource.release({
      root,
      readToken: capture.readToken,
      captureHandle: capture.handle,
      disposition: "NoMutation",
    })));
    expect(released.outcome).toBe("ReleasedUnmutated");
    const reused = await runNodeContentWorkspace(resource.apply({
      root,
      planDigest: "plan-released",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      writes: [{ kind: "ReplaceFile", path: ".gitkeep", mode: "100644", bytes: bytes("x") }],
    }));
    expect(reused.ok).toBe(false);
    if (!reused.ok) expect(reused.failure.reason).toBe("HandleConsumed");
  });

  test("cleans private Git state when post-allocation identity acquisition fails", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const temp = await realpath(tmpdir());
    const before = (await readdir(temp)).filter((name) => name.startsWith("rawr-content-workspace-git-")).sort();
    let injected = false;
    const postAllocationFailure = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const faulting: FileSystem.FileSystem = {
        ...fs,
        realPath: (candidate) => {
          if (!injected && path.basename(candidate).startsWith("rawr-content-workspace-git-")) {
            injected = true;
            return Effect.fail(new SystemError({
              module: "FileSystem",
              method: "realPath",
              reason: "Busy",
              pathOrDescriptor: candidate,
            }));
          }
          return fs.realPath(candidate);
        },
      };
      return yield* resource.observeRemote({
        repositoryIdentity: root,
        refName: "refs/heads/main",
        sourcePath: "",
        maxEntries: 1,
      }).pipe(Effect.provideService(FileSystem.FileSystem, faulting));
    });

    const result = await runNodeContentWorkspace(postAllocationFailure);
    expect(injected).toBe(true);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.operation).toBe("observe-remote");
      expect(result.failure.reason).toBe("FilesystemFailed");
    }
    const after = (await readdir(temp)).filter((name) => name.startsWith("rawr-content-workspace-git-")).sort();
    expect(after).toEqual(before);
  });

  test("exposes only bounded exact local Git observations for semantic adapters", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    await writeFile(path.join(root, "payload.txt"), "payload\n");
    await git(root, "add", "payload.txt");
    await git(root, "commit", "-m", "add payload");
    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });

    const anchor = unwrap(await runNodeContentWorkspace(resource.inspectGitWorkspace({
      locator: root,
      remoteSelection: { kind: "Named", remoteName: "origin" },
      refName: "refs/heads/main",
    })));
    expect(anchor).toMatchObject({
      root,
      refName: "refs/heads/main",
      refCommit: anchor.commit,
      remoteUrls: [root],
    });

    const treeBytes = unwrap(await runNodeContentWorkspace(resource.readGitTree({
      root,
      tree: anchor.tree,
      objectFormat: anchor.objectFormat,
      maxBytes: 1024 * 1024,
    })));
    expect(new TextDecoder().decode(treeBytes)).toContain("payload.txt");

    const observed = unwrap(await runNodeContentWorkspace(resource.readGitBlobAtPath({
      root,
      refName: "refs/heads/main",
      commit: anchor.commit,
      tree: anchor.tree,
      path: "payload.txt",
      maxBytes: 1024,
    })));
    expect(new TextDecoder().decode(observed.bytes)).toBe("payload\n");
    expect(unwrap(await runNodeContentWorkspace(resource.readGitBlob({
      root,
      blob: observed.blob,
      objectFormat: anchor.objectFormat,
      maxBytes: 1024,
    })))).toEqual(observed.bytes);

    const evidence = unwrap(await runNodeContentWorkspace(resource.captureGitWorkspaceEvidence({
      root,
      remoteSelection: { kind: "Named", remoteName: "origin" },
      refName: "refs/heads/main",
      admittedPaths: ["payload.txt"],
      consumedRoots: ["payload.txt"],
      objectFormat: anchor.objectFormat,
      maxPaths: 10,
      maxBytes: 1024 * 1024,
    })));
    expect(evidence.openingAnchor).toEqual(evidence.closingAnchor);
    expect(evidence.worktreeObjectIds).toEqual([{ path: "payload.txt", objectId: observed.blob }]);
    expect(new TextDecoder().decode(evidence.closingTrackedFlags)).toContain("H payload.txt");
  });

  test("binds local ancestry and changed paths to exact commits", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });
    const before = unwrap(await runNodeContentWorkspace(resource.inspectGitWorkspace({
      locator: root,
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
    })));
    await writeFile(path.join(root, "changed.txt"), "changed\n");
    await git(root, "add", "changed.txt");
    await git(root, "commit", "-m", "change");
    const after = unwrap(await runNodeContentWorkspace(resource.inspectGitWorkspace({
      locator: root,
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
    })));

    expect(unwrap(await runNodeContentWorkspace(resource.isLocalGitAncestor({
      root,
      ancestorCommit: before.commit,
      descendantCommit: after.commit,
    })))).toBe(true);
    const changed = unwrap(await runNodeContentWorkspace(resource.listGitChangedPaths({
      root,
      fromCommit: before.commit,
      toCommit: after.commit,
      maxBytes: 1024,
    })));
    expect(new TextDecoder().decode(changed)).toBe("changed.txt\0");
  });

  test("rejects noncanonical Git executable selections before command execution", async () => {
    const root = await createRepository();
    const relative = makeContentWorkspaceResource({ gitExecutable: "git" });
    const relativeResult = await runNodeContentWorkspace(relative.inspectGitWorkspace({
      locator: root,
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
    }));
    expect(relativeResult).toMatchObject({ ok: false, failure: { reason: "InvalidInput" } });

    const alias = path.join(root, "git-alias");
    await symlink(gitExecutable, alias);
    const aliased = makeContentWorkspaceResource({ gitExecutable: alias });
    const aliasResult = await runNodeContentWorkspace(aliased.inspectGitWorkspace({
      locator: root,
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
    }));
    expect(aliasResult).toMatchObject({ ok: false, failure: { reason: "Aliased" } });
  });

  test("attributes capture anchor failures to the evidence operation", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });

    const result = await runNodeContentWorkspace(resource.captureGitWorkspaceEvidence({
      root: path.join(root, "missing-root"),
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
      admittedPaths: [],
      consumedRoots: [],
      objectFormat: "sha1",
      maxPaths: 1,
      maxBytes: 1024,
    }));

    expect(result).toMatchObject({
      ok: false,
      failure: { operation: "capture-git-evidence", reason: "Missing" },
    });
  });

  test("isolates exact local Git reads without replacing remote Git configuration", async () => {
    const root = await createRepository();
    const wrapper = path.join(root, "git-wrapper");
    const log = path.join(root, "git-wrapper.log");
    const inheritedConfig = path.join(root, "operator.gitconfig");
    await writeFile(inheritedConfig, "");
    await writeFile(wrapper, [
      "#!/bin/sh",
      `printf '%s|%s|%s\\n' \"\${GIT_CONFIG_GLOBAL-UNSET}\" \"\${GIT_CONFIG_NOSYSTEM-UNSET}\" \"$*\" >> ${JSON.stringify(log)}`,
      `exec ${JSON.stringify(await realpath(gitExecutable))} \"$@\"`,
      "",
    ].join("\n"));
    await chmod(wrapper, 0o755);

    const previousGlobal = process.env.GIT_CONFIG_GLOBAL;
    const previousNoSystem = process.env.GIT_CONFIG_NOSYSTEM;
    process.env.GIT_CONFIG_GLOBAL = inheritedConfig;
    process.env.GIT_CONFIG_NOSYSTEM = "0";
    try {
      const resource = makeContentWorkspaceResource({ gitExecutable: wrapper });
      unwrap(await runNodeContentWorkspace(resource.inspectGitWorkspace({
        locator: root,
        remoteSelection: { kind: "All" },
        refName: "refs/heads/main",
      })));
      unwrap(await runNodeContentWorkspace(resource.observeRemote({
        repositoryIdentity: root,
        refName: "refs/heads/main",
        sourcePath: "",
        maxEntries: 10,
      })));
    } finally {
      restoreEnvironment("GIT_CONFIG_GLOBAL", previousGlobal);
      restoreEnvironment("GIT_CONFIG_NOSYSTEM", previousNoSystem);
    }

    const records = (await readFile(log, "utf8")).trim().split("\n");
    expect(records.some((record) => record.startsWith("/dev/null|1|--no-optional-locks"))).toBe(true);
    expect(records.some((record) => record.startsWith(`${inheritedConfig}|0|init`))).toBe(true);
    expect(records.some((record) => record.startsWith(`${inheritedConfig}|0|fetch`))).toBe(true);
  });
});

async function createRepository(): Promise<string> {
  const root = await createFixtureDirectory();
  await initializeRepository(root);
  return root;
}

async function createFixtureDirectory(): Promise<string> {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, FIXTURE_PREFIX));
  const identity = await lstat(root);
  roots.push({ parent, root, dev: identity.dev, ino: identity.ino });
  return root;
}

async function initializeRepository(root: string): Promise<void> {
  await git(root, "init", "--initial-branch=main");
  await git(root, "config", "user.email", "test@rawr.local");
  await git(root, "config", "user.name", "RAWR Test");
  await Bun.write(path.join(root, ".gitkeep"), "");
  await git(root, "add", ".gitkeep");
  await git(root, "commit", "-m", "initial");
}

async function removeOwnedFixture(owner: FixtureOwner): Promise<void> {
  const canonicalParent = await realpath(owner.parent);
  const canonicalRoot = await realpath(owner.root);
  const identity = await lstat(owner.root);
  if (
    canonicalParent !== owner.parent
    || canonicalRoot !== owner.root
    || path.dirname(owner.root) !== owner.parent
    || !path.basename(owner.root).startsWith(FIXTURE_PREFIX)
    || !identity.isDirectory()
    || identity.isSymbolicLink()
    || identity.dev !== owner.dev
    || identity.ino !== owner.ino
  ) {
    throw new Error("Refusing recursive cleanup of an unowned or substituted test fixture");
  }
  await rm(owner.root, { recursive: true, force: false });
}

async function git(root: string, ...args: readonly string[]): Promise<void> {
  const result = Bun.spawnSync([gitExecutable, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
}

function unwrap<A>(result: NodeContentWorkspaceResult<A>): A {
  if (result.ok) return result.value;
  throw new Error(`${result.failure.reason}: ${result.failure.detail}`);
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function requireExecutable(name: string): string {
  const executable = Bun.which(name);
  if (executable === null) throw new Error(`Required test executable is missing: ${name}`);
  return executable;
}

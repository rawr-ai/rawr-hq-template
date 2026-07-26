import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NodeFileSystem } from "@effect/platform-node";
import type { ContentWorkspaceFailure } from "@rawr/resource-content-workspace";
import { Effect, FileSystem, PlatformError } from "effect";
import { makeContentWorkspaceResource, makeNodeContentWorkspaceResource } from "../index";

type NodeContentWorkspaceResult<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: ContentWorkspaceFailure }>;

function runNodeContentWorkspace<A>(
  operation: Effect.Effect<A, ContentWorkspaceFailure, FileSystem.FileSystem>
): Promise<NodeContentWorkspaceResult<A>> {
  return Effect.runPromise(
    operation.pipe(
      Effect.map((value): NodeContentWorkspaceResult<A> => ({ ok: true, value })),
      Effect.catch((failure) =>
        Effect.succeed<NodeContentWorkspaceResult<A>>({ ok: false, failure })
      ),
      Effect.provide(NodeFileSystem.layer)
    )
  );
}

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

    const resource = makeNodeContentWorkspaceResource({
      gitExecutable: await realpath(gitExecutable),
    });
    const identity = await Effect.runPromise(resource.inspectWorkspace({ locator: root }));
    const entries = await Effect.runPromise(
      resource.readTree({
        root,
        path: "payload",
        objectFormat: identity.objectFormat,
        maxEntries: 10,
        maxBytes: 1024,
      })
    );

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
    const capture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-1",
          paths: ["record.txt", "tree"],
          maxEntries: 10,
          maxBytes: 1024,
        })
      )
    );

    const applied = unwrap(
      await runNodeContentWorkspace(
        resource.apply({
          root,
          planDigest: "plan-1",
          readToken: capture.readToken,
          captureHandle: capture.handle,
          writes: [
            { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") },
            {
              kind: "ReplaceTree",
              path: "tree",
              entries: [
                {
                  path: "nested/value.txt",
                  mode: "100644",
                  blob: "opaque",
                  bytes: bytes("value\n"),
                },
              ],
            },
          ],
        })
      )
    );

    expect(applied.changedPaths).toEqual(["record.txt", "tree"]);
    expect(applied.outcome).toBe("Applied");
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("after\n");
    expect(await readFile(path.join(root, "tree", "nested", "value.txt"), "utf8")).toBe("value\n");

    const converged = unwrap(
      await runNodeContentWorkspace(
        resource.apply({
          root,
          planDigest: "plan-1",
          readToken: capture.readToken,
          captureHandle: capture.handle,
          writes: [
            { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") },
            {
              kind: "ReplaceTree",
              path: "tree",
              entries: [
                {
                  path: "nested/value.txt",
                  mode: "100644",
                  blob: "opaque",
                  bytes: bytes("value\n"),
                },
              ],
            },
          ],
        })
      )
    );
    expect(converged.outcome).toBe("Converged");
    expect(converged.changedPaths).toEqual([]);

    const restored = unwrap(
      await runNodeContentWorkspace(
        resource.restore({
          root,
          planDigest: "plan-1",
          readToken: capture.readToken,
          captureHandle: capture.handle,
        })
      )
    );
    expect(restored.changedPaths).toEqual(["record.txt", "tree"]);
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("before\n");
    expect(await Bun.file(path.join(root, "tree")).exists()).toBe(false);
  });

  test("rejects non-canonical roots and paths as typed input failures", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const result = await runNodeContentWorkspace(
      resource.readFile({
        root,
        path: "../outside",
        maxBytes: 1024,
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.reason).toBe("InvalidInput");
      expect(result.failure.operation).toBe("read-file");
    }

    const lineDelimited = await runNodeContentWorkspace(
      resource.readFile({
        root,
        path: "payload\nother",
        maxBytes: 1024,
      })
    );
    expect(lineDelimited).toMatchObject({
      ok: false,
      failure: { operation: "read-file", reason: "InvalidInput" },
    });
  });

  test("rejects stale captures before any write", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "record.txt"), "before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-stale",
          paths: ["record.txt"],
          maxEntries: 5,
          maxBytes: 1024,
        })
      )
    );
    await writeFile(path.join(root, "record.txt"), "concurrent\n");

    const result = await runNodeContentWorkspace(
      resource.apply({
        root,
        planDigest: "plan-stale",
        readToken: capture.readToken,
        captureHandle: capture.handle,
        writes: [
          { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("desired\n") },
        ],
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.reason).toBe("IdentityChanged");
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("concurrent\n");
  });

  test("makes forged restore authority impossible and rejects filesystem-root mutation", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "record.txt"), "preserved\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const restore = await runNodeContentWorkspace(
      resource.restore({
        root,
        planDigest: "plan-invalid",
        readToken: "read-invalid",
        captureHandle: "forged-handle",
      })
    );
    expect(restore.ok).toBe(false);
    if (!restore.ok) expect(restore.failure.reason).toBe("InvalidHandle");
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("preserved\n");

    const rootCapture = await runNodeContentWorkspace(
      resource.capture({
        root: path.parse(root).root,
        readToken: "read-root",
        paths: ["tmp"],
        maxEntries: 1,
        maxBytes: 1,
      })
    );
    expect(rootCapture.ok).toBe(false);
    if (!rootCapture.ok) expect(rootCapture.failure.reason).toBe("InvalidInput");
  });

  test("refuses restore drift without overwriting any path", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "first.txt"), "first-before\n");
    await writeFile(path.join(root, "second.txt"), "second-before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-restore-drift",
          paths: ["first.txt", "second.txt"],
          maxEntries: 5,
          maxBytes: 1024,
        })
      )
    );
    unwrap(
      await runNodeContentWorkspace(
        resource.apply({
          root,
          planDigest: "plan-restore-drift",
          readToken: capture.readToken,
          captureHandle: capture.handle,
          writes: [
            {
              kind: "ReplaceFile",
              path: "first.txt",
              mode: "100644",
              bytes: bytes("first-after\n"),
            },
            {
              kind: "ReplaceFile",
              path: "second.txt",
              mode: "100644",
              bytes: bytes("second-after\n"),
            },
          ],
        })
      )
    );
    await writeFile(path.join(root, "second.txt"), "concurrent\n");

    const restored = await runNodeContentWorkspace(
      resource.restore({
        root,
        planDigest: "plan-restore-drift",
        readToken: capture.readToken,
        captureHandle: capture.handle,
      })
    );
    expect(restored.ok).toBe(false);
    if (!restored.ok) expect(restored.failure.reason).toBe("IdentityChanged");
    expect(await readFile(path.join(root, "first.txt"), "utf8")).toBe("first-after\n");
    expect(await readFile(path.join(root, "second.txt"), "utf8")).toBe("concurrent\n");
    const released = unwrap(
      await runNodeContentWorkspace(
        resource.release({
          root,
          readToken: capture.readToken,
          captureHandle: capture.handle,
          disposition: "UnsettledRecovery",
        })
      )
    );
    expect(released.outcome).toBe("ReleasedUnsettled");
  });

  test("binds handles to root and token, then settles and refuses reuse", async () => {
    const root = await createRepository();
    const otherRoot = await createRepository();
    await writeFile(path.join(root, "record.txt"), "before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-owned",
          paths: ["record.txt"],
          maxEntries: 5,
          maxBytes: 1024,
        })
      )
    );
    const wrongRoot = await runNodeContentWorkspace(
      resource.apply({
        root: otherRoot,
        planDigest: "plan-owned",
        readToken: capture.readToken,
        captureHandle: capture.handle,
        writes: [
          { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") },
        ],
      })
    );
    expect(wrongRoot.ok).toBe(false);
    if (!wrongRoot.ok) expect(wrongRoot.failure.reason).toBe("WrongRoot");
    const wrongToken = await runNodeContentWorkspace(
      resource.apply({
        root,
        planDigest: "plan-owned",
        readToken: "wrong-token",
        captureHandle: capture.handle,
        writes: [
          { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") },
        ],
      })
    );
    expect(wrongToken.ok).toBe(false);
    if (!wrongToken.ok) expect(wrongToken.failure.reason).toBe("WrongToken");

    unwrap(
      await runNodeContentWorkspace(
        resource.apply({
          root,
          planDigest: "plan-owned",
          readToken: capture.readToken,
          captureHandle: capture.handle,
          writes: [
            { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") },
          ],
        })
      )
    );
    const settled = unwrap(
      await runNodeContentWorkspace(
        resource.settle({
          root,
          planDigest: "plan-owned",
          readToken: capture.readToken,
          captureHandle: capture.handle,
        })
      )
    );
    expect(settled.outcome).toBe("Settled");
    const reused = await runNodeContentWorkspace(
      resource.restore({
        root,
        planDigest: "plan-owned",
        readToken: capture.readToken,
        captureHandle: capture.handle,
      })
    );
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
    const capture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-root-identity",
          paths: ["record.txt"],
          maxEntries: 5,
          maxBytes: 1024,
        })
      )
    );
    await rename(root, path.join(container, "captured-repo"));
    await mkdir(root);
    await initializeRepository(root);
    await writeFile(path.join(root, "record.txt"), "replacement\n");

    const applied = await runNodeContentWorkspace(
      resource.apply({
        root,
        planDigest: "plan-root-identity",
        readToken: capture.readToken,
        captureHandle: capture.handle,
        writes: [
          { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("after\n") },
        ],
      })
    );
    expect(applied.ok).toBe(false);
    if (!applied.ok) expect(applied.failure.reason).toBe("WrongRoot");
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("replacement\n");
  });

  test("retries restoration after a transient late-path filesystem failure", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "first.txt"), "first-before\n");
    await writeFile(path.join(root, "second.txt"), "second-before\n");
    const resource = makeContentWorkspaceResource({ gitExecutable });
    const capture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-restore-retry",
          paths: ["first.txt", "second.txt"],
          maxEntries: 5,
          maxBytes: 1024,
        })
      )
    );
    unwrap(
      await runNodeContentWorkspace(
        resource.apply({
          root,
          planDigest: "plan-restore-retry",
          readToken: capture.readToken,
          captureHandle: capture.handle,
          writes: [
            {
              kind: "ReplaceFile",
              path: "first.txt",
              mode: "100644",
              bytes: bytes("first-after\n"),
            },
            {
              kind: "ReplaceFile",
              path: "second.txt",
              mode: "100644",
              bytes: bytes("second-after\n"),
            },
          ],
        })
      )
    );

    let injected = false;
    const failingRestore = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const faulting: FileSystem.FileSystem = {
        ...fs,
        remove: (candidate, options) => {
          if (!injected && candidate === path.join(root, "second.txt")) {
            injected = true;
            return Effect.fail(
              PlatformError.systemError({
                _tag: "Busy",
                module: "FileSystem",
                method: "remove",
                pathOrDescriptor: candidate,
              })
            );
          }
          return fs.remove(candidate, options);
        },
      };
      return yield* resource
        .restore({
          root,
          planDigest: "plan-restore-retry",
          readToken: capture.readToken,
          captureHandle: capture.handle,
        })
        .pipe(Effect.provideService(FileSystem.FileSystem, faulting));
    });
    const failed = await runNodeContentWorkspace(failingRestore);
    expect(failed.ok).toBe(false);
    expect(await readFile(path.join(root, "first.txt"), "utf8")).toBe("first-before\n");
    expect(await readFile(path.join(root, "second.txt"), "utf8")).toBe("second-after\n");

    const retried = unwrap(
      await runNodeContentWorkspace(
        resource.restore({
          root,
          planDigest: "plan-restore-retry",
          readToken: capture.readToken,
          captureHandle: capture.handle,
        })
      )
    );
    expect(retried.outcome).toBe("Restored");
    expect(retried.changedPaths).toEqual(["second.txt"]);
    expect(await readFile(path.join(root, "second.txt"), "utf8")).toBe("second-before\n");
  });

  test("enforces capture byte limits", async () => {
    const root = await createRepository();
    await mkdir(path.join(root, "payload"));
    await writeFile(path.join(root, "payload", "large.txt"), "0123456789");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "large payload");
    const resource = makeContentWorkspaceResource({ gitExecutable });

    const captured = await runNodeContentWorkspace(
      resource.capture({
        root,
        readToken: "read-limited",
        paths: ["payload"],
        maxEntries: 10,
        maxBytes: 4,
      })
    );
    expect(captured.ok).toBe(false);
    if (!captured.ok) expect(captured.failure.reason).toBe("LimitExceeded");
  });

  test("retains capture entry and byte budgets across concurrent expansion", async () => {
    const root = await createRepository();
    await mkdir(path.join(root, "tree"));
    await writeFile(path.join(root, "tree", "first.txt"), "a");
    await writeFile(path.join(root, "record.txt"), "a");
    const resource = makeContentWorkspaceResource({ gitExecutable });

    const entryCapture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-entry-expansion",
          paths: ["tree"],
          maxEntries: 2,
          maxBytes: 16,
        })
      )
    );
    await writeFile(path.join(root, "tree", "second.txt"), "b");
    const entryExpanded = await runNodeContentWorkspace(
      resource.apply({
        root,
        planDigest: "plan-entry-expansion",
        readToken: entryCapture.readToken,
        captureHandle: entryCapture.handle,
        writes: [
          {
            kind: "ReplaceTree",
            path: "tree",
            entries: [
              { path: "first.txt", mode: "100644", blob: "opaque", bytes: bytes("desired") },
            ],
          },
        ],
      })
    );
    expect(entryExpanded.ok).toBe(false);
    if (!entryExpanded.ok) {
      expect(entryExpanded.failure.reason).toBe("LimitExceeded");
      expect(entryExpanded.failure.operation).toBe("apply");
    }
    expect(await readFile(path.join(root, "tree", "first.txt"), "utf8")).toBe("a");
    expect(await readFile(path.join(root, "tree", "second.txt"), "utf8")).toBe("b");

    const byteCapture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-byte-expansion",
          paths: ["record.txt"],
          maxEntries: 1,
          maxBytes: 1,
        })
      )
    );
    await writeFile(path.join(root, "record.txt"), "expanded");
    const byteExpanded = await runNodeContentWorkspace(
      resource.apply({
        root,
        planDigest: "plan-byte-expansion",
        readToken: byteCapture.readToken,
        captureHandle: byteCapture.handle,
        writes: [
          { kind: "ReplaceFile", path: "record.txt", mode: "100644", bytes: bytes("desired") },
        ],
      })
    );
    expect(byteExpanded.ok).toBe(false);
    if (!byteExpanded.ok) {
      expect(byteExpanded.failure.reason).toBe("LimitExceeded");
      expect(byteExpanded.failure.operation).toBe("apply");
    }
    expect(await readFile(path.join(root, "record.txt"), "utf8")).toBe("expanded");
  });

  test("releases no-mutation captures", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable });

    const capture = unwrap(
      await runNodeContentWorkspace(
        resource.capture({
          root,
          readToken: "read-release",
          paths: [".gitkeep"],
          maxEntries: 2,
          maxBytes: 16,
        })
      )
    );
    const released = unwrap(
      await runNodeContentWorkspace(
        resource.release({
          root,
          readToken: capture.readToken,
          captureHandle: capture.handle,
          disposition: "NoMutation",
        })
      )
    );
    expect(released.outcome).toBe("ReleasedUnmutated");
    const reused = await runNodeContentWorkspace(
      resource.apply({
        root,
        planDigest: "plan-released",
        readToken: capture.readToken,
        captureHandle: capture.handle,
        writes: [{ kind: "ReplaceFile", path: ".gitkeep", mode: "100644", bytes: bytes("x") }],
      })
    );
    expect(reused.ok).toBe(false);
    if (!reused.ok) expect(reused.failure.reason).toBe("HandleConsumed");
  });

  test("exposes only bounded exact local Git observations for semantic adapters", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    await writeFile(path.join(root, "payload.txt"), "payload\n");
    await writeFile(path.join(root, "second.txt"), "second\n");
    await symlink("payload.txt", path.join(root, "unrelated-link"));
    await git(root, "add", "payload.txt", "second.txt", "unrelated-link");
    await git(root, "commit", "-m", "add payload");
    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });

    const anchor = unwrap(
      await runNodeContentWorkspace(
        resource.inspectGitWorkspace({
          locator: root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
        })
      )
    );
    expect(anchor).toMatchObject({
      root,
      refName: "refs/heads/main",
      refCommit: anchor.commit,
      remoteUrls: [root],
    });

    const treeEntries = unwrap(
      await runNodeContentWorkspace(
        resource.readGitTree({
          root,
          tree: anchor.tree,
          objectFormat: anchor.objectFormat,
          paths: ["payload.txt"],
          maxEntries: 10,
          maxBytes: 1024 * 1024,
        })
      )
    );
    expect(treeEntries).toEqual([
      {
        path: "payload.txt",
        mode: "100644",
        blob: testGitBlobId(bytes("payload\n"), anchor.objectFormat),
      },
    ]);
    expect(Object.isFrozen(treeEntries)).toBe(true);
    expect(Object.isFrozen(treeEntries[0])).toBe(true);
    expect(
      unwrap(
        await runNodeContentWorkspace(
          resource.readGitTree({
            root,
            tree: anchor.tree,
            objectFormat: anchor.objectFormat,
            paths: ["missing.txt"],
            maxEntries: 10,
            maxBytes: 1024 * 1024,
          })
        )
      )
    ).toEqual([]);

    const boundedTree = await runNodeContentWorkspace(
      resource.readGitTree({
        root,
        tree: anchor.tree,
        objectFormat: anchor.objectFormat,
        paths: ["payload.txt", "second.txt"],
        maxEntries: 1,
        maxBytes: 1024 * 1024,
      })
    );
    expect(boundedTree).toMatchObject({
      ok: false,
      failure: { operation: "read-git-tree", reason: "LimitExceeded" },
    });

    const byteBoundedTree = await runNodeContentWorkspace(
      resource.readGitTree({
        root,
        tree: anchor.tree,
        objectFormat: anchor.objectFormat,
        paths: ["payload.txt"],
        maxEntries: 10,
        maxBytes: 1,
      })
    );
    expect(byteBoundedTree).toMatchObject({
      ok: false,
      failure: { operation: "read-git-tree", reason: "LimitExceeded" },
    });

    const unsupportedTree = await runNodeContentWorkspace(
      resource.readGitTree({
        root,
        tree: anchor.tree,
        objectFormat: anchor.objectFormat,
        paths: ["unrelated-link"],
        maxEntries: 10,
        maxBytes: 1024 * 1024,
      })
    );
    expect(unsupportedTree).toMatchObject({
      ok: false,
      failure: { operation: "read-git-tree", reason: "UnsupportedEntry" },
    });

    const observed = unwrap(
      await runNodeContentWorkspace(
        resource.readGitBlobAtPath({
          root,
          refName: "refs/heads/main",
          commit: anchor.commit,
          tree: anchor.tree,
          path: "payload.txt",
          maxBytes: 1024,
        })
      )
    );
    expect(new TextDecoder().decode(observed.bytes)).toBe("payload\n");
    expect(
      unwrap(
        await runNodeContentWorkspace(
          resource.readGitBlob({
            root,
            blob: observed.blob,
            objectFormat: anchor.objectFormat,
            maxBytes: 1024,
          })
        )
      )
    ).toEqual(observed.bytes);

    const evidence = unwrap(
      await runNodeContentWorkspace(
        resource.captureGitWorkspaceEvidence({
          root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          admittedPaths: ["payload.txt"],
          consumedRoots: ["payload.txt"],
          objectFormat: anchor.objectFormat,
          maxPaths: 10,
          maxWorktreeFileBytes: 1024,
          maxWorktreeBytes: 1024,
          maxBytes: 1024 * 1024,
        })
      )
    );
    expect(evidence.openingAnchor).toEqual(evidence.closingAnchor);
    expect(evidence.worktreeObjectIds).toEqual([{ path: "payload.txt", objectId: observed.blob }]);
    expect(evidence.closingTrackedFlags).toEqual([
      { path: "payload.txt", status: "Cached", assumeUnchanged: false },
    ]);
  });

  test("observes Git status without refreshing stale index stat data", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    const payloadPath = path.join(root, "payload.txt");
    await writeFile(payloadPath, "payload\n");
    await git(root, "add", "payload.txt");
    await git(root, "commit", "-m", "add payload");
    await writeFile(path.join(root, "local-only.txt"), "untracked\n");

    const freshPayloadInfo = await lstat(payloadPath);
    const staleTimestamp = new Date("2001-01-01T00:00:00.000Z");
    await utimes(payloadPath, staleTimestamp, staleTimestamp);
    const stalePayloadInfo = await lstat(payloadPath);
    expect(stalePayloadInfo.mtimeMs).not.toBe(freshPayloadInfo.mtimeMs);

    const indexPath = path.join(root, ".git", "index");
    const indexBytesBefore = await readFile(indexPath);
    const indexInfoBefore = await lstat(indexPath);
    const indexIdentityAndWriteMetadataBefore = {
      dev: indexInfoBefore.dev,
      ino: indexInfoBefore.ino,
      mode: indexInfoBefore.mode,
      nlink: indexInfoBefore.nlink,
      uid: indexInfoBefore.uid,
      gid: indexInfoBefore.gid,
      size: indexInfoBefore.size,
      mtimeMs: indexInfoBefore.mtimeMs,
      ctimeMs: indexInfoBefore.ctimeMs,
      birthtimeMs: indexInfoBefore.birthtimeMs,
    };

    const evidence = unwrap(
      await runNodeContentWorkspace(
        makeContentWorkspaceResource({
          gitExecutable: await realpath(gitExecutable),
        }).captureGitWorkspaceEvidence({
          root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          admittedPaths: ["payload.txt"],
          consumedRoots: ["payload.txt"],
          objectFormat: "sha1",
          maxPaths: 10,
          maxWorktreeFileBytes: 1024,
          maxWorktreeBytes: 1024,
          maxBytes: 1024 * 1024,
        })
      )
    );

    expect(evidence.openingAnchor).toEqual(evidence.closingAnchor);
    expect(evidence.worktreeObjectIds).toEqual([
      { path: "payload.txt", objectId: gitOutput(root, "rev-parse", "HEAD:payload.txt") },
    ]);
    expect(new TextDecoder().decode(evidence.openingStatus)).toContain("? local-only.txt\0");
    expect(evidence.closingTrackedFlags).toEqual([
      { path: "payload.txt", status: "Cached", assumeUnchanged: false },
    ]);
    expect(new TextDecoder().decode(evidence.indexEntries)).toContain("\tpayload.txt\0");

    const indexBytesAfter = await readFile(indexPath);
    const indexInfoAfter = await lstat(indexPath);
    expect(indexBytesAfter).toEqual(indexBytesBefore);
    expect({
      dev: indexInfoAfter.dev,
      ino: indexInfoAfter.ino,
      mode: indexInfoAfter.mode,
      nlink: indexInfoAfter.nlink,
      uid: indexInfoAfter.uid,
      gid: indexInfoAfter.gid,
      size: indexInfoAfter.size,
      mtimeMs: indexInfoAfter.mtimeMs,
      ctimeMs: indexInfoAfter.ctimeMs,
      birthtimeMs: indexInfoAfter.birthtimeMs,
    }).toEqual(indexIdentityAndWriteMetadataBefore);

    const ordinaryStatus = Bun.spawnSync(
      [
        gitExecutable,
        "status",
        "--porcelain=v2",
        "--branch",
        "-z",
        "--untracked-files=all",
        "--ignored=matching",
        "--ignore-submodules=none",
      ],
      {
        cwd: root,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "1" },
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    expect(ordinaryStatus.exitCode).toBe(0);
    expect(await readFile(indexPath)).not.toEqual(indexBytesAfter);
  });

  test("decodes real Git tracked-path state into frozen provider-neutral facts", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    await writeFile(path.join(root, "assumed.txt"), "assumed\n");
    await writeFile(path.join(root, "cached.txt"), "cached\n");
    await writeFile(path.join(root, "sparse.txt"), "sparse\n");
    await git(root, "add", "assumed.txt", "cached.txt", "sparse.txt");
    await git(root, "commit", "-m", "add tracked flag fixtures");
    await git(root, "update-index", "--assume-unchanged", "assumed.txt");
    await git(root, "update-index", "--skip-worktree", "sparse.txt");
    await git(root, "update-index", "--assume-unchanged", "sparse.txt");

    const evidence = unwrap(
      await runNodeContentWorkspace(
        makeContentWorkspaceResource({
          gitExecutable: await realpath(gitExecutable),
        }).captureGitWorkspaceEvidence({
          root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          admittedPaths: ["sparse.txt", "cached.txt", "assumed.txt"],
          consumedRoots: ["assumed.txt", "cached.txt", "sparse.txt"],
          objectFormat: "sha1",
          maxPaths: 3,
          maxWorktreeFileBytes: 1024,
          maxWorktreeBytes: 3 * 1024,
          maxBytes: 1024,
        })
      )
    );

    expect(evidence.openingTrackedFlags).toEqual([
      { path: "assumed.txt", status: "Cached", assumeUnchanged: true },
      { path: "cached.txt", status: "Cached", assumeUnchanged: false },
      { path: "sparse.txt", status: "SkipWorktree", assumeUnchanged: true },
    ]);
    expect(evidence.closingTrackedFlags).toEqual(evidence.openingTrackedFlags);
    expect(Object.isFrozen(evidence.openingTrackedFlags)).toBe(true);
    expect(evidence.openingTrackedFlags.every(Object.isFrozen)).toBe(true);
  });

  test("preserves all three real unmerged index stages as repeated facts", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    await writeFile(path.join(root, "conflict.txt"), "base\n");
    await git(root, "add", "conflict.txt");
    await git(root, "commit", "-m", "add conflict fixture");
    await git(root, "checkout", "-b", "side");
    await writeFile(path.join(root, "conflict.txt"), "side\n");
    await git(root, "commit", "-am", "change on side");
    await git(root, "checkout", "main");
    await writeFile(path.join(root, "conflict.txt"), "main\n");
    await git(root, "commit", "-am", "change on main");
    const merge = Bun.spawnSync([gitExecutable, "merge", "side"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(merge.exitCode).toBe(1);

    const evidence = unwrap(
      await runNodeContentWorkspace(
        makeContentWorkspaceResource({
          gitExecutable: await realpath(gitExecutable),
        }).captureGitWorkspaceEvidence({
          root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          admittedPaths: ["conflict.txt"],
          consumedRoots: ["conflict.txt"],
          objectFormat: "sha1",
          maxPaths: 1,
          maxWorktreeFileBytes: 1024,
          maxWorktreeBytes: 1024,
          maxBytes: 1024,
        })
      )
    );

    expect(evidence.openingTrackedFlags).toEqual([
      { path: "conflict.txt", status: "Unmerged", assumeUnchanged: false },
      { path: "conflict.txt", status: "Unmerged", assumeUnchanged: false },
      { path: "conflict.txt", status: "Unmerged", assumeUnchanged: false },
    ]);
    expect(evidence.closingTrackedFlags).toEqual(evidence.openingTrackedFlags);
    expect(evidence.openingTrackedFlags.every(Object.isFrozen)).toBe(true);
  });

  test("decodes and bounds exact native tracked-path protocol facts", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    const admittedPaths = ["alpha.txt", "beta.txt", "payload.txt"];
    for (const admittedPath of admittedPaths) {
      await writeFile(path.join(root, admittedPath), `${admittedPath}\n`);
    }
    await git(root, "add", ...admittedPaths);
    await git(root, "commit", "-m", "add tracked protocol fixtures");

    const outputPath = path.join(root, "tracked-flags-output.bin");
    const wrapper = path.join(root, "git-tracked-flags-wrapper");
    await writeFile(
      wrapper,
      [
        "#!/bin/sh",
        'case " $* " in',
        '  *" status "*) exit 0 ;;',
        `  *" ls-files -v -z "*) cat ${JSON.stringify(outputPath)}; exit 0 ;;`,
        '  *" ls-files --stage -z "*) exit 0 ;;',
        "esac",
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(wrapper, 0o755);
    const resource = makeContentWorkspaceResource({ gitExecutable: wrapper });
    const capture = (maxBytes = 1024) =>
      runNodeContentWorkspace(
        resource.captureGitWorkspaceEvidence({
          root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          admittedPaths,
          consumedRoots: admittedPaths,
          objectFormat: "sha1",
          maxPaths: admittedPaths.length,
          maxWorktreeFileBytes: 1024,
          maxWorktreeBytes: admittedPaths.length * 1024,
          maxBytes,
        })
      );

    await writeFile(
      outputPath,
      bytes(
        ["M payload.txt", "s beta.txt", "M payload.txt", "H alpha.txt", "M payload.txt"]
          .map((record) => `${record}\0`)
          .join("")
      )
    );
    const decoded = unwrap(await capture());
    expect(decoded.openingTrackedFlags).toEqual([
      { path: "alpha.txt", status: "Cached", assumeUnchanged: false },
      { path: "beta.txt", status: "SkipWorktree", assumeUnchanged: true },
      { path: "payload.txt", status: "Unmerged", assumeUnchanged: false },
      { path: "payload.txt", status: "Unmerged", assumeUnchanged: false },
      { path: "payload.txt", status: "Unmerged", assumeUnchanged: false },
    ]);

    const malformedCases: readonly Readonly<{
      name: string;
      output: Uint8Array;
      reason: ContentWorkspaceFailure["reason"];
    }>[] = [
      { name: "truncated terminal NUL", output: bytes("H payload.txt"), reason: "GitFailed" },
      {
        name: "invalid UTF-8",
        output: new Uint8Array([0xff, 0]),
        reason: "GitFailed",
      },
      { name: "unknown native tag", output: bytes("X payload.txt\0"), reason: "GitFailed" },
      { name: "removed-only tag", output: bytes("R payload.txt\0"), reason: "GitFailed" },
      { name: "modified-only tag", output: bytes("C payload.txt\0"), reason: "GitFailed" },
      { name: "killed-only tag", output: bytes("K payload.txt\0"), reason: "GitFailed" },
      { name: "other-only tag", output: bytes("? payload.txt\0"), reason: "GitFailed" },
      {
        name: "lowercase unmerged tag",
        output: bytes("m payload.txt\0"),
        reason: "GitFailed",
      },
      { name: "malformed framing", output: bytes("H\tpayload.txt\0"), reason: "GitFailed" },
      {
        name: "noncanonical path",
        output: bytes("H ../payload.txt\0"),
        reason: "UnsupportedEntry",
      },
      {
        name: "path outside selection",
        output: bytes("H outside.txt\0"),
        reason: "UnsupportedEntry",
      },
      {
        name: "repeated cached stage-zero path",
        output: bytes("H payload.txt\0H payload.txt\0"),
        reason: "GitFailed",
      },
      {
        name: "repeated skip-worktree stage-zero path",
        output: bytes("S payload.txt\0S payload.txt\0"),
        reason: "GitFailed",
      },
      {
        name: "mixed cached and skip-worktree stage-zero path",
        output: bytes("H payload.txt\0S payload.txt\0"),
        reason: "GitFailed",
      },
      {
        name: "mixed cached and unmerged path",
        output: bytes("H payload.txt\0M payload.txt\0"),
        reason: "GitFailed",
      },
      {
        name: "fourth unmerged stage",
        output: bytes("M payload.txt\0".repeat(4)),
        reason: "GitFailed",
      },
    ];

    for (const fixture of malformedCases) {
      await writeFile(outputPath, fixture.output);
      expect(await capture(), fixture.name).toMatchObject({
        ok: false,
        failure: { operation: "capture-git-evidence", reason: fixture.reason },
      });
    }

    await writeFile(outputPath, bytes("H payload.txt\0"));
    expect(await capture(1)).toMatchObject({
      ok: false,
      failure: { operation: "capture-git-evidence", reason: "LimitExceeded" },
    });
  });

  test("admits SHA-256 tree facts and returns code-unit ordered entries", async () => {
    const root = await createRepository("sha256");
    await writeFile(path.join(root, "Alpha.txt"), "alpha\n");
    await writeFile(path.join(root, "zeta.txt"), "zeta\n");
    await git(root, "add", "Alpha.txt", "zeta.txt");
    await git(root, "commit", "-m", "add SHA-256 ordering fixtures");
    const tree = gitOutput(root, "rev-parse", "HEAD^{tree}");
    const alphaBlob = gitOutput(root, "rev-parse", "HEAD:Alpha.txt");
    const zetaBlob = gitOutput(root, "rev-parse", "HEAD:zeta.txt");
    const wrapper = path.join(root, "git-sha256-tree-wrapper");
    const realGit = await realpath(gitExecutable);
    await writeFile(
      wrapper,
      [
        "#!/bin/sh",
        'if [ "$1" = "ls-tree" ]; then',
        `  printf '%s\\t%s\\0%s\\t%s\\0' ${JSON.stringify(
          `100644 blob ${zetaBlob}`
        )} zeta.txt ${JSON.stringify(`100644 blob ${alphaBlob}`)} Alpha.txt`,
        "  exit 0",
        "fi",
        `exec ${JSON.stringify(realGit)} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(wrapper, 0o755);

    const entries = unwrap(
      await runNodeContentWorkspace(
        makeContentWorkspaceResource({ gitExecutable: wrapper }).readGitTree({
          root,
          tree,
          objectFormat: "sha256",
          paths: ["Alpha.txt", "zeta.txt"],
          maxEntries: 10,
          maxBytes: 1024,
        })
      )
    );

    expect(entries.map((entry) => entry.path)).toEqual(["Alpha.txt", "zeta.txt"]);
    expect(entries.map((entry) => entry.blob)).toEqual([alphaBlob, zetaBlob]);
    expect(entries.every((entry) => entry.blob.length === 64)).toBe(true);
  });

  test("observes an exact full ref independently of checkout and worktree bytes", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    await writeFile(path.join(root, "payload.txt"), "main payload\n");
    await git(root, "add", "payload.txt");
    await git(root, "commit", "-m", "add main payload");
    const mainCommit = gitOutput(root, "rev-parse", "refs/heads/main");
    const mainTree = gitOutput(root, "rev-parse", "refs/heads/main^{tree}");
    await git(root, "checkout", "-b", "unrelated-worktree");
    await writeFile(path.join(root, "side.txt"), "side branch\n");
    await git(root, "add", "side.txt");
    await git(root, "commit", "-m", "add side branch file");
    await writeFile(path.join(root, "untracked.txt"), "local only\n");

    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });
    const observed = unwrap(
      await runNodeContentWorkspace(
        resource.inspectGitRef({
          locator: root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
        })
      )
    );

    expect(observed).toMatchObject({
      root,
      refName: "refs/heads/main",
      commit: mainCommit,
      tree: mainTree,
      remoteUrls: [root],
    });

    const parallel = await Promise.all(
      Array.from({ length: 24 }, async () => {
        const exact = unwrap(
          await runNodeContentWorkspace(
            resource.inspectGitRef({
              locator: root,
              remoteSelection: { kind: "Named", remoteName: "origin" },
              refName: "refs/heads/main",
            })
          )
        );
        const payload = unwrap(
          await runNodeContentWorkspace(
            resource.readGitBlobAtPath({
              root,
              refName: exact.refName,
              commit: exact.commit,
              tree: exact.tree,
              path: "payload.txt",
              maxBytes: 64,
            })
          )
        );
        return [exact.commit, new TextDecoder().decode(payload.bytes)] as const;
      })
    );
    expect(parallel).toEqual(Array.from({ length: 24 }, () => [mainCommit, "main payload\n"]));
  });

  test("rejects invalid native Git tree records at the public resource boundary", async () => {
    const root = await createRepository();
    await writeFile(path.join(root, "payload.txt"), "payload\n");
    await git(root, "add", "payload.txt");
    await git(root, "commit", "-m", "add tree protocol fixture");
    const tree = gitOutput(root, "rev-parse", "HEAD^{tree}");
    const objectId = "0".repeat(40);
    const cases = [
      {
        name: "truncated",
        output: `printf '100644 blob ${objectId}\\tpayload.txt'`,
        detail: "terminal NUL",
        reason: "GitFailed",
      },
      {
        name: "malformed",
        output: "printf 'malformed\\0'",
        detail: "malformed",
        reason: "GitFailed",
      },
      {
        name: "invalid-utf8",
        output: "printf '\\377\\0'",
        detail: "invalid UTF-8",
        reason: "GitFailed",
      },
      {
        name: "wrong-object-format",
        output: `printf '100644 blob ${"0".repeat(64)}\\tpayload.txt\\0'`,
        detail: "object format",
        reason: "GitFailed",
      },
      {
        name: "duplicate-path",
        output: `printf '%s\\t%s\\0%s\\t%s\\0' ${JSON.stringify(
          `100644 blob ${objectId}`
        )} payload.txt ${JSON.stringify(`100644 blob ${objectId}`)} payload.txt`,
        detail: "duplicate path",
        reason: "GitFailed",
      },
      {
        name: "gitlink",
        output: `printf '160000 commit ${objectId}\\tnested-repository\\0'`,
        detail: "non-regular entry",
        reason: "UnsupportedEntry",
      },
    ] as const;

    for (const fixture of cases) {
      const wrapper = path.join(root, `git-tree-${fixture.name}-wrapper`);
      await writeFile(
        wrapper,
        [
          "#!/bin/sh",
          'if [ "$1" = "ls-tree" ]; then',
          `  ${fixture.output}`,
          "  exit 0",
          "fi",
          `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
          "",
        ].join("\n")
      );
      await chmod(wrapper, 0o755);
      const resource = makeContentWorkspaceResource({ gitExecutable: wrapper });
      const result = await runNodeContentWorkspace(
        resource.readGitTree({
          root,
          tree,
          objectFormat: "sha1",
          paths: ["payload.txt"],
          maxEntries: 10,
          maxBytes: 1024,
        })
      );
      expect(result).toMatchObject({
        ok: false,
        failure: {
          operation: "read-git-tree",
          reason: fixture.reason,
          detail: expect.stringContaining(fixture.detail),
        },
      });
    }
  });

  test("hashes bounded admitted worktree bytes through one ordered native Git batch", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    await writeFile(path.join(root, "payload.txt"), "committed\n");
    await writeFile(path.join(root, "second.txt"), "committed second\n");
    await git(root, "add", "payload.txt", "second.txt");
    await git(root, "commit", "-m", "add payloads");

    const wrapper = path.join(root, "git-evidence-wrapper");
    const log = path.join(root, "git-evidence-wrapper.log");
    await writeFile(
      wrapper,
      [
        "#!/bin/sh",
        `printf '%s\\n' "$*" >> ${JSON.stringify(log)}`,
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(wrapper, 0o755);
    const firstBytes = bytes("w".repeat(2 * 1024));
    const secondBytes = bytes("x".repeat(1024));
    await writeFile(path.join(root, "payload.txt"), firstBytes);
    await writeFile(path.join(root, "second.txt"), secondBytes);

    const resource = makeContentWorkspaceResource({ gitExecutable: wrapper });
    const anchor = unwrap(
      await runNodeContentWorkspace(
        resource.inspectGitWorkspace({
          locator: root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
        })
      )
    );
    const evidence = unwrap(
      await runNodeContentWorkspace(
        resource.captureGitWorkspaceEvidence({
          root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          admittedPaths: ["second.txt", "payload.txt"],
          consumedRoots: ["payload.txt", "second.txt"],
          objectFormat: anchor.objectFormat,
          maxPaths: 10,
          maxWorktreeFileBytes: 4 * 1024,
          maxWorktreeBytes: 4 * 1024,
          maxBytes: 1024,
        })
      )
    );

    expect(evidence.worktreeObjectIds).toEqual([
      { path: "second.txt", objectId: testGitBlobId(secondBytes, anchor.objectFormat) },
      { path: "payload.txt", objectId: testGitBlobId(firstBytes, anchor.objectFormat) },
    ]);
    const aggregateBounded = await runNodeContentWorkspace(
      resource.captureGitWorkspaceEvidence({
        root,
        remoteSelection: { kind: "Named", remoteName: "origin" },
        refName: "refs/heads/main",
        admittedPaths: ["second.txt", "payload.txt"],
        consumedRoots: ["payload.txt", "second.txt"],
        objectFormat: anchor.objectFormat,
        maxPaths: 10,
        maxWorktreeFileBytes: 4 * 1024,
        maxWorktreeBytes: firstBytes.byteLength + secondBytes.byteLength - 1,
        maxBytes: 1024,
      })
    );
    expect(aggregateBounded).toMatchObject({
      ok: false,
      failure: { operation: "capture-git-evidence", reason: "LimitExceeded" },
    });
    const commands = (await readFile(log, "utf8")).trim().split("\n");
    expect(
      commands.filter((command) => /hash-object --no-filters --stdin-paths$/u.test(command))
    ).toHaveLength(1);
  });

  test("reads a bounded ordered blob set through one native Git batch", async () => {
    const root = await createRepository();
    const alpha = bytes("alpha\n");
    const beta = bytes("beta\n");
    await writeFile(path.join(root, "alpha.txt"), alpha);
    await writeFile(path.join(root, "beta.txt"), beta);
    await git(root, "add", "alpha.txt", "beta.txt");
    await git(root, "commit", "-m", "add batch payloads");

    const wrapper = path.join(root, "git-batch-wrapper");
    const log = path.join(root, "git-batch-wrapper.log");
    await writeFile(
      wrapper,
      [
        "#!/bin/sh",
        `printf '%s\\n' "$*" >> ${JSON.stringify(log)}`,
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(wrapper, 0o755);
    const resource = makeContentWorkspaceResource({ gitExecutable: wrapper });
    const anchor = unwrap(
      await runNodeContentWorkspace(
        resource.inspectGitWorkspace({
          locator: root,
          remoteSelection: { kind: "All" },
          refName: "refs/heads/main",
        })
      )
    );
    await writeFile(log, "");
    const alphaBlob = testGitBlobId(alpha, anchor.objectFormat);
    const betaBlob = testGitBlobId(beta, anchor.objectFormat);

    const observations = unwrap(
      await runNodeContentWorkspace(
        resource.readGitBlobs({
          root,
          blobs: [betaBlob, alphaBlob],
          objectFormat: anchor.objectFormat,
          maxBlobs: 2,
          maxBlobBytes: 16,
          maxTotalBytes: 32,
        })
      )
    );

    expect(observations).toEqual([
      { blob: betaBlob, bytes: beta },
      { blob: alphaBlob, bytes: alpha },
    ]);
    const commands = (await readFile(log, "utf8")).trim().split("\n");
    expect(commands.filter((command) => /cat-file --batch$/u.test(command))).toHaveLength(1);
    expect(commands.some((command) => /cat-file (?:-t|blob)/u.test(command))).toBe(false);

    const tree = gitOutput(root, "rev-parse", "HEAD^{tree}");
    const wrongType = await runNodeContentWorkspace(
      resource.readGitBlobs({
        root,
        blobs: [tree],
        objectFormat: anchor.objectFormat,
        maxBlobs: 1,
        maxBlobBytes: 4 * 1024,
        maxTotalBytes: 4 * 1024,
      })
    );
    expect(wrongType).toMatchObject({
      ok: false,
      failure: {
        operation: "read-git-blob",
        reason: "UnsupportedEntry",
        detail: "Git object is not a blob",
      },
    });

    for (const invalid of [
      { blobs: [alphaBlob, alphaBlob], maxBlobs: 2, detail: "Git blob batch must be distinct" },
      { blobs: [alphaBlob, betaBlob], maxBlobs: 1, detail: "Git blob batch exceeds maxBlobs" },
    ] as const) {
      const result = await runNodeContentWorkspace(
        resource.readGitBlobs({
          root,
          blobs: invalid.blobs,
          objectFormat: anchor.objectFormat,
          maxBlobs: invalid.maxBlobs,
          maxBlobBytes: 16,
          maxTotalBytes: 32,
        })
      );
      expect(result).toMatchObject({
        ok: false,
        failure: { operation: "read-git-blob", reason: "InvalidInput", detail: invalid.detail },
      });
    }

    const memberBounded = await runNodeContentWorkspace(
      resource.readGitBlobs({
        root,
        blobs: [alphaBlob],
        objectFormat: anchor.objectFormat,
        maxBlobs: 1,
        maxBlobBytes: alpha.byteLength - 1,
        maxTotalBytes: alpha.byteLength,
      })
    );
    expect(memberBounded).toMatchObject({
      ok: false,
      failure: { operation: "read-git-blob", reason: "LimitExceeded" },
    });

    const bounded = await runNodeContentWorkspace(
      resource.readGitBlobs({
        root,
        blobs: [alphaBlob, betaBlob],
        objectFormat: anchor.objectFormat,
        maxBlobs: 2,
        maxBlobBytes: 16,
        maxTotalBytes: alpha.byteLength + beta.byteLength - 1,
      })
    );
    expect(bounded).toMatchObject({
      ok: false,
      failure: { operation: "read-git-blob", reason: "LimitExceeded" },
    });

    const missing = await runNodeContentWorkspace(
      resource.readGitBlobs({
        root,
        blobs: ["0".repeat(anchor.objectFormat === "sha1" ? 40 : 64)],
        objectFormat: anchor.objectFormat,
        maxBlobs: 1,
        maxBlobBytes: 16,
        maxTotalBytes: 16,
      })
    );
    expect(missing).toMatchObject({
      ok: false,
      failure: { operation: "read-git-blob", reason: "GitFailed" },
    });
  });

  test("rejects truncated native Git batch framing", async () => {
    const root = await createRepository();
    const payload = bytes("payload\n");
    await writeFile(path.join(root, "payload.txt"), payload);
    await git(root, "add", "payload.txt");
    await git(root, "commit", "-m", "add truncated batch fixture");
    const blob = testGitBlobId(payload, "sha1");
    const wrapper = path.join(root, "git-truncated-batch-wrapper");
    await writeFile(
      wrapper,
      [
        "#!/bin/sh",
        'case "$*" in',
        '  *"cat-file --batch") IFS= read -r oid; printf \'%s blob 8\\npayload\' "$oid"; exit 0 ;;',
        "esac",
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(wrapper, 0o755);
    const resource = makeContentWorkspaceResource({ gitExecutable: wrapper });

    const result = await runNodeContentWorkspace(
      resource.readGitBlobs({
        root,
        blobs: [blob],
        objectFormat: "sha1",
        maxBlobs: 1,
        maxBlobBytes: 16,
        maxTotalBytes: 16,
      })
    );
    expect(result).toMatchObject({
      ok: false,
      failure: {
        operation: "read-git-blob",
        reason: "GitFailed",
        detail: "Git blob batch returned truncated content",
      },
    });

    const invalidHeaderWrapper = path.join(root, "git-invalid-header-wrapper");
    await writeFile(
      invalidHeaderWrapper,
      [
        "#!/bin/sh",
        'case "$*" in',
        "  *\"cat-file --batch\") printf '\\377\\n'; exit 0 ;;",
        "esac",
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(invalidHeaderWrapper, 0o755);
    const invalidHeader = makeContentWorkspaceResource({ gitExecutable: invalidHeaderWrapper });
    const invalidHeaderResult = await runNodeContentWorkspace(
      invalidHeader.readGitBlobs({
        root,
        blobs: [blob],
        objectFormat: "sha1",
        maxBlobs: 1,
        maxBlobBytes: 16,
        maxTotalBytes: 16,
      })
    );
    expect(invalidHeaderResult).toMatchObject({
      ok: false,
      failure: {
        operation: "read-git-blob",
        reason: "GitFailed",
        detail: "Git blob batch returned a non-UTF-8 object header",
      },
    });
  });

  test("observes selected staged blobs without changing the staged or worktree view", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    await mkdir(path.join(root, "plugins", "one"), { recursive: true });
    await writeFile(path.join(root, "release.json"), "release\n");
    await writeFile(path.join(root, "plugins", "one", "payload.txt"), "payload\n");
    await writeFile(path.join(root, "unrelated.bin"), "x".repeat(8 * 1024));
    await symlink("release.json", path.join(root, "unrelated-link"));
    await git(root, "add", ".");
    await writeFile(path.join(root, "plugins", "one", "payload.txt"), "worktree-after-add\n");

    const resource = makeContentWorkspaceResource();

    const observation = unwrap(
      await runNodeContentWorkspace(
        resource.observeGitStagedIndex({
          locator: root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          materializedPaths: ["release.json"],
          materializedRoots: ["plugins/one"],
          maxEntries: 20,
          maxIndexBytes: 1024 * 1024,
          maxBlobBytes: 64,
        })
      )
    );

    expect(observation.opening).toEqual(observation.closing);
    expect(observation.opening.entries.map(({ path: entryPath }) => entryPath)).toEqual([
      ".gitkeep",
      "plugins/one/payload.txt",
      "release.json",
      "unrelated-link",
      "unrelated.bin",
    ]);
    expect(observation.opening.entries).toContainEqual({
      path: "unrelated-link",
      mode: "120000",
      objectId: expect.stringMatching(/^[0-9a-f]{40}$/u),
      stage: 0,
    });
    expect(Object.isFrozen(observation.opening.entries)).toBe(true);
    expect(observation.opening.entries.every((entry) => Object.isFrozen(entry))).toBe(true);
    expect(observation.blobs.map((blob) => new TextDecoder().decode(blob.bytes)).sort()).toEqual([
      "payload\n",
      "release\n",
    ]);
    expect(await readFile(path.join(root, "plugins", "one", "payload.txt"), "utf8")).toBe(
      "worktree-after-add\n"
    );
  });

  test("admits ordered SHA-256 conflict and nonregular staged facts without materializing them", async () => {
    const root = await createRepository("sha256");
    await git(root, "remote", "add", "origin", root);
    const objectId = "a".repeat(64);
    const wrapper = path.join(root, "git-staged-sha256-wrapper");
    await writeFile(
      wrapper,
      [
        "#!/bin/sh",
        'if [ "$1" = "ls-files" ]; then',
        `  printf '160000 ${objectId} 0\\tzeta\\0'; printf '100644 ${objectId} 2\\tconflict.txt\\0'; printf '100644 ${objectId} 1\\tconflict.txt\\0'`,
        "  exit 0",
        "fi",
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(wrapper, 0o755);

    const observation = unwrap(
      await runNodeContentWorkspace(
        makeContentWorkspaceResource({ gitExecutable: wrapper }).observeGitStagedIndex({
          locator: root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          materializedPaths: [],
          materializedRoots: [],
          maxEntries: 3,
          maxIndexBytes: 1024,
          maxBlobBytes: 1,
        })
      )
    );

    expect(observation.opening.entries).toEqual([
      { path: "conflict.txt", mode: "100644", objectId, stage: 1 },
      { path: "conflict.txt", mode: "100644", objectId, stage: 2 },
      { path: "zeta", mode: "160000", objectId, stage: 0 },
    ]);
    expect(observation.opening).toEqual(observation.closing);
    expect(observation.blobs).toEqual([]);
  });

  test("rejects malformed staged Git records at the public resource boundary", async () => {
    const root = await createRepository();
    await git(root, "remote", "add", "origin", root);
    const objectId = "a".repeat(40);
    const cases = [
      {
        name: "truncated",
        output: `printf '100644 ${objectId} 0\\tpayload.txt'`,
        reason: "GitFailed",
        detail: "terminal NUL",
        maxEntries: 10,
        maxIndexBytes: 1024,
      },
      {
        name: "malformed",
        output: "printf 'malformed\\0'",
        reason: "GitFailed",
        detail: "malformed",
        maxEntries: 10,
        maxIndexBytes: 1024,
      },
      {
        name: "invalid-utf8",
        output: "printf '\\377\\0'",
        reason: "GitFailed",
        detail: "invalid UTF-8",
        maxEntries: 10,
        maxIndexBytes: 1024,
      },
      {
        name: "wrong-object-format",
        output: `printf '100644 ${"a".repeat(64)} 0\\tpayload.txt\\0'`,
        reason: "GitFailed",
        detail: "object format",
        maxEntries: 10,
        maxIndexBytes: 1024,
      },
      {
        name: "invalid-path",
        output: `printf '100644 ${objectId} 0\\t../escape\\0'`,
        reason: "UnsupportedEntry",
        detail: "staged-entry contract",
        maxEntries: 10,
        maxIndexBytes: 1024,
      },
      {
        name: "duplicate-path-stage",
        output: `printf '100644 ${objectId} 0\\tpayload.txt\\0'; printf '100755 ${objectId} 0\\tpayload.txt\\0'`,
        reason: "GitFailed",
        detail: "duplicate path and stage",
        maxEntries: 10,
        maxIndexBytes: 1024,
      },
      {
        name: "entry-bound",
        output: `printf '100644 ${objectId} 0\\tone\\0'; printf '100644 ${objectId} 0\\ttwo\\0'`,
        reason: "LimitExceeded",
        detail: "maxEntries",
        maxEntries: 1,
        maxIndexBytes: 1024,
      },
      {
        name: "byte-bound",
        output: `printf '100644 ${objectId} 0\\tpayload.txt\\0'`,
        reason: "LimitExceeded",
        detail: "exceeds",
        maxEntries: 10,
        maxIndexBytes: 1,
      },
    ];

    for (const fixture of cases) {
      const wrapper = path.join(root, `git-staged-${fixture.name}-wrapper`);
      await writeFile(
        wrapper,
        [
          "#!/bin/sh",
          'if [ "$1" = "ls-files" ]; then',
          `  ${fixture.output}`,
          "  exit 0",
          "fi",
          `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
          "",
        ].join("\n")
      );
      await chmod(wrapper, 0o755);

      const result = await runNodeContentWorkspace(
        makeContentWorkspaceResource({ gitExecutable: wrapper }).observeGitStagedIndex({
          locator: root,
          remoteSelection: { kind: "Named", remoteName: "origin" },
          refName: "refs/heads/main",
          materializedPaths: [],
          materializedRoots: [],
          maxEntries: fixture.maxEntries,
          maxIndexBytes: fixture.maxIndexBytes,
          maxBlobBytes: 1,
        })
      );

      expect(result).toMatchObject({
        ok: false,
        failure: {
          operation: "observe-git-staged-index",
          reason: fixture.reason,
          detail: expect.stringContaining(fixture.detail),
        },
      });
    }
  });

  test("binds local ancestry and changed paths to exact commits", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });
    const before = unwrap(
      await runNodeContentWorkspace(
        resource.inspectGitWorkspace({
          locator: root,
          remoteSelection: { kind: "All" },
          refName: "refs/heads/main",
        })
      )
    );
    await writeFile(path.join(root, "changed.txt"), "changed\n");
    await git(root, "add", "changed.txt");
    await git(root, "commit", "-m", "change");
    const after = unwrap(
      await runNodeContentWorkspace(
        resource.inspectGitWorkspace({
          locator: root,
          remoteSelection: { kind: "All" },
          refName: "refs/heads/main",
        })
      )
    );

    expect(
      unwrap(
        await runNodeContentWorkspace(
          resource.isLocalGitAncestor({
            root,
            ancestorCommit: before.commit,
            descendantCommit: after.commit,
          })
        )
      )
    ).toBe(true);
    const changed = unwrap(
      await runNodeContentWorkspace(
        resource.listGitChangedPaths({
          root,
          fromCommit: before.commit,
          toCommit: after.commit,
          maxBytes: 1024,
        })
      )
    );
    expect(new TextDecoder().decode(changed)).toBe("changed.txt\0");
  });

  test("resolves Git through the ordinary process path by default", async () => {
    const root = await createRepository();
    const result = await runNodeContentWorkspace(
      makeContentWorkspaceResource().inspectGitWorkspace({
        locator: root,
        remoteSelection: { kind: "All" },
        refName: "refs/heads/main",
      })
    );
    expect(unwrap(result)).toMatchObject({ root, refName: "refs/heads/main" });
  });

  test("inherits operator Git configuration for local operations", async () => {
    const root = await createRepository();
    const wrapper = path.join(root, "git-wrapper");
    const log = path.join(root, "git-wrapper.log");
    const inheritedConfig = path.join(root, "operator.gitconfig");
    await writeFile(inheritedConfig, "");
    await writeFile(
      wrapper,
      [
        "#!/bin/sh",
        `printf '%s|%s|%s\\n' "\${GIT_CONFIG_GLOBAL-UNSET}" "\${GIT_CONFIG_NOSYSTEM-UNSET}" "$*" >> ${JSON.stringify(log)}`,
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(wrapper, 0o755);

    const previousGlobal = process.env.GIT_CONFIG_GLOBAL;
    const previousNoSystem = process.env.GIT_CONFIG_NOSYSTEM;
    process.env.GIT_CONFIG_GLOBAL = inheritedConfig;
    process.env.GIT_CONFIG_NOSYSTEM = "0";
    try {
      const resource = makeContentWorkspaceResource({ gitExecutable: wrapper });
      unwrap(
        await runNodeContentWorkspace(
          resource.inspectGitWorkspace({
            locator: root,
            remoteSelection: { kind: "All" },
            refName: "refs/heads/main",
          })
        )
      );
    } finally {
      restoreEnvironment("GIT_CONFIG_GLOBAL", previousGlobal);
      restoreEnvironment("GIT_CONFIG_NOSYSTEM", previousNoSystem);
    }

    const records = (await readFile(log, "utf8")).trim().split("\n");
    expect(records.every((record) => record.startsWith(`${inheritedConfig}|0|`))).toBe(true);
    expect(records.some((record) => record.includes("|rev-parse"))).toBe(true);
  });

  test("reports an unavailable Git command as a typed provider failure", async () => {
    const root = await createRepository();
    const result = await Effect.runPromise(
      Effect.result(
        makeNodeContentWorkspaceResource({
          gitExecutable: "rawr-git-command-not-found",
        }).inspectGitWorkspace({
          locator: root,
          remoteSelection: { kind: "All" },
          refName: "refs/heads/main",
        })
      )
    );

    expect(result._tag).toBe("Failure");
    if (result._tag !== "Failure") throw new Error("Expected unavailable Git to fail");
    expect(result.failure).toMatchObject({
      operation: "inspect-git-workspace",
      reason: "GitFailed",
      path: root,
    });
  });

  test("attributes capture anchor failures to the evidence operation", async () => {
    const root = await createRepository();
    const resource = makeContentWorkspaceResource({ gitExecutable: await realpath(gitExecutable) });

    const result = await runNodeContentWorkspace(
      resource.captureGitWorkspaceEvidence({
        root: path.join(root, "missing-root"),
        remoteSelection: { kind: "All" },
        refName: "refs/heads/main",
        admittedPaths: [],
        consumedRoots: [],
        objectFormat: "sha1",
        maxPaths: 1,
        maxWorktreeFileBytes: 1024,
        maxWorktreeBytes: 1024,
        maxBytes: 1024,
      })
    );

    expect(result).toMatchObject({
      ok: false,
      failure: { operation: "capture-git-evidence", reason: "Missing" },
    });
  });
});

async function createRepository(objectFormat: "sha1" | "sha256" = "sha1"): Promise<string> {
  const root = await createFixtureDirectory();
  await initializeRepository(root, objectFormat);
  return root;
}

async function createFixtureDirectory(): Promise<string> {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, FIXTURE_PREFIX));
  const identity = await lstat(root);
  roots.push({ parent, root, dev: identity.dev, ino: identity.ino });
  return root;
}

async function initializeRepository(
  root: string,
  objectFormat: "sha1" | "sha256" = "sha1"
): Promise<void> {
  await git(root, "init", `--object-format=${objectFormat}`, "--initial-branch=main");
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
    canonicalParent !== owner.parent ||
    canonicalRoot !== owner.root ||
    path.dirname(owner.root) !== owner.parent ||
    !path.basename(owner.root).startsWith(FIXTURE_PREFIX) ||
    !identity.isDirectory() ||
    identity.isSymbolicLink() ||
    identity.dev !== owner.dev ||
    identity.ino !== owner.ino
  ) {
    throw new Error("Refusing recursive cleanup of an unowned or substituted test fixture");
  }
  await rm(owner.root, { recursive: true, force: false });
}

async function git(root: string, ...args: readonly string[]): Promise<void> {
  const result = Bun.spawnSync([gitExecutable, ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
}

function gitOutput(root: string, ...args: readonly string[]): string {
  const result = Bun.spawnSync([gitExecutable, ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  return new TextDecoder().decode(result.stdout).trim();
}

function unwrap<A>(result: NodeContentWorkspaceResult<A>): A {
  if (result.ok) return result.value;
  throw new Error(`${result.failure.reason}: ${result.failure.detail}`);
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function testGitBlobId(value: Uint8Array, objectFormat: "sha1" | "sha256"): string {
  const digest = createHash(objectFormat);
  digest.update(bytes(`blob ${value.byteLength}\0`));
  digest.update(value);
  return digest.digest("hex");
}

function requireExecutable(name: string): string {
  const executable = Bun.which(name);
  if (executable === null) throw new Error(`Required test executable is missing: ${name}`);
  return executable;
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NodeServices } from "@effect/platform-node";
import {
  MAX_VERSIONED_CONTENT_FAILURE_DETAIL,
  type VersionedContentFailure,
} from "@rawr/resource-versioned-content";
import { Cause, Effect, Exit, Fiber, FileSystem, PlatformError } from "effect";

import { makeNodeVersionedContentResource, makeVersionedContentResource } from "../index";

type VersionedContentResult<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: VersionedContentFailure }>;

const gitExecutable = requireExecutable("git");
const FIXTURE_PREFIX = "rawr-versioned-content-test-";
const PRIVATE_GIT_PREFIX = "rawr-versioned-content-git-";

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

describe("Git Effect Platform Node versioned-content provider", () => {
  test("observes, materializes, and checks ancestry at the exact selected ref", async () => {
    const root = await createRepository();
    await mkdir(path.join(root, "payload", "nested"), { recursive: true });
    await writeFile(path.join(root, "payload", "nested", "value.txt"), "version one\n");
    await writeFile(path.join(root, "payload", "tool.sh"), "#!/bin/sh\necho one\n");
    await chmod(path.join(root, "payload", "tool.sh"), 0o755);
    await git(root, "add", "payload");
    await git(root, "commit", "-m", "version one");
    const selectedCommit = gitOutput(root, "rev-parse", "HEAD");
    await git(root, "branch", "selected", selectedCommit);

    await writeFile(path.join(root, "payload", "nested", "value.txt"), "version two\n");
    await git(root, "add", "payload/nested/value.txt");
    await git(root, "commit", "-m", "version two");
    const latestCommit = gitOutput(root, "rev-parse", "HEAD");

    await withIsolatedProviderTemp(root, async () => {
      const resource = makeNodeVersionedContentResource();
      const observed = unwrap(
        await runVersionedContent(
          resource.observeRemote({
            repositoryIdentity: root,
            refName: "refs/heads/selected",
            sourcePath: "payload",
            maxEntries: 10,
          })
        )
      );
      const materialized = unwrap(
        await runVersionedContent(
          resource.materializeRemote({
            repositoryIdentity: root,
            refName: "refs/heads/selected",
            sourcePath: "payload",
            maxEntries: 10,
            maxBytes: 1_024,
          })
        )
      );

      const selectedTree = gitOutput(root, "rev-parse", `${selectedCommit}:payload`);
      expect(observed).toEqual({
        repositoryIdentity: root,
        refName: "refs/heads/selected",
        sourcePath: "payload",
        commit: selectedCommit,
        tree: selectedTree,
        objectFormat: gitOutput(root, "rev-parse", "--show-object-format"),
        entries: [
          {
            path: "nested/value.txt",
            mode: "100644",
            blob: gitOutput(root, "rev-parse", `${selectedCommit}:payload/nested/value.txt`),
          },
          {
            path: "tool.sh",
            mode: "100755",
            blob: gitOutput(root, "rev-parse", `${selectedCommit}:payload/tool.sh`),
          },
        ],
      });
      expect(materialized).toMatchObject(observed);
      expect(
        materialized.entries.map((entry) => [entry.path, new TextDecoder().decode(entry.bytes)])
      ).toEqual([
        ["nested/value.txt", "version one\n"],
        ["tool.sh", "#!/bin/sh\necho one\n"],
      ]);

      expect(
        unwrap(
          await runVersionedContent(
            resource.isAncestor({
              repositoryIdentity: root,
              refName: "refs/heads/main",
              ancestorCommit: selectedCommit,
              descendantCommit: latestCommit,
            })
          )
        )
      ).toBe(true);
      expect(
        unwrap(
          await runVersionedContent(
            resource.isAncestor({
              repositoryIdentity: root,
              refName: "refs/heads/main",
              ancestorCommit: latestCommit,
              descendantCommit: selectedCommit,
            })
          )
        )
      ).toBe(false);
      const missingCommit = "f".repeat(selectedCommit.length);
      const missing = await runVersionedContent(
        resource.isAncestor({
          repositoryIdentity: root,
          refName: "refs/heads/main",
          ancestorCommit: missingCommit,
          descendantCommit: latestCommit,
        })
      );
      expect(missing.ok).toBe(false);
      if (!missing.ok) {
        expect(missing.failure.operation).toBe("ancestry");
        expect(missing.failure.reason).toBe("CommandFailed");
      }
    });
  });

  test("enforces request, tree-entry, and aggregate materialization bounds", async () => {
    const root = await createRepository();
    await mkdir(path.join(root, "payload"));
    await writeFile(path.join(root, "payload", "first.txt"), "first\n");
    await writeFile(path.join(root, "payload", "second.txt"), "second\n");
    await git(root, "add", "payload");
    await git(root, "commit", "-m", "bounded payload");

    await withIsolatedProviderTemp(root, async () => {
      const resource = makeNodeVersionedContentResource();
      expect(
        await runVersionedContent(
          resource.observeRemote({
            repositoryIdentity: root,
            refName: "refs/heads/main",
            sourcePath: "payload",
            maxEntries: 1,
          })
        )
      ).toMatchObject({
        ok: false,
        failure: {
          _tag: "VersionedContentFailure",
          operation: "observe-remote",
          reason: "LimitExceeded",
        },
      });
      expect(
        await runVersionedContent(
          resource.materializeRemote({
            repositoryIdentity: root,
            refName: "refs/heads/main",
            sourcePath: "payload",
            maxEntries: 10,
            maxBytes: 1,
          })
        )
      ).toMatchObject({
        ok: false,
        failure: { operation: "materialize-remote", reason: "LimitExceeded" },
      });
      expect(
        await runVersionedContent(
          resource.observeRemote({
            repositoryIdentity: root,
            refName: "refs/heads/main",
            sourcePath: "payload",
            maxEntries: 0,
          })
        )
      ).toMatchObject({
        ok: false,
        failure: { operation: "observe-remote", reason: "InvalidInput" },
      });
      expect(
        await runVersionedContent(
          resource.observeRemote({
            repositoryIdentity: root,
            refName: "main",
            sourcePath: "payload",
            maxEntries: 1,
          })
        )
      ).toMatchObject({
        ok: false,
        failure: { operation: "observe-remote", reason: "InvalidInput" },
      });
      expect(
        await runVersionedContent(
          resource.observeRemote({
            repositoryIdentity: root,
            refName: "refs/heads/main",
            sourcePath: "../payload",
            maxEntries: 1,
          })
        )
      ).toMatchObject({
        ok: false,
        failure: { operation: "observe-remote", reason: "InvalidInput" },
      });
      expect(
        await runVersionedContent(
          resource.isAncestor({
            repositoryIdentity: root,
            refName: "refs/heads/main",
            ancestorCommit: "not-an-object",
            descendantCommit: gitOutput(root, "rev-parse", "HEAD"),
          })
        )
      ).toMatchObject({
        ok: false,
        failure: { operation: "ancestry", reason: "InvalidInput" },
      });

      await symlink("first.txt", path.join(root, "payload", "link"));
      await git(root, "add", "payload/link");
      await git(root, "commit", "-m", "unsupported symlink");
      expect(
        await runVersionedContent(
          resource.observeRemote({
            repositoryIdentity: root,
            refName: "refs/heads/main",
            sourcePath: "payload",
            maxEntries: 10,
          })
        )
      ).toMatchObject({
        ok: false,
        failure: { operation: "observe-remote", reason: "UnsupportedEntry" },
      });
    });
  });

  test("inherits operator Git configuration through the test-only executable override", async () => {
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

    await withIsolatedProviderTemp(root, async () => {
      const previousGlobal = process.env.GIT_CONFIG_GLOBAL;
      const previousNoSystem = process.env.GIT_CONFIG_NOSYSTEM;
      process.env.GIT_CONFIG_GLOBAL = inheritedConfig;
      process.env.GIT_CONFIG_NOSYSTEM = "0";
      try {
        unwrap(
          await runVersionedContent(
            makeNodeVersionedContentResource({ gitExecutable: wrapper }).observeRemote({
              repositoryIdentity: root,
              refName: "refs/heads/main",
              sourcePath: "",
              maxEntries: 10,
            })
          )
        );
      } finally {
        restoreEnvironment("GIT_CONFIG_GLOBAL", previousGlobal);
        restoreEnvironment("GIT_CONFIG_NOSYSTEM", previousNoSystem);
      }
    });

    const records = (await readFile(log, "utf8")).trim().split("\n");
    expect(records.every((record) => record.startsWith(`${inheritedConfig}|0|`))).toBe(true);
    expect(records.some((record) => record.includes("|init --bare ."))).toBe(true);
    expect(records.some((record) => record.includes("|remote add content"))).toBe(true);
    expect(records.some((record) => record.includes("|fetch --quiet --no-tags"))).toBe(true);
    expect(records.some((record) => record.includes("|rev-parse --verify"))).toBe(true);
  });

  test("reports fetch failure and releases its exact private Git directory", async () => {
    const root = await createRepository();
    await withIsolatedProviderTemp(root, async () => {
      const result = await runVersionedContent(
        makeNodeVersionedContentResource().observeRemote({
          repositoryIdentity: path.join(root, "missing.git"),
          refName: "refs/heads/main",
          sourcePath: "",
          maxEntries: 1,
        })
      );

      expect(result).toMatchObject({
        ok: false,
        failure: {
          _tag: "VersionedContentFailure",
          operation: "observe-remote",
          reason: "CommandFailed",
        },
      });
      if (!result.ok) {
        expect(result.failure.detail.length).toBeLessThanOrEqual(
          MAX_VERSIONED_CONTENT_FAILURE_DETAIL
        );
      }
    });
  });

  test("releases private Git state when post-allocation validation fails", async () => {
    const root = await createRepository();
    const resource = makeVersionedContentResource({ gitExecutable });
    await withIsolatedProviderTemp(root, async () => {
      let injected = false;
      const operation = Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const faulting: FileSystem.FileSystem = {
          ...fs,
          realPath: (candidate) => {
            if (!injected && path.basename(candidate).startsWith(PRIVATE_GIT_PREFIX)) {
              injected = true;
              return Effect.fail(
                PlatformError.systemError({
                  _tag: "Busy",
                  module: "FileSystem",
                  method: "realPath",
                  pathOrDescriptor: candidate,
                })
              );
            }
            return fs.realPath(candidate);
          },
        };
        return yield* resource
          .observeRemote({
            repositoryIdentity: root,
            refName: "refs/heads/main",
            sourcePath: "",
            maxEntries: 1,
          })
          .pipe(Effect.provideService(FileSystem.FileSystem, faulting));
      }).pipe(Effect.provide(NodeServices.layer));

      const result = await runVersionedContent(operation);
      expect(injected).toBe(true);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.failure.operation).toBe("observe-remote");
        expect(result.failure.reason).toBe("FilesystemFailed");
      }
    });
  });

  test("interrupts Git use and releases its exact private Git directory", {
    timeout: 10_000,
  }, async () => {
    const root = await createRepository();
    const wrapper = path.join(root, "interruptible-git");
    const started = path.join(root, "fetch-started");
    const stopped = path.join(root, "fetch-stopped");
    await writeFile(
      wrapper,
      [
        "#!/bin/sh",
        'child=""',
        `stopped=${JSON.stringify(stopped)}`,
        'trap \'if test -n "$child"; then kill "$child" 2>/dev/null; wait "$child" 2>/dev/null; fi; printf "stopped\\n" > "$stopped"; exit 143\' TERM INT',
        'if [ "$1" = "fetch" ]; then',
        `  printf 'started\\n' > ${JSON.stringify(started)}`,
        "  sleep 30 &",
        "  child=$!",
        '  wait "$child"',
        "  exit 1",
        "fi",
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );
    await chmod(wrapper, 0o755);

    await withIsolatedProviderTemp(root, async () => {
      const fiber = Effect.runFork(
        makeNodeVersionedContentResource({ gitExecutable: wrapper }).observeRemote({
          repositoryIdentity: root,
          refName: "refs/heads/main",
          sourcePath: "",
          maxEntries: 10,
        })
      );
      await waitForFile(started);
      await Effect.runPromise(Fiber.interrupt(fiber));
      const exit = await Effect.runPromise(Fiber.await(fiber));
      expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
      await waitForFile(stopped);
    });
  });
});

function runVersionedContent<A>(
  operation: Effect.Effect<A, VersionedContentFailure>
): Promise<VersionedContentResult<A>> {
  return Effect.runPromise(
    operation.pipe(
      Effect.map((value): VersionedContentResult<A> => ({ ok: true, value })),
      Effect.catch((failure) => Effect.succeed<VersionedContentResult<A>>({ ok: false, failure }))
    )
  );
}

async function withIsolatedProviderTemp<A>(fixtureRoot: string, use: () => Promise<A>): Promise<A> {
  const providerTemp = path.join(fixtureRoot, "provider-temp");
  await mkdir(providerTemp);
  const canonicalProviderTemp = await realpath(providerTemp);
  const previousTmp = process.env.TMPDIR;
  process.env.TMPDIR = canonicalProviderTemp;
  try {
    return await use();
  } finally {
    restoreEnvironment("TMPDIR", previousTmp);
    const privateRoots = (await readdir(canonicalProviderTemp))
      .filter((entry) => entry.startsWith(PRIVATE_GIT_PREFIX))
      .sort();
    expect(privateRoots).toEqual([]);
  }
}

async function createRepository(): Promise<string> {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, FIXTURE_PREFIX));
  const identity = await lstat(root);
  roots.push({ parent, root, dev: identity.dev, ino: identity.ino });
  await git(root, "init", "--initial-branch=main");
  await git(root, "config", "user.email", "test@rawr.local");
  await git(root, "config", "user.name", "RAWR Test");
  await writeFile(path.join(root, ".gitkeep"), "");
  await git(root, "add", ".gitkeep");
  await git(root, "commit", "-m", "initial");
  return root;
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

async function waitForFile(candidate: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (!(await Bun.file(candidate).exists())) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${candidate}`);
    await Bun.sleep(10);
  }
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

function unwrap<A>(result: VersionedContentResult<A>): A {
  if (result.ok) return result.value;
  throw new Error(`${result.failure.reason}: ${result.failure.detail}`);
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

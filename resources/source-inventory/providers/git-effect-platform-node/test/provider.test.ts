import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  isSourceInventoryFailure,
  MAX_SOURCE_INVENTORY_FAILURE_DETAIL,
  type SourceInventoryFailure,
} from "@habitat-ai/resource-source-inventory";
import { Cause, Effect, Exit, Fiber } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";

import { makeGitSourceInventoryResource, makeNodeGitSourceInventoryResource } from "../index";

type SourceInventoryOutcome<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: SourceInventoryFailure }>;

const gitExecutable = requireExecutable("git");
const FIXTURE_PREFIX = "habitat-source-inventory-test-";

interface FixtureOwner {
  readonly parent: string;
  readonly root: string;
  readonly dev: number;
  readonly ino: number;
}

interface RepositoryFixture {
  readonly fixture: string;
  readonly repository: string;
}

const fixtures: FixtureOwner[] = [];

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await removeOwnedFixture(fixture);
});

describe("Git Effect Platform Node source-inventory provider", () => {
  test("includes tracked and untracked nonignored paths in canonical order", async () => {
    const { repository } = await createRepository();
    await mkdir(path.join(repository, "tracked"));
    await mkdir(path.join(repository, "ignored"));
    await writeFile(path.join(repository, ".gitignore"), "ignored/\n*.log\n");
    await writeFile(path.join(repository, "tracked", "z.txt"), "z\n");
    await writeFile(path.join(repository, "tracked", "a.txt"), "a\n");
    await git(repository, "add", ".gitignore", "tracked");
    await writeFile(path.join(repository, "untracked.txt"), "visible\n");
    await writeFile(path.join(repository, "ignored", "private.txt"), "ignored\n");
    await writeFile(path.join(repository, "debug.log"), "ignored\n");

    const result = unwrap(
      await runInventory(
        makeNodeGitSourceInventoryResource().observe({ root: repository, maxEntries: 20 })
      )
    );

    expect(result).toEqual({
      paths: [".gitignore", "tracked/a.txt", "tracked/z.txt", "untracked.txt"],
      trackedNonFilePaths: [],
    });
  });

  test("normalizes an untracked embedded repository directory sentinel", async () => {
    const { repository } = await createRepository();
    const nested = path.join(repository, "nested");
    await mkdir(nested);
    await git(nested, "init", "--initial-branch=main");

    expect(
      unwrap(
        await runInventory(
          makeNodeGitSourceInventoryResource().observe({ root: repository, maxEntries: 1 })
        )
      )
    ).toEqual({ paths: ["nested"], trackedNonFilePaths: [] });
  });

  test("runs the exact installed command in the root with inherited Git configuration", async () => {
    const { fixture, repository } = await createRepository();
    const wrapper = path.join(fixture, "git-wrapper");
    const log = path.join(fixture, "git-wrapper.log");
    const inheritedConfig = path.join(fixture, "operator.gitconfig");
    await writeFile(path.join(repository, "visible.txt"), "visible\n");
    await writeFile(inheritedConfig, "");
    await writeExecutable(
      wrapper,
      [
        "#!/bin/sh",
        `printf '%s\\n' "$PWD" > ${JSON.stringify(log)}`,
        `printf '%s|%s\\n' "\${GIT_CONFIG_GLOBAL-UNSET}" "\${GIT_CONFIG_NOSYSTEM-UNSET}" >> ${JSON.stringify(log)}`,
        `printf '%s\\n' "$*" >> ${JSON.stringify(log)}`,
        `exec ${JSON.stringify(await realpath(gitExecutable))} "$@"`,
        "",
      ].join("\n")
    );

    const previousGlobal = process.env.GIT_CONFIG_GLOBAL;
    const previousNoSystem = process.env.GIT_CONFIG_NOSYSTEM;
    process.env.GIT_CONFIG_GLOBAL = inheritedConfig;
    process.env.GIT_CONFIG_NOSYSTEM = "0";
    try {
      expect(
        unwrap(
          await runInventory(
            makeNodeGitSourceInventoryResource({ gitExecutable: wrapper }).observe({
              root: repository,
              maxEntries: 10,
            })
          )
        )
      ).toEqual({ paths: ["visible.txt"], trackedNonFilePaths: [] });
    } finally {
      restoreEnvironment("GIT_CONFIG_GLOBAL", previousGlobal);
      restoreEnvironment("GIT_CONFIG_NOSYSTEM", previousNoSystem);
    }

    expect((await readFile(log, "utf8")).trim().split("\n")).toEqual([
      repository,
      `${inheritedConfig}|0`,
      "ls-files --cached --others --exclude-standard --stage --abbrev=1 -t -z",
    ]);
  });

  test("deduplicates provider records without consuming the unique entry bound", async () => {
    const fixture = await createFixtureDirectory();
    const executable = path.join(fixture, "deduplicating-git");
    await writeExecutable(
      executable,
      "#!/bin/sh\nprintf 'H 100644 a 0\\tz.txt\\000? a.txt\\000H 100755 b 0\\tz.txt\\000H 120000 c 0\\tlink\\000H 160000 d 0\\tgitlink\\000'\n"
    );

    expect(
      unwrap(
        await runInventory(
          makeNodeGitSourceInventoryResource({ gitExecutable: executable }).observe({
            root: fixture,
            maxEntries: 4,
          })
        )
      )
    ).toEqual({
      paths: ["a.txt", "gitlink", "link", "z.txt"],
      trackedNonFilePaths: ["gitlink", "link"],
    });
  });

  test("admits tracked and untracked Unicode line separators symmetrically", async () => {
    const fixture = await createFixtureDirectory();
    const executable = path.join(fixture, "unicode-git");
    const separator = "\u2028";
    await writeExecutable(
      executable,
      `#!/bin/sh\nprintf 'H 100644 a 0\\ttracked${separator}entry\\000? untracked${separator}entry\\000'\n`
    );

    expect(
      unwrap(
        await runInventory(
          makeNodeGitSourceInventoryResource({ gitExecutable: executable }).observe({
            root: fixture,
            maxEntries: 2,
          })
        )
      )
    ).toEqual({
      paths: [`tracked${separator}entry`, `untracked${separator}entry`],
      trackedNonFilePaths: [],
    });
  });

  test("identifies a tracked symlink without filesystem classification", async () => {
    const { repository } = await createRepository();
    await writeFile(path.join(repository, "target.txt"), "target\n");
    await symlink("target.txt", path.join(repository, "link"));
    await git(repository, "add", "target.txt", "link");

    expect(
      unwrap(
        await runInventory(
          makeNodeGitSourceInventoryResource().observe({ root: repository, maxEntries: 10 })
        )
      )
    ).toEqual({
      paths: ["link", "target.txt"],
      trackedNonFilePaths: ["link"],
    });
  });

  test("combines mixed regular and symlink modes from a real unmerged index", async () => {
    const { fixture, repository } = await createRepository();
    const regularContents = path.join(fixture, "regular-blob");
    const symlinkContents = path.join(fixture, "symlink-blob");
    await writeFile(regularContents, "regular contents\n");
    await writeFile(symlinkContents, "target");
    const regularBlob = Bun.spawnSync([gitExecutable, "hash-object", "-w", regularContents], {
      cwd: repository,
      stdout: "pipe",
      stderr: "pipe",
    });
    const symlinkBlob = Bun.spawnSync([gitExecutable, "hash-object", "-w", symlinkContents], {
      cwd: repository,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(regularBlob.exitCode).toBe(0);
    expect(symlinkBlob.exitCode).toBe(0);
    const regularObjectId = new TextDecoder().decode(regularBlob.stdout).trim();
    const symlinkObjectId = new TextDecoder().decode(symlinkBlob.stdout).trim();

    const indexInfo = path.join(fixture, "index-info");
    await writeFile(
      indexInfo,
      [
        `100644 ${regularObjectId} 1\tentry`,
        `100644 ${regularObjectId} 2\tentry`,
        `120000 ${symlinkObjectId} 3\tentry`,
        "",
      ].join("\n")
    );
    const updateIndex = Bun.spawnSync([gitExecutable, "update-index", "--index-info"], {
      cwd: repository,
      stdin: Bun.file(indexInfo),
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(updateIndex.exitCode).toBe(0);

    const stagedEntry = Bun.spawnSync([gitExecutable, "ls-files", "--stage", "--", "entry"], {
      cwd: repository,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stagedEntry.exitCode).toBe(0);
    expect(new TextDecoder().decode(stagedEntry.stdout).trim().split("\n")).toEqual([
      `100644 ${regularObjectId} 1\tentry`,
      `100644 ${regularObjectId} 2\tentry`,
      `120000 ${symlinkObjectId} 3\tentry`,
    ]);

    expect(
      unwrap(
        await runInventory(
          makeNodeGitSourceInventoryResource().observe({ root: repository, maxEntries: 1 })
        )
      )
    ).toEqual({ paths: ["entry"], trackedNonFilePaths: ["entry"] });
  });

  test("keeps deleted and type-replaced tracked entries in the visible set", async () => {
    const { repository } = await createRepository();
    await writeFile(path.join(repository, "deleted.txt"), "deleted\n");
    await writeFile(path.join(repository, "replaced"), "file\n");
    await git(repository, "add", "deleted.txt", "replaced");
    await rm(path.join(repository, "deleted.txt"));
    await rm(path.join(repository, "replaced"));
    await mkdir(path.join(repository, "replaced"));
    await writeFile(path.join(repository, "replaced", "child.txt"), "child\n");

    expect(
      unwrap(
        await runInventory(
          makeNodeGitSourceInventoryResource().observe({ root: repository, maxEntries: 10 })
        )
      )
    ).toEqual({
      paths: ["deleted.txt", "replaced", "replaced/child.txt"],
      trackedNonFilePaths: [],
    });
  });

  test("admits an empty Git-visible inventory", async () => {
    const { repository } = await createRepository();
    expect(
      unwrap(
        await runInventory(
          makeNodeGitSourceInventoryResource().observe({ root: repository, maxEntries: 1 })
        )
      )
    ).toEqual({ paths: [], trackedNonFilePaths: [] });
  });

  test("rejects truncated, unsafe, and tracked directory-sentinel output", async () => {
    const fixture = await createFixtureDirectory();
    const truncated = path.join(fixture, "truncated-git");
    await writeExecutable(truncated, "#!/bin/sh\nprintf 'H 100644 a 0\\tbroken.txt'\n");
    expect(
      await runInventory(
        makeNodeGitSourceInventoryResource({ gitExecutable: truncated }).observe({
          root: fixture,
          maxEntries: 10,
        })
      )
    ).toMatchObject({
      ok: false,
      failure: { reason: "InvalidOutput" },
    });

    const unsafe = path.join(fixture, "unsafe-git");
    await writeExecutable(unsafe, "#!/bin/sh\nprintf '? ../outside\\000'\n");
    expect(
      await runInventory(
        makeNodeGitSourceInventoryResource({ gitExecutable: unsafe }).observe({
          root: fixture,
          maxEntries: 10,
        })
      )
    ).toMatchObject({
      ok: false,
      failure: { reason: "InvalidOutput" },
    });

    const trackedSentinel = path.join(fixture, "tracked-sentinel-git");
    await writeExecutable(trackedSentinel, "#!/bin/sh\nprintf 'H 100644 a 0\\ttracked/\\000'\n");
    expect(
      await runInventory(
        makeNodeGitSourceInventoryResource({ gitExecutable: trackedSentinel }).observe({
          root: fixture,
          maxEntries: 10,
        })
      )
    ).toMatchObject({
      ok: false,
      failure: { reason: "InvalidOutput" },
    });
  });

  test("rejects structurally invalid provider options before command construction", async () => {
    const fixture = await createFixtureDirectory();
    const invalidOptions = [
      { gitExecutable: "" },
      { gitExecutable: "git\0invalid" },
      { gitExecutable, unexpected: true },
    ];

    for (const options of invalidOptions) {
      expect(
        await runInventory(
          makeNodeGitSourceInventoryResource(options).observe({ root: fixture, maxEntries: 10 })
        )
      ).toMatchObject({
        ok: false,
        failure: { reason: "InvalidInput" },
      });
    }
  });

  test("refuses an inventory beyond maxEntries", async () => {
    const { repository } = await createRepository();
    await writeFile(path.join(repository, "first.txt"), "first\n");
    await writeFile(path.join(repository, "second.txt"), "second\n");

    expect(
      await runInventory(
        makeNodeGitSourceInventoryResource().observe({ root: repository, maxEntries: 1 })
      )
    ).toMatchObject({
      ok: false,
      failure: { reason: "LimitExceeded" },
    });
  });

  test("maps one nonzero Git command failure with bounded diagnostics", async () => {
    const fixture = await createFixtureDirectory();
    const executable = path.join(fixture, "failing-git");
    await writeExecutable(executable, "#!/bin/sh\nprintf 'ordinary Git failure\\n' >&2\nexit 23\n");

    expect(
      await runInventory(
        makeNodeGitSourceInventoryResource({ gitExecutable: executable }).observe({
          root: fixture,
          maxEntries: 10,
        })
      )
    ).toEqual({
      ok: false,
      failure: {
        _tag: "SourceInventoryFailure",
        reason: "CommandFailed",
        path: fixture,
        detail: "Git ls-files exited 23: ordinary Git failure",
      },
    });
  });

  test("maps only process acquisition failure to SetupFailed", async () => {
    const fixture = await createFixtureDirectory();
    expect(
      await runInventory(
        makeNodeGitSourceInventoryResource({
          gitExecutable: path.join(fixture, "missing-git"),
        }).observe({ root: fixture, maxEntries: 10 })
      )
    ).toMatchObject({
      ok: false,
      failure: { reason: "SetupFailed", path: fixture },
    });
  });

  test("preserves a spawner defect as one Die cause", async () => {
    const fixture = await createFixtureDirectory();
    const defect = new Error("unexpected spawner defect");
    const spawner = ChildProcessSpawner.make(() => Effect.die(defect));
    const exit = await Effect.runPromiseExit(
      makeGitSourceInventoryResource()
        .observe({ root: fixture, maxEntries: 10 })
        .pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) throw new Error("Expected a spawner defect");
    expect(exit.cause.reasons).toHaveLength(1);
    const reason = exit.cause.reasons[0];
    expect(reason !== undefined && Cause.isDieReason(reason)).toBe(true);
    if (reason === undefined || !Cause.isDieReason(reason)) {
      throw new Error("Expected only one Die reason");
    }
    expect(reason.defect).toBe(defect);
  });

  test("caps long command stderr to a schema-valid failure detail", async () => {
    const fixture = await createFixtureDirectory();
    const executable = path.join(fixture, "long-stderr-git");
    await writeExecutable(
      executable,
      "#!/usr/bin/env node\nprocess.stderr.write('x'.repeat(8192));\nprocess.exit(23);\n"
    );

    const result = await runInventory(
      makeNodeGitSourceInventoryResource({ gitExecutable: executable }).observe({
        root: fixture,
        maxEntries: 10,
      })
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected bounded command stderr failure");
    expect(result.failure.detail).toHaveLength(MAX_SOURCE_INVENTORY_FAILURE_DETAIL);
    expect(result.failure.detail.endsWith("...")).toBe(true);
    expect(isSourceInventoryFailure(result.failure)).toBe(true);
  });

  test("preserves interruption while the Git process is running", async () => {
    const fixture = await createFixtureDirectory();
    const executable = path.join(fixture, "interruptible-git");
    const started = path.join(fixture, "started");
    const stopped = path.join(fixture, "stopped");
    await writeExecutable(
      executable,
      [
        "#!/bin/sh",
        'child=""',
        `stopped=${JSON.stringify(stopped)}`,
        'trap \'if test -n "$child"; then kill "$child" 2>/dev/null; wait "$child" 2>/dev/null; fi; printf "stopped\\n" > "$stopped"; exit 143\' TERM INT',
        `printf 'started\\n' > ${JSON.stringify(started)}`,
        "sleep 30 &",
        "child=$!",
        'wait "$child"',
        "exit 1",
        "",
      ].join("\n")
    );

    const fiber = Effect.runFork(
      makeNodeGitSourceInventoryResource({ gitExecutable: executable }).observe({
        root: fixture,
        maxEntries: 10,
      })
    );
    await waitForFile(started);
    await Effect.runPromise(Fiber.interrupt(fiber));
    const exit = await Effect.runPromise(Fiber.await(fiber));

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) throw new Error("Expected source-inventory interruption");
    expect(Cause.hasInterruptsOnly(exit.cause)).toBe(true);
    await waitForFile(stopped);
  }, 10_000);
});

async function createRepository(): Promise<RepositoryFixture> {
  const fixture = await createFixtureDirectory();
  const repository = path.join(fixture, "repository");
  await mkdir(repository);
  await git(repository, "init", "--initial-branch=main");
  await git(repository, "config", "user.email", "test@habitat.local");
  await git(repository, "config", "user.name", "Habitat Test");
  return Object.freeze({ fixture, repository });
}

async function createFixtureDirectory(): Promise<string> {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, FIXTURE_PREFIX));
  const identity = await lstat(root);
  fixtures.push({ parent, root, dev: identity.dev, ino: identity.ino });
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
    throw new Error("Refusing recursive cleanup of an unowned source-inventory fixture");
  }
  await rm(owner.root, { recursive: true, force: false });
}

async function writeExecutable(candidate: string, contents: string): Promise<void> {
  await writeFile(candidate, contents);
  await chmod(candidate, 0o755);
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

async function runInventory<A>(
  operation: Effect.Effect<A, SourceInventoryFailure>
): Promise<SourceInventoryOutcome<A>> {
  return Effect.runPromise(
    operation.pipe(
      Effect.map((value): SourceInventoryOutcome<A> => Object.freeze({ ok: true, value })),
      Effect.catch((failure) =>
        Effect.succeed<SourceInventoryOutcome<A>>(Object.freeze({ ok: false, failure }))
      )
    )
  );
}

function unwrap<A>(result: SourceInventoryOutcome<A>): A {
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

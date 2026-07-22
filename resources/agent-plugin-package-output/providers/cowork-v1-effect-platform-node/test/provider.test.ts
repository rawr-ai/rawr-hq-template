import { Buffer } from "node:buffer";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "bun:test";
import { FileSystem, Path } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";

import type {
  CoworkV1ArchiveEncodingRequest,
  PackageOutputFailure,
} from "@rawr/resource-agent-plugin-package-output";
import {
  makeAgentPluginPackageOutputResource,
  runNodePackageOutput,
  type PackageOutputProviderFailpoints,
} from "../index";

const encoder = new TextEncoder();
const FIXTURE_PREFIX = "rawr-package-output-test-";

interface FixtureOwner {
  readonly root: string;
  readonly parent: string;
  readonly dev: number;
  readonly ino: number;
}

const fixtures: FixtureOwner[] = [];

afterEach(async () => {
  while (fixtures.length > 0) {
    const fixture = fixtures.pop();
    if (fixture !== undefined) await disposeFixture(fixture);
  }
});

describe("Cowork v1 Effect Platform package-output provider", () => {
  test("encodes already-ordered entries to deterministic Cowork v1 bytes", async () => {
    const resource = makeAgentPluginPackageOutputResource();
    const request = archiveRequest();
    const originalTimezone = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Honolulu";
      const first = unwrap(await runNodePackageOutput(resource.encodeCoworkV1(request)));
      process.env.TZ = "Asia/Tokyo";
      const second = unwrap(await runNodePackageOutput(resource.encodeCoworkV1(request)));

      expect(second).toEqual(first);
      expect(inspectZip(first)).toEqual({
        comment: "rawr-agent-plugin-cowork-v1",
        entries: [
          { path: "scripts/alpha.sh", mode: 0o100755 },
          { path: "skills/alpha/SKILL.md", mode: 0o100644 },
        ],
      });
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  test("publishes once and repeats without changing bytes or file identity", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "alpha.zip");
    const bytes = encoder.encode("deterministic package\n");
    const resource = makeAgentPluginPackageOutputResource();

    const first = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );
    expect(first).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Absent" });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
    const before = await lstat(outputPath);
    const namesBefore = await readdir(fixture.root);

    const second = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );
    const after = await lstat(outputPath);
    expect(second).toEqual({ kind: "ReadOnlyConverged" });
    expect(await readdir(fixture.root)).toEqual(namesBefore);
    expect({ ino: after.ino, mode: after.mode, size: after.size, mtimeMs: after.mtimeMs }).toEqual({
      ino: before.ino,
      mode: before.mode,
      size: before.size,
      mtimeMs: before.mtimeMs,
    });
  });

  test("atomically replaces one canonical regular output and verifies its mode", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "replace.zip");
    await writeFile(outputPath, "prior\n", { mode: 0o600 });
    const bytes = encoder.encode("replacement\n");
    const resource = makeAgentPluginPackageOutputResource();

    const result = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );

    expect(result).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Replaced" });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
    expect((await lstat(outputPath)).mode & 0o777).toBe(0o644);
    expect(privateEntries(await readdir(fixture.root))).toEqual([]);
  });

  test("repairs non-canonical mode instead of reporting byte-only convergence", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "mode-repair.zip");
    const bytes = encoder.encode("same bytes\n");
    await writeFile(outputPath, bytes, { mode: 0o600 });
    const resource = makeAgentPluginPackageOutputResource();

    const result = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );

    expect(result).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Replaced" });
    expect((await lstat(outputPath)).mode & 0o777).toBe(0o644);
  });

  test("serializes owner-local publications before each operation captures prior output", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "serialized.zip");
    await writeFile(outputPath, "prior\n", { mode: 0o644 });
    let observed = 0;
    let releaseFirst: (() => void) | undefined;
    let admitFirst: (() => void) | undefined;
    const firstAdmitted = new Promise<void>((resolve) => {
      admitFirst = resolve;
    });
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const resource = makeAgentPluginPackageOutputResource({
      failpoints: {
        async hit(point) {
          if (point === "AfterOutputObserved") observed += 1;
          if (point === "BeforeCommit" && observed === 1) {
            admitFirst?.();
            await firstRelease;
          }
        },
      },
    });

    const first = runNodePackageOutput(
      resource.publish({
        outputPath,
        bytes: encoder.encode("first\n"),
        maxPriorOutputBytes: 1024,
      })
    );
    await firstAdmitted;
    const second = runNodePackageOutput(
      resource.publish({
        outputPath,
        bytes: encoder.encode("second\n"),
        maxPriorOutputBytes: 1024,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(observed).toBe(1);
    releaseFirst?.();

    expect((await Promise.all([first, second])).map(unwrap)).toEqual([
      { kind: "OutputReplacedVerified", priorOutput: "Replaced" },
      { kind: "OutputReplacedVerified", priorOutput: "Replaced" },
    ]);
    expect(await readFile(outputPath, "utf8")).toBe("second\n");
    expect(observed).toBe(2);
  });

  test("rejects an aliased output parent without writing outside the named boundary", async () => {
    const fixture = await createFixture();
    const actual = path.join(fixture.root, "actual");
    const alias = path.join(fixture.root, "alias");
    await mkdir(actual);
    await symlink(actual, alias);
    const outputPath = path.join(alias, "escaped.zip");
    const resource = makeAgentPluginPackageOutputResource();

    const result = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes: encoder.encode("package\n"),
          maxPriorOutputBytes: 1024,
        })
      )
    );

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { reason: "OutputParentUnsafe" },
    });
    expect(await Bun.file(path.join(actual, "escaped.zip")).exists()).toBe(false);
  });

  test("preserves a late occupant instead of replacing it after an absent observation", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "late.zip");
    const failpoints = oneShotBeforeCommit(async () => {
      await writeFile(outputPath, "concurrent owner\n", { mode: 0o644 });
    });
    const resource = makeAgentPluginPackageOutputResource({ failpoints });

    const result = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes: encoder.encode("package\n"),
          maxPriorOutputBytes: 1024,
        })
      )
    );

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { reason: "OutputChanged", phase: "output-precommit" },
    });
    expect(await readFile(outputPath, "utf8")).toBe("concurrent owner\n");
    expect(privateEntries(await readdir(fixture.root))).toEqual([]);
  });

  test("allows only one no-replace winner when two publications race", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "race.zip");
    const bytes = encoder.encode("one package\n");
    let arrivals = 0;
    let release: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const failpoints: PackageOutputProviderFailpoints = {
      async hit(point) {
        if (point !== "BeforeCommit") return;
        arrivals += 1;
        if (arrivals === 2) release?.();
        await barrier;
      },
    };
    const first = makeAgentPluginPackageOutputResource({ failpoints });
    const second = makeAgentPluginPackageOutputResource({ failpoints });

    const results = await Promise.all([
      runNodePackageOutput(first.publish({ outputPath, bytes, maxPriorOutputBytes: 1024 })),
      runNodePackageOutput(second.publish({ outputPath, bytes, maxPriorOutputBytes: 1024 })),
    ]);
    const outcomes = results.map((result) => unwrap(result).kind).sort();

    expect(outcomes).toEqual(["OutputReplacedVerified", "RejectedBeforeOutputMutation"]);
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
    expect(privateEntries(await readdir(fixture.root))).toEqual([]);
  });

  test("reports post-commit failure as unsettled while preserving the visible bytes", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "unsettled.zip");
    const bytes = encoder.encode("visible package\n");
    const resource = makeAgentPluginPackageOutputResource({
      failpoints: {
        async hit(point) {
          if (point === "AfterCommit") throw new Error("post-commit probe");
        },
      },
    });

    const result = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );

    expect(result).toMatchObject({
      kind: "OutputUnsettled",
      primaryFailure: { phase: "AfterCommit" },
    });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
  });

  test("preserves a substituted temporary identity, reports cleanup failure, and retries cleanly", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "substituted.zip");
    const bytes = encoder.encode("owned temporary bytes\n");
    let replacement: string | undefined;
    let preserved: string | undefined;
    let substituted = false;
    const resource = makeAgentPluginPackageOutputResource({
      failpoints: {
        async hit(point, context) {
          if (point !== "BeforeCommit" || substituted) return;
          if (context.temporaryPath === undefined)
            throw new Error("Expected an owned temporary path");
          substituted = true;
          replacement = context.temporaryPath;
          preserved = `${replacement}.preserved`;
          await rename(replacement, preserved);
          await writeFile(replacement, "replacement identity\n", { mode: 0o600 });
        },
      },
    });

    const result = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { reason: "TemporaryFailed", phase: "temporary-revalidation" },
      cleanupFailure: { operation: "cleanup", reason: "TemporaryFailed" },
    });
    expect(await Bun.file(outputPath).exists()).toBe(false);
    if (replacement === undefined || preserved === undefined)
      throw new Error("Expected substituted paths");
    expect(await readFile(replacement, "utf8")).toBe("replacement identity\n");
    expect(await readFile(preserved)).toEqual(Buffer.from(bytes));

    await unlink(replacement);
    await unlink(preserved);
    const retry = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );
    expect(retry).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Absent" });
    const repeated = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );
    expect(repeated).toEqual({ kind: "ReadOnlyConverged" });
  });

  test("cleans an owned temporary when preparation fails and permits a clean retry", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "preparation-retry.zip");
    const bytes = encoder.encode("preparation retry\n");
    const resource = makeAgentPluginPackageOutputResource();
    let injected = false;

    const attempted = await runWithFileSystem(
      resource.publish({
        outputPath,
        bytes,
        maxPriorOutputBytes: 1024,
      }),
      (base) =>
        fileSystemProxy(base, {
          chmod(candidate, mode) {
            if (isPrivateTemporary(candidate) && !injected) {
              injected = true;
              return Effect.fail(
                injectedFileSystemFailure("chmod", candidate, "preparation probe")
              );
            }
            return base.chmod(candidate, mode);
          },
        })
    );

    expect(attempted._tag).toBe("Right");
    if (attempted._tag === "Left") throw attempted.left;
    expect(attempted.right).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        phase: "temporary-mode",
        detail: expect.stringContaining("preparation probe"),
      },
    });
    expect(privateEntries(await readdir(fixture.root))).toEqual([]);

    const retry = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );
    expect(retry).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Absent" });
  });

  test("reports cleanup failure when a failed preparation cannot remove its owned temporary", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "preparation-cleanup-failure.zip");
    const bytes = encoder.encode("cleanup failure truth\n");
    const resource = makeAgentPluginPackageOutputResource();

    const attempted = await runWithFileSystem(
      resource.publish({
        outputPath,
        bytes,
        maxPriorOutputBytes: 1024,
      }),
      (base) =>
        fileSystemProxy(base, {
          chmod(candidate, mode) {
            return isPrivateTemporary(candidate)
              ? Effect.fail(
                  injectedFileSystemFailure("chmod", candidate, "persistent preparation probe")
                )
              : base.chmod(candidate, mode);
          },
          remove(candidate, options) {
            return isPrivateTemporary(candidate)
              ? Effect.fail(injectedFileSystemFailure("remove", candidate, "cleanup removal probe"))
              : base.remove(candidate, options);
          },
        })
    );

    expect(attempted._tag).toBe("Right");
    if (attempted._tag === "Left") throw attempted.left;
    expect(attempted.right).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { detail: expect.stringContaining("persistent preparation probe") },
      cleanupFailure: {
        operation: "cleanup",
        detail: expect.stringContaining("cleanup removal probe"),
      },
    });
    const [orphan] = privateEntries(await readdir(fixture.root));
    expect(orphan?.startsWith(PRIVATE_TEMPORARY_PREFIX)).toBe(true);
    if (orphan === undefined) throw new Error("Expected an explicitly unsettled private temporary");
    await unlink(path.join(fixture.root, orphan));

    const retry = unwrap(
      await runNodePackageOutput(
        resource.publish({
          outputPath,
          bytes,
          maxPriorOutputBytes: 1024,
        })
      )
    );
    expect(retry).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Absent" });
  });
});

function archiveRequest(): CoworkV1ArchiveEncodingRequest {
  return Object.freeze({
    entries: Object.freeze([
      Object.freeze({
        path: "scripts/alpha.sh",
        mode: 0o755,
        bytes: encoder.encode("#!/bin/sh\n"),
      }),
      Object.freeze({
        path: "skills/alpha/SKILL.md",
        mode: 0o644,
        bytes: encoder.encode("alpha\n"),
      }),
    ]),
    comment: "rawr-agent-plugin-cowork-v1",
    fixedTimestamp: "2000-01-01T00:00:00.000",
    compression: "store",
    zip64: false,
  });
}

async function createFixture(): Promise<FixtureOwner> {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, FIXTURE_PREFIX));
  const stats = await lstat(root);
  const fixture = Object.freeze({ root, parent, dev: stats.dev, ino: stats.ino });
  fixtures.push(fixture);
  return fixture;
}

async function disposeFixture(fixture: FixtureOwner): Promise<void> {
  if (
    path.dirname(fixture.root) !== fixture.parent ||
    !path.basename(fixture.root).startsWith(FIXTURE_PREFIX)
  ) {
    throw new Error("Refusing to remove a fixture outside the owned temporary boundary");
  }
  const canonical = await realpath(fixture.root);
  const stats = await lstat(fixture.root);
  if (
    canonical !== fixture.root ||
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    stats.dev !== fixture.dev ||
    stats.ino !== fixture.ino
  ) {
    throw new Error("Refusing to remove a fixture whose identity changed");
  }
  await rm(fixture.root, { recursive: true });
}

function oneShotBeforeCommit(action: () => Promise<void>): PackageOutputProviderFailpoints {
  let used = false;
  return {
    async hit(point) {
      if (point !== "BeforeCommit" || used) return;
      used = true;
      await action();
    },
  };
}

function privateEntries(names: readonly string[]): readonly string[] {
  return names.filter((name) => name.startsWith(PRIVATE_TEMPORARY_PREFIX));
}

function unwrap<A>(result: Awaited<ReturnType<typeof runNodePackageOutput<A>>>): A {
  if (result.ok) return result.value;
  throw new Error(`${result.failure.phase}: ${result.failure.detail}`);
}

interface ZipEntryView {
  readonly path: string;
  readonly mode: number;
}

function inspectZip(bytes: Uint8Array): {
  readonly entries: readonly ZipEntryView[];
  readonly comment: string;
} {
  const archive = Buffer.from(bytes);
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    offset += 30 + nameLength + extraLength + compressedSize;
  }

  const entries: ZipEntryView[] = [];
  while (archive.readUInt32LE(offset) === 0x02014b50) {
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    entries.push({
      path: archive.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
      mode: archive.readUInt32LE(offset + 38) >>> 16,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (archive.readUInt32LE(offset) !== 0x06054b50) throw new Error("ZIP end record missing");
  const commentLength = archive.readUInt16LE(offset + 20);
  return {
    entries,
    comment: archive.subarray(offset + 22, offset + 22 + commentLength).toString("utf8"),
  };
}

async function runWithFileSystem<A>(
  operation: Effect.Effect<A, PackageOutputFailure, FileSystem.FileSystem | Path.Path>,
  transform: (base: FileSystem.FileSystem) => FileSystem.FileSystem
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const base = yield* FileSystem.FileSystem;
      return yield* operation.pipe(
        Effect.provideService(FileSystem.FileSystem, transform(base)),
        Effect.either
      );
    }).pipe(Effect.provide(NodeContext.layer))
  );
}

function fileSystemProxy(
  base: FileSystem.FileSystem,
  overrides: Partial<FileSystem.FileSystem>
): FileSystem.FileSystem {
  return new Proxy(base, {
    get(target, property, receiver) {
      return property in overrides
        ? Reflect.get(overrides, property, receiver)
        : Reflect.get(target, property, receiver);
    },
  });
}

function isPrivateTemporary(candidate: string): boolean {
  return path.basename(candidate).startsWith(PRIVATE_TEMPORARY_PREFIX);
}

function injectedFileSystemFailure(
  method: string,
  candidate: string,
  description: string
): SystemError {
  return new SystemError({
    reason: "Unknown",
    module: "FileSystem",
    method,
    pathOrDescriptor: candidate,
    description,
  });
}

const PRIVATE_TEMPORARY_PREFIX = ".rawr-agent-plugin-package-output-";

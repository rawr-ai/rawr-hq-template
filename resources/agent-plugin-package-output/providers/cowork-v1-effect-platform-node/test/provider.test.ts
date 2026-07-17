import { Buffer } from "node:buffer";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "bun:test";

import type { CoworkV1ArchiveEncodingRequest } from "@rawr/resource-agent-plugin-package-output";
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

    const first = unwrap(await runNodePackageOutput(resource.publish({
      outputPath,
      bytes,
      maxPriorOutputBytes: 1024,
    })));
    expect(first).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Absent" });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
    const before = await lstat(outputPath);
    const namesBefore = await readdir(fixture.root);

    const second = unwrap(await runNodePackageOutput(resource.publish({
      outputPath,
      bytes,
      maxPriorOutputBytes: 1024,
    })));
    const after = await lstat(outputPath);
    expect(second).toEqual({ kind: "ReadOnlyConverged" });
    expect(await readdir(fixture.root)).toEqual(namesBefore);
    expect({ ino: after.ino, mode: after.mode, size: after.size, mtimeMs: after.mtimeMs })
      .toEqual({ ino: before.ino, mode: before.mode, size: before.size, mtimeMs: before.mtimeMs });
  });

  test("atomically replaces one canonical regular output and verifies its mode", async () => {
    const fixture = await createFixture();
    const outputPath = path.join(fixture.root, "replace.zip");
    await writeFile(outputPath, "prior\n", { mode: 0o600 });
    const bytes = encoder.encode("replacement\n");
    const resource = makeAgentPluginPackageOutputResource();

    const result = unwrap(await runNodePackageOutput(resource.publish({
      outputPath,
      bytes,
      maxPriorOutputBytes: 1024,
    })));

    expect(result).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Replaced" });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
    expect((await lstat(outputPath)).mode & 0o777).toBe(0o644);
    expect(privateEntries(await readdir(fixture.root))).toEqual([]);
  });

  test("rejects an aliased output parent without writing outside the named boundary", async () => {
    const fixture = await createFixture();
    const actual = path.join(fixture.root, "actual");
    const alias = path.join(fixture.root, "alias");
    await mkdir(actual);
    await symlink(actual, alias);
    const outputPath = path.join(alias, "escaped.zip");
    const resource = makeAgentPluginPackageOutputResource();

    const result = unwrap(await runNodePackageOutput(resource.publish({
      outputPath,
      bytes: encoder.encode("package\n"),
      maxPriorOutputBytes: 1024,
    })));

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

    const result = unwrap(await runNodePackageOutput(resource.publish({
      outputPath,
      bytes: encoder.encode("package\n"),
      maxPriorOutputBytes: 1024,
    })));

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

    const result = unwrap(await runNodePackageOutput(resource.publish({
      outputPath,
      bytes,
      maxPriorOutputBytes: 1024,
    })));

    expect(result).toMatchObject({
      kind: "OutputUnsettled",
      primaryFailure: { phase: "AfterCommit" },
    });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
  });
});

function archiveRequest(): CoworkV1ArchiveEncodingRequest {
  return Object.freeze({
    entries: Object.freeze([
      Object.freeze({ path: "scripts/alpha.sh", mode: 0o755, bytes: encoder.encode("#!/bin/sh\n") }),
      Object.freeze({ path: "skills/alpha/SKILL.md", mode: 0o644, bytes: encoder.encode("alpha\n") }),
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
    path.dirname(fixture.root) !== fixture.parent
    || !path.basename(fixture.root).startsWith(FIXTURE_PREFIX)
  ) {
    throw new Error("Refusing to remove a fixture outside the owned temporary boundary");
  }
  const canonical = await realpath(fixture.root);
  const stats = await lstat(fixture.root);
  if (
    canonical !== fixture.root
    || !stats.isDirectory()
    || stats.isSymbolicLink()
    || stats.dev !== fixture.dev
    || stats.ino !== fixture.ino
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

const PRIVATE_TEMPORARY_PREFIX = ".rawr-agent-plugin-package-output-";

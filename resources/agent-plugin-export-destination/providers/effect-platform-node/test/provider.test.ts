import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  EXPORT_DESTINATION_TEMP_PREFIX,
  makeExportDestinationResource,
  runNodeExportDestination,
} from "../index";

const FIXTURE_PREFIX = "rawr-export-destination-test-";

interface FixtureOwner {
  readonly parent: string;
  readonly root: string;
  readonly dev: number;
  readonly ino: number;
}

const fixtures: FixtureOwner[] = [];

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await removeOwnedFixture(fixture);
});

describe("Effect Platform Node export destination provider", () => {
  test("inspects and captures exact bounded destination entries", async () => {
    const destination = await createDestination();
    await mkdir(path.join(destination, "plugin"));
    await writeFile(path.join(destination, "plugin", "skill.md"), "before\n", { mode: 0o644 });
    await chmod(path.join(destination, "plugin", "skill.md"), 0o644);
    const resource = makeExportDestinationResource();

    const inspected = unwrap(await runNodeExportDestination(resource.inspect({
      destination,
      readToken: "read-inspect",
      paths: ["plugin", "plugin/skill.md", "missing.txt"],
      maxEntries: 8,
      maxBytes: 1024,
    })));
    const captured = unwrap(await runNodeExportDestination(resource.capture({
      destination,
      readToken: "read-capture",
      paths: ["plugin", "plugin/skill.md", "missing.txt"],
      maxEntries: 8,
      maxBytes: 1024,
    })));

    expect(inspected.canonicalDestination).toBe(destination);
    expect(inspected.entries.map((entry) => entry.kind)).toEqual(["Directory", "File", "Absent"]);
    const directory = inspected.entries[0];
    expect(directory?.kind).toBe("Directory");
    if (directory?.kind === "Directory") {
      expect(directory.children.map((child) => [child.name, child.kind])).toEqual([["skill.md", "File"]]);
    }
    const file = captured.entries[1];
    expect(file?.kind).toBe("File");
    if (file?.kind === "File") {
      expect(new TextDecoder().decode(file.bytes)).toBe("before\n");
      expect(file.mode).toBe(0o644);
    }
    expect(captured.handle).not.toBe("");
  });

  test("applies a service-authored plan, converges, restores preimages, and settles", async () => {
    const destination = await createDestination();
    await writeFile(path.join(destination, "retired.txt"), "retired\n", { mode: 0o644 });
    await mkdir(path.join(destination, "empty"), { mode: 0o755 });
    const resource = makeExportDestinationResource();
    const capture = unwrap(await runNodeExportDestination(resource.capture({
      destination,
      readToken: "read-transition",
      paths: ["retired.txt", "empty", "current", "current/skill.md"],
      maxEntries: 16,
      maxBytes: 4096,
    })));
    const plan = {
      destination,
      planDigest: "plan-transition",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      mutations: [
        { kind: "RemoveFile", path: "retired.txt" },
        { kind: "RemoveEmptyDirectory", path: "empty" },
        { kind: "EnsureDirectory", path: "current", mode: 0o755 },
        { kind: "WriteFile", path: "current/skill.md", mode: 0o644, bytes: bytes("current\n") },
      ],
    } satisfies Parameters<typeof resource.apply>[0];

    const applied = unwrap(await runNodeExportDestination(resource.apply(plan)));
    expect(applied.outcome).toBe("Applied");
    expect(applied.changedPaths).toEqual(["retired.txt", "empty", "current", "current/skill.md"]);
    expect(await pathExists(path.join(destination, "retired.txt"))).toBe(false);
    expect(await pathExists(path.join(destination, "empty"))).toBe(false);
    expect(await readFile(path.join(destination, "current", "skill.md"), "utf8")).toBe("current\n");

    const converged = unwrap(await runNodeExportDestination(resource.apply(plan)));
    expect(converged.outcome).toBe("Converged");
    expect(converged.changedPaths).toEqual([]);

    const restored = unwrap(await runNodeExportDestination(resource.restore({
      destination,
      planDigest: plan.planDigest,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
    expect(restored.outcome).toBe("Restored");
    expect(await readFile(path.join(destination, "retired.txt"), "utf8")).toBe("retired\n");
    expect((await lstat(path.join(destination, "empty"))).isDirectory()).toBe(true);
    expect(await pathExists(path.join(destination, "current"))).toBe(false);

    const settled = unwrap(await runNodeExportDestination(resource.settle({
      destination,
      planDigest: plan.planDigest,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
    expect(settled.outcome).toBe("Settled");

    const reused = await runNodeExportDestination(resource.settle({
      destination,
      planDigest: plan.planDigest,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    }));
    expect(reused.ok).toBe(false);
    if (!reused.ok) expect(reused.failure.reason).toBe("HandleConsumed");
  });

  test("a fresh repeated exact plan is read-only converged", async () => {
    const destination = await createDestination();
    await mkdir(path.join(destination, "plugin"), { mode: 0o755 });
    await writeFile(path.join(destination, "plugin", "skill.md"), "same\n", { mode: 0o644 });
    await chmod(path.join(destination, "plugin", "skill.md"), 0o644);
    const before = await lstat(path.join(destination, "plugin", "skill.md"));
    const resource = makeExportDestinationResource();
    const capture = unwrap(await runNodeExportDestination(resource.capture({
      destination,
      readToken: "read-repeat",
      paths: ["plugin", "plugin/skill.md"],
      maxEntries: 8,
      maxBytes: 1024,
    })));
    const applied = unwrap(await runNodeExportDestination(resource.apply({
      destination,
      planDigest: "plan-repeat",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      mutations: [
        { kind: "EnsureDirectory", path: "plugin", mode: 0o755 },
        { kind: "WriteFile", path: "plugin/skill.md", mode: 0o644, bytes: bytes("same\n") },
      ],
    })));

    expect(applied.outcome).toBe("Converged");
    expect(applied.changedPaths).toEqual([]);
    const after = await lstat(path.join(destination, "plugin", "skill.md"));
    expect(after.ino).toBe(before.ino);
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  test("rejects traversal, aliases, and filesystem-root authority", async () => {
    const destination = await createDestination();
    const outside = await createDestination();
    await writeFile(path.join(outside, "outside.txt"), "outside\n");
    await symlink(path.join(outside, "outside.txt"), path.join(destination, "alias.txt"));
    const resource = makeExportDestinationResource();

    const traversal = await runNodeExportDestination(resource.capture({
      destination,
      readToken: "read-traversal",
      paths: ["../outside.txt"],
      maxEntries: 2,
      maxBytes: 64,
    }));
    expect(traversal.ok).toBe(false);
    if (!traversal.ok) expect(traversal.failure.reason).toBe("InvalidInput");

    const alias = await runNodeExportDestination(resource.inspect({
      destination,
      readToken: "read-alias",
      paths: ["alias.txt"],
      maxEntries: 2,
      maxBytes: 64,
    }));
    expect(alias.ok).toBe(false);
    if (!alias.ok) expect(alias.failure.reason).toBe("Aliased");

    const root = await runNodeExportDestination(resource.capture({
      destination: path.parse(destination).root,
      readToken: "read-root",
      paths: ["tmp"],
      maxEntries: 2,
      maxBytes: 64,
    }));
    expect(root.ok).toBe(false);
    if (!root.ok) expect(root.failure.reason).toBe("InvalidInput");
    expect(await readFile(path.join(outside, "outside.txt"), "utf8")).toBe("outside\n");
  });

  test("refuses nonempty directory removal and never treats a matching prefix as cleanup authority", async () => {
    const destination = await createDestination();
    await mkdir(path.join(destination, "occupied"));
    await writeFile(path.join(destination, "occupied", "keep.txt"), "keep\n");
    const unrelated = path.join(destination, `${EXPORT_DESTINATION_TEMP_PREFIX}unrelated`);
    await writeFile(unrelated, "preserved\n");
    const resource = makeExportDestinationResource();
    const capture = unwrap(await runNodeExportDestination(resource.capture({
      destination,
      readToken: "read-guard",
      paths: ["occupied"],
      maxEntries: 8,
      maxBytes: 1024,
    })));
    const result = await runNodeExportDestination(resource.apply({
      destination,
      planDigest: "plan-guard",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      mutations: [{ kind: "RemoveEmptyDirectory", path: "occupied" }],
    }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.reason).toBe("IdentityChanged");
    expect(await readFile(path.join(destination, "occupied", "keep.txt"), "utf8")).toBe("keep\n");
    expect(await readFile(unrelated, "utf8")).toBe("preserved\n");

    const restored = unwrap(await runNodeExportDestination(resource.restore({
      destination,
      planDigest: "plan-guard",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
    expect(restored.outcome).toBe("Restored");
    unwrap(await runNodeExportDestination(resource.settle({
      destination,
      planDigest: "plan-guard",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
  });

  test("failed atomic publication leaves no owned temporary and preserves prefix lookalikes", async () => {
    const destination = await createDestination();
    const blocked = path.join(destination, "blocked");
    await mkdir(blocked, { mode: 0o755 });
    const lookalike = `${EXPORT_DESTINATION_TEMP_PREFIX}unrelated`;
    await writeFile(path.join(blocked, lookalike), "preserved\n");
    await chmod(blocked, 0o555);
    const resource = makeExportDestinationResource();
    const capture = unwrap(await runNodeExportDestination(resource.capture({
      destination,
      readToken: "read-cleanup",
      paths: ["blocked/skill.md"],
      maxEntries: 4,
      maxBytes: 1024,
    })));

    const applied = await runNodeExportDestination(resource.apply({
      destination,
      planDigest: "plan-cleanup",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      mutations: [{ kind: "WriteFile", path: "blocked/skill.md", mode: 0o644, bytes: bytes("new\n") }],
    }));
    expect(applied.ok).toBe(false);
    if (!applied.ok) expect(applied.failure.reason).toBe("FilesystemFailed");
    expect(await readdir(blocked)).toEqual([lookalike]);
    expect(await readFile(path.join(blocked, lookalike), "utf8")).toBe("preserved\n");

    unwrap(await runNodeExportDestination(resource.restore({
      destination,
      planDigest: "plan-cleanup",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
    unwrap(await runNodeExportDestination(resource.settle({
      destination,
      planDigest: "plan-cleanup",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    })));
    await chmod(blocked, 0o755);
  });
});

async function createDestination(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), FIXTURE_PREFIX));
  const canonical = await realpath(root);
  const stats = await lstat(canonical);
  fixtures.push({ parent: path.dirname(canonical), root: canonical, dev: stats.dev, ino: stats.ino });
  return canonical;
}

async function removeOwnedFixture(owner: FixtureOwner): Promise<void> {
  const canonical = await realpath(owner.root);
  const stats = await lstat(canonical);
  if (
    canonical !== owner.root
    || !path.basename(canonical).startsWith(FIXTURE_PREFIX)
    || path.dirname(canonical) !== owner.parent
    || !stats.isDirectory()
    || stats.isSymbolicLink()
    || stats.dev !== owner.dev
    || stats.ino !== owner.ino
  ) {
    throw new Error(`Refusing to remove unowned export-destination fixture: ${owner.root}`);
  }
  await rm(canonical, { recursive: true, force: false });
}

function unwrap<A>(result: Awaited<ReturnType<typeof runNodeExportDestination<A>>>): A {
  if (!result.ok) throw new Error(`${result.failure.reason}: ${result.failure.detail}`);
  return result.value;
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

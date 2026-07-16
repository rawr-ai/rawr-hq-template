import {
  link,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rmdir,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type {
  PackageOutputFailpoint,
  PackageOutputFailpointContext,
  PackageOutputFailpoints,
} from "../src/atomic-output";
import { packageDigest } from "../src/cowork-v1";
import { createNodeAtomicPackageOutput } from "../src/node-atomic-output";
import { createOwnedFixtureRoot, disposeOwnedFixtureRoot, type OwnedFixtureRoot } from "./owned-fixture-root";

const roots: OwnedFixtureRoot[] = [];
const encoder = new TextEncoder();

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await disposeOwnedFixtureRoot(root);
  }
});

describe("node atomic package output", () => {
  it("publishes once and performs a byte- and metadata-read-only second convergence", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "alpha.zip");
    const bytes = encoder.encode("deterministic package\n");
    const writer = createNodeAtomicPackageOutput({ operationId: operationIds() });

    const first = await writer.publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });
    expect(first).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Absent" });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
    const before = await lstat(outputPath);
    const namesBefore = await readdir(root.path);

    const second = await writer.publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });
    const after = await lstat(outputPath);
    expect(second).toEqual({ kind: "ReadOnlyConverged" });
    expect(await readdir(root.path)).toEqual(namesBefore);
    expect({ dev: after.dev, ino: after.ino, mode: after.mode, mtimeMs: after.mtimeMs, ctimeMs: after.ctimeMs })
      .toEqual({ dev: before.dev, ino: before.ino, mode: before.mode, mtimeMs: before.mtimeMs, ctimeMs: before.ctimeMs });
  });

  it("rejects a package digest that does not bind the exact output bytes", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "wrong-digest.zip");
    const bytes = encoder.encode("package\n");
    const otherBytes = encoder.encode("other package\n");

    const result = await createNodeAtomicPackageOutput({ operationId: operationIds() }).publish({
      outputPath,
      bytes,
      packageDigest: packageDigest(otherBytes),
    });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "InvalidRequest", phase: "package-digest" },
    });
    expect(await readdir(root.path)).toEqual([]);
  });

  it("atomically replaces one captured canonical regular output", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "replace.zip");
    await writeFile(outputPath, "old package\n", { mode: 0o644 });
    const bytes = encoder.encode("new package\n");

    const result = await createNodeAtomicPackageOutput({ operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toEqual({ kind: "OutputReplacedVerified", priorOutput: "Replaced" });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
    expect((await lstat(outputPath)).mode & 0o777).toBe(0o644);
  });

  it("revalidates an exact prior output after the first injectable boundary", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "early-race.zip");
    const bytes = encoder.encode("package\n");
    await writeFile(outputPath, bytes, { mode: 0o644 });
    const failpoints = oneShotFailpoint("AfterOutputCaptured", async () => {
      await unlink(outputPath);
      await writeFile(outputPath, "substituted\n", { mode: 0o644 });
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "OutputChanged", phase: "output-convergence" },
    });
    expect(await readFile(outputPath, "utf8")).toBe("substituted\n");
    expect(await readdir(root.path)).toEqual(["early-race.zip"]);
  });

  it("rejects a substituted output parent before opening private staging", async () => {
    const root = await fixtureRoot();
    const movedRoot = join(root.parent, `${basename(root.path)}-moved`);
    const outputPath = join(root.path, "parent-race.zip");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterOutputCaptured", async () => {
      await rename(root.path, movedRoot);
      await mkdir(root.path);
    });

    let result: Awaited<ReturnType<ReturnType<typeof createNodeAtomicPackageOutput>["publish"]>> | undefined;
    try {
      result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
        .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });
      expect(await readdir(root.path)).toEqual([]);
    } finally {
      await rmdir(root.path);
      await rename(movedRoot, root.path);
    }

    if (result === undefined) throw new Error("parent-race result missing");
    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "OutputParentUnsafe", phase: "output-parent-revalidation" },
    });
    expect(await readdir(root.path)).toEqual([]);
  });

  it("rejects and preserves symlink, hardlink, directory, and aliased-parent outputs", async () => {
    const root = await fixtureRoot();
    const target = join(root.path, "target.txt");
    await writeFile(target, "target\n");
    const symlinkOutput = join(root.path, "symlink.zip");
    await symlink(target, symlinkOutput);
    const hardlinkOutput = join(root.path, "hardlink.zip");
    await link(target, hardlinkOutput);
    const directoryOutput = join(root.path, "directory.zip");
    await mkdir(directoryOutput);
    const actualParent = join(root.path, "actual");
    const aliasParent = join(root.path, "alias");
    await mkdir(actualParent);
    await symlink(actualParent, aliasParent);
    const writer = createNodeAtomicPackageOutput({ operationId: operationIds() });
    const bytes = encoder.encode("package\n");

    for (const outputPath of [symlinkOutput, hardlinkOutput, directoryOutput, join(aliasParent, "alias.zip")]) {
      const result = await writer.publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });
      expect(result.kind).toBe("RejectedBeforeOutputMutation");
      if (result.kind === "RejectedBeforeOutputMutation") {
        expect(["OutputUnsafe", "OutputParentUnsafe"]).toContain(result.primaryFailure.code);
      }
    }

    expect(await readFile(target, "utf8")).toBe("target\n");
    expect((await lstat(target)).nlink).toBe(2);
    expect((await lstat(symlinkOutput)).isSymbolicLink()).toBe(true);
    expect((await lstat(directoryOutput)).isDirectory()).toBe(true);
  });

  it("retains captured ownership when immediate temporary admission becomes hardlinked", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "admission.zip");
    const preservedLink = join(root.path, "preserved-hardlink");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterTemporaryCreated", async ({ temporaryPath }) => {
      if (temporaryPath === undefined) throw new Error("temporary path missing");
      await link(temporaryPath, preservedLink);
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "TemporaryCreateFailed", phase: "temporary-admission" },
      cleanupFailure: { code: "TemporaryCleanupBlocked" },
    });
    expect(await readFile(preservedLink)).toEqual(Buffer.alloc(0));
    const privateNames = (await readdir(root.path)).filter((name) => name.startsWith(".rawr-package-tmp-v1-"));
    expect(privateNames).toHaveLength(1);
    const privateName = privateNames[0];
    if (privateName === undefined) throw new Error("preserved private hardlink missing");
    expect((await lstat(join(root.path, privateName))).nlink).toBe(2);
  });

  it("preserves a substituted private temporary and reports cleanup blocked", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "substituted.zip");
    const protectedTarget = join(root.path, "protected.txt");
    await writeFile(protectedTarget, "protected\n");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterTemporaryVerified", async ({ temporaryPath }) => {
      if (temporaryPath === undefined) throw new Error("temporary path missing");
      await unlink(temporaryPath);
      await symlink(protectedTarget, temporaryPath);
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "TemporaryVerifyFailed" },
      cleanupFailure: { code: "TemporaryCleanupBlocked" },
    });
    expect(await readFile(protectedTarget, "utf8")).toBe("protected\n");
    const privateName = (await readdir(root.path)).find((name) => name.startsWith(".rawr-package-tmp-v1-"));
    if (privateName === undefined) throw new Error("preserved private symlink missing");
    expect((await lstat(join(root.path, privateName))).isSymbolicLink()).toBe(true);
  });

  it("preserves a foreign regular file substituted after temporary write", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "foreign-temp.zip");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterTemporaryWritten", async ({ temporaryPath }) => {
      if (temporaryPath === undefined) throw new Error("temporary path missing");
      await unlink(temporaryPath);
      await writeFile(temporaryPath, "foreign\n", { mode: 0o644 });
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "TemporaryVerifyFailed" },
      cleanupFailure: { code: "TemporaryCleanupBlocked" },
    });
    const privateName = (await readdir(root.path)).find((name) => name.startsWith(".rawr-package-tmp-v1-"));
    if (privateName === undefined) throw new Error("foreign private candidate missing");
    expect(await readFile(join(root.path, privateName), "utf8")).toBe("foreign\n");
  });

  it("blocks a changed captured live output and preserves the substituting object", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "raced.zip");
    await writeFile(outputPath, "captured\n", { mode: 0o644 });
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("BeforeOutputCommit", async () => {
      await unlink(outputPath);
      await writeFile(outputPath, "substituted\n", { mode: 0o644 });
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "OutputChanged" },
    });
    expect(await readFile(outputPath, "utf8")).toBe("substituted\n");
    expect((await readdir(root.path)).filter((name) => name.startsWith(".rawr-package-tmp-v1-")))
      .toHaveLength(0);
  });

  it("blocks a late occupant before no-replace publication and preserves it", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "late-occupant.zip");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("BeforeOutputCommit", async () => {
      await writeFile(outputPath, "late occupant\n", { mode: 0o644 });
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "OutputChanged", phase: "output-precommit" },
    });
    expect(await readFile(outputPath, "utf8")).toBe("late occupant\n");
    expect((await readdir(root.path)).filter((name) => name.startsWith(".rawr-package-tmp-v1-")))
      .toHaveLength(0);
  });

  it("reports post-commit failure as unsettled without relabeling the visible output", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "unsettled.zip");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterOutputCommit", () => {
      throw new Error("post-commit probe");
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "OutputUnsettled",
      primaryFailure: { code: "FailpointFailed", phase: "AfterOutputCommit" },
    });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
  });

  it("reports final-verification substitution as unsettled and preserves its target", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "verify-race.zip");
    const protectedTarget = join(root.path, "verify-protected.txt");
    await writeFile(protectedTarget, "protected\n");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("BeforeFinalVerification", async () => {
      await unlink(outputPath);
      await symlink(protectedTarget, outputPath);
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "OutputUnsettled",
      primaryFailure: { code: "OutputVerifyFailed", phase: "output-final" },
    });
    expect((await lstat(outputPath)).isSymbolicLink()).toBe(true);
    expect(await readFile(protectedTarget, "utf8")).toBe("protected\n");
  });

  it("guard-cleans the exact owned temporary when a precommit failpoint fails", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "cleanup.zip");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterTemporaryCreated", () => {
      throw new Error("stop before write");
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "FailpointFailed" },
    });
    expect("cleanupFailure" in result).toBe(false);
    expect(await readdir(root.path)).toEqual([]);
  });
});

async function fixtureRoot(): Promise<OwnedFixtureRoot> {
  const root = await createOwnedFixtureRoot();
  roots.push(root);
  return root;
}

function operationIds(): () => string {
  let next = 0;
  return () => `operation-${String(++next).padStart(8, "0")}`;
}

function oneShotFailpoint(
  selected: PackageOutputFailpoint,
  action: (context: PackageOutputFailpointContext) => void | Promise<void>,
): PackageOutputFailpoints {
  let called = false;
  return {
    async hit(point, context) {
      if (point !== selected || called) return;
      called = true;
      await action(context);
    },
  };
}

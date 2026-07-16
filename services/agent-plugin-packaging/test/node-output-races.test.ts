import {
  lstat,
  readFile,
  readdir,
  truncate,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type {
  PackageOutputFailpoint,
  PackageOutputFailpointContext,
  PackageOutputFailpoints,
} from "../src/atomic-output";
import { packageDigest } from "../src/cowork-v1";
import { createNodeAtomicPackageOutput } from "../src/node-atomic-output";
import { captureCanonicalParent, captureOutput } from "../src/node-output-identity";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./owned-fixture-root";

const roots: OwnedFixtureRoot[] = [];
const encoder = new TextEncoder();

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await disposeOwnedFixtureRoot(root);
  }
});

describe("node output identity and last-boundary races", () => {
  it("captures parent, file, and fixture identities as bigint values", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "identity.zip");
    const bytes = encoder.encode("captured\n");
    await writeFile(outputPath, bytes, { mode: 0o644 });

    const parent = await captureCanonicalParent(outputPath);
    const output = await captureOutput(outputPath, parent, bytes.byteLength);

    expect(typeof root.parentDev).toBe("bigint");
    expect(typeof root.parentIno).toBe("bigint");
    expect(typeof root.dev).toBe("bigint");
    expect(typeof root.ino).toBe("bigint");
    expect(typeof parent.dev).toBe("bigint");
    expect(typeof parent.ino).toBe("bigint");
    expect(output.kind).toBe("Present");
    if (output.kind !== "Present") throw new Error("captured output missing");
    for (const value of [
      output.file.dev,
      output.file.ino,
      output.file.mode,
      output.file.size,
      output.file.mtimeNs,
      output.file.ctimeNs,
    ]) {
      expect(typeof value).toBe("bigint");
    }
  });

  it("rejects an oversized sparse prior output before reading its contents", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "oversized.zip");
    await writeFile(outputPath, "old\n", { mode: 0o644 });
    await truncate(outputPath, 1024 ** 4);
    const bytes = encoder.encode("new package\n");

    const result = await createNodeAtomicPackageOutput({ operationId: operationIds() }).publish({
      outputPath,
      bytes,
      packageDigest: packageDigest(bytes),
    });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "OutputUnsafe", phase: "output-capture-size" },
    });
    expect((await lstat(outputPath, { bigint: true })).size).toBe(BigInt(1024 ** 4));
    expect(await readdir(root.path)).toEqual(["oversized.zip"]);
  });

  it("detects temporary substitution after its final descriptor read", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "temporary-last-boundary.zip");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterTemporaryPrecommitRead", async ({ temporaryPath }) => {
      if (temporaryPath === undefined) throw new Error("temporary path missing");
      await unlink(temporaryPath);
      await writeFile(temporaryPath, "foreign\n", { mode: 0o644 });
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: {
        code: "TemporaryVerifyFailed",
        phase: "temporary-precommit-final-entry",
      },
      cleanupFailure: { code: "TemporaryCleanupBlocked" },
    });
    const privateName = privateEntry(await readdir(root.path));
    expect(await readFile(join(root.path, privateName), "utf8")).toBe("foreign\n");
  });

  it("detects output substitution after its final descriptor read", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "output-last-boundary.zip");
    await writeFile(outputPath, "prior\n", { mode: 0o644 });
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterOutputPrecommitRead", async () => {
      await unlink(outputPath);
      await writeFile(outputPath, "foreign\n", { mode: 0o644 });
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "OutputChanged", phase: "output-precommit-final-entry" },
    });
    expect(await readFile(outputPath, "utf8")).toBe("foreign\n");
    expect((await readdir(root.path)).filter(isPrivateEntry)).toHaveLength(0);
  });

  it("detects a concurrent output replacement after final parent admission", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "output-after-parent-admission.zip");
    await writeFile(outputPath, "prior\n", { mode: 0o644 });
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("AfterParentPrecommitRead", async () => {
      await unlink(outputPath);
      await writeFile(outputPath, "concurrent winner\n", { mode: 0o644 });
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "OutputChanged", phase: "output-precommit" },
    });
    expect(await readFile(outputPath, "utf8")).toBe("concurrent winner\n");
    expect((await readdir(root.path)).filter(isPrivateEntry)).toHaveLength(0);
  });

  it("does not unlink a substituted publication-link candidate", async () => {
    const root = await fixtureRoot();
    const outputPath = join(root.path, "publication-unlink-race.zip");
    const bytes = encoder.encode("package\n");
    const failpoints = oneShotFailpoint("BeforePublicationLinkUnlink", async ({ temporaryPath }) => {
      if (temporaryPath === undefined) throw new Error("temporary path missing");
      await unlink(temporaryPath);
      await writeFile(temporaryPath, "foreign\n", { mode: 0o644 });
    });

    const result = await createNodeAtomicPackageOutput({ failpoints, operationId: operationIds() })
      .publish({ outputPath, bytes, packageDigest: packageDigest(bytes) });

    expect(result).toMatchObject({
      kind: "OutputUnsettled",
      primaryFailure: { code: "OutputCommitFailed", phase: "output-no-replace-finalize" },
      cleanupFailure: { code: "TemporaryCleanupBlocked" },
    });
    expect(await readFile(outputPath)).toEqual(Buffer.from(bytes));
    const privateName = privateEntry(await readdir(root.path));
    expect(await readFile(join(root.path, privateName), "utf8")).toBe("foreign\n");
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

function isPrivateEntry(name: string): boolean {
  return name.startsWith(".rawr-package-tmp-v1-");
}

function privateEntry(names: readonly string[]): string {
  const name = names.find(isPrivateEntry);
  if (name === undefined) throw new Error("preserved private candidate missing");
  return name;
}

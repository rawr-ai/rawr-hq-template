import { lstat, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PAYLOAD_TEMP_PREFIX,
  captureDestination,
  captureEmptyDirectory,
  captureOpenedTemporary,
  capturePath,
  cleanupOwnedTemporary,
  closeTemporary,
  commitTemporary,
  openPrivateTemporary,
  removeCapturedEmptyDirectory,
  unlinkCapturedFile,
  verifyOwnedTemporary,
  verifyPublishedFile,
  writeOpenedTemporary,
  type DestinationIdentity,
  type OwnedTemporary,
} from "../src/filesystem";
import { createOwnedFixtureRoot, type OwnedFixtureRoot } from "./owned-fixture-root";

const BYTES = new TextEncoder().encode("owned-publication\n");

describe("export filesystem mutation authority", () => {
  let root: OwnedFixtureRoot;

  beforeEach(async () => {
    root = await createOwnedFixtureRoot();
  });

  afterEach(async () => {
    await root.cleanup();
  });

  it.each(["absent", "present"] as const)(
    "rejects %s-target publication after a real parent replacement migrates the exact leaves",
    async (targetState) => {
      const { destination, parent } = await destinationWithParent(root, `commit-${targetState}`);
      const targetPath = join(parent, "target.txt");
      if (targetState === "present") await writeFile(targetPath, "prior\n", { mode: 0o644 });
      const target = await capturePath(destination, "parent/target.txt");
      const temporary = await ownedTemporary(destination, targetPath, `commit-${targetState}-operation`);

      await expect(commitTemporary(destination, temporary, target, async (phase) => {
        if (phase !== "TargetPublication") return;
        await replaceParentAndMigrateLeaves(parent, [temporary.path, ...(targetState === "present" ? [targetPath] : [])]);
      })).rejects.toMatchObject({ failure: { code: "PathChanged", phase: "parent-chain" } });

      expect((await lstat(temporary.path, { bigint: true })).ino).toBe(temporary.ino);
      if (targetState === "absent") await expect(lstat(targetPath)).rejects.toMatchObject({ code: "ENOENT" });
      else expect(await readFile(targetPath, "utf8")).toBe("prior\n");
    },
  );

  it("rejects publication finalization after a real parent replacement migrates both exact links", async () => {
    const { destination, parent } = await destinationWithParent(root, "finalize");
    const targetPath = join(parent, "target.txt");
    const target = await capturePath(destination, "parent/target.txt");
    const temporary = await ownedTemporary(destination, targetPath, "finalize-operation");

    await expect(commitTemporary(destination, temporary, target, async (phase) => {
      if (phase !== "TemporaryFinalization") return;
      await replaceParentAndMigrateLeaves(parent, [temporary.path, targetPath]);
    })).rejects.toMatchObject({ failure: { code: "PathChanged", phase: "parent-chain" } });

    expect((await lstat(temporary.path)).nlink).toBe(2);
    expect((await lstat(targetPath)).nlink).toBe(2);
  });

  it("rejects one-file unlink after a real parent replacement migrates the exact captured inode", async () => {
    const { destination, parent } = await destinationWithParent(root, "unlink");
    const targetPath = join(parent, "target.txt");
    await writeFile(targetPath, BYTES, { mode: 0o644 });
    const target = await capturePath(destination, "parent/target.txt");
    if (target.kind !== "Present") throw new Error("test target was not captured");

    await expect(unlinkCapturedFile(destination, target.file, async () => {
      await replaceParentAndMigrateLeaves(parent, [targetPath]);
    })).rejects.toMatchObject({ failure: { code: "PathChanged", phase: "parent-chain" } });

    expect((await lstat(targetPath, { bigint: true })).ino).toBe(target.file.ino);
  });

  it("preserves an owned temporary after a real parent replacement migrates its exact inode", async () => {
    const { destination, parent } = await destinationWithParent(root, "cleanup");
    const targetPath = join(parent, "target.txt");
    const temporary = await ownedTemporary(destination, targetPath, "cleanup-operation");

    const cleanup = await cleanupOwnedTemporary(destination, temporary, async () => {
      await replaceParentAndMigrateLeaves(parent, [temporary.path]);
    });

    expect(cleanup).toMatchObject({ code: "TemporaryCleanupFailed", phase: "temporary-cleanup" });
    expect((await lstat(temporary.path, { bigint: true })).ino).toBe(temporary.ino);
  });

  it("rejects empty-directory retirement after a real parent replacement migrates the exact directory", async () => {
    const { destination, parent } = await destinationWithParent(root, "directory-race");
    const directoryPath = join(parent, "empty");
    await mkdir(directoryPath);
    const directory = await captureEmptyDirectory(destination, "parent/empty");
    if (directory === undefined) throw new Error("test directory was not captured empty");

    await expect(removeCapturedEmptyDirectory(destination, directory, async () => {
      await replaceParentAndMigrateLeaves(parent, [directoryPath]);
    })).rejects.toMatchObject({ failure: { code: "PathChanged", phase: "parent-chain" } });

    expect((await lstat(directoryPath, { bigint: true })).ino).toBe(directory.ino);
  });

  it("binds verification to the operation-published inode, not only equal bytes and mode", async () => {
    const { destination, parent } = await destinationWithParent(root, "published-identity");
    const targetPath = join(parent, "target.txt");
    const target = await capturePath(destination, "parent/target.txt");
    const temporary = await ownedTemporary(destination, targetPath, "published-identity-operation");
    const published = await commitTemporary(destination, temporary, target);
    const foreign = join(parent, "foreign.txt");
    await writeFile(foreign, BYTES, { mode: 0o644 });
    const foreignIdentity = await lstat(foreign, { bigint: true });
    await rename(foreign, targetPath);

    await expect(verifyPublishedFile(
      destination,
      "parent/target.txt",
      BYTES,
      0o644,
      published,
    )).rejects.toMatchObject({ failure: { code: "VerificationFailed", phase: "file-final-verify" } });
    expect((await lstat(targetPath, { bigint: true })).ino).toBe(foreignIdentity.ino);
  });

  it("closes a held directory safely after successful nonrecursive retirement on Bun and Node", async () => {
    const { destination, parent } = await destinationWithParent(root, "close-after-rmdir");
    await mkdir(join(parent, "empty"));
    const directory = await captureEmptyDirectory(destination, "parent/empty");
    if (directory === undefined) throw new Error("test directory was not captured empty");

    await removeCapturedEmptyDirectory(destination, directory);

    await expect(lstat(directory.path)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

async function destinationWithParent(
  root: OwnedFixtureRoot,
  name: string,
): Promise<Readonly<{ destination: DestinationIdentity; parent: string }>> {
  const path = join(root.path, name);
  const parent = join(path, "parent");
  await mkdir(path);
  await mkdir(parent);
  return { destination: await captureDestination(path), parent };
}

async function ownedTemporary(
  destination: DestinationIdentity,
  targetPath: string,
  operationId: string,
): Promise<OwnedTemporary> {
  const opened = await openPrivateTemporary(destination, targetPath, PAYLOAD_TEMP_PREFIX, operationId);
  let temporary = await captureOpenedTemporary(destination, opened);
  temporary = await writeOpenedTemporary(destination, opened, temporary, BYTES, 0o644);
  await closeTemporary(opened);
  await verifyOwnedTemporary(temporary, BYTES, 0o644);
  return temporary;
}

async function replaceParentAndMigrateLeaves(parent: string, leaves: readonly string[]): Promise<void> {
  const savedParent = `${parent}-saved`;
  await rename(parent, savedParent);
  await mkdir(parent);
  for (const leaf of leaves) {
    await rename(join(savedParent, basename(leaf)), leaf);
  }
}

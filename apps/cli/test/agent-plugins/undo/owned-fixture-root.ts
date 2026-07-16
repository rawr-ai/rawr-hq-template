import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const FIXTURE_PREFIX = ".rawr-capsule-test-";

export interface OwnedFixtureRoot {
  readonly path: string;
  cleanup(): Promise<void>;
}

export async function createOwnedFixtureRoot(): Promise<OwnedFixtureRoot> {
  const parent = await realpath(tmpdir());
  const parentStatus = await lstat(parent, { bigint: true });
  if (!parentStatus.isDirectory() || parentStatus.isSymbolicLink()) {
    throw new Error("fixture parent is not a canonical directory");
  }
  const root = await mkdtemp(path.join(parent, FIXTURE_PREFIX));
  const status = await lstat(root, { bigint: true });
  if (
    !status.isDirectory()
    || status.isSymbolicLink()
    || path.dirname(root) !== parent
    || !path.basename(root).startsWith(FIXTURE_PREFIX)
    || await realpath(root) !== root
  ) {
    throw new Error("fixture root creation did not produce an exact owned directory");
  }
  const parentIdentity = Object.freeze({ dev: parentStatus.dev, ino: parentStatus.ino });
  const rootIdentity = Object.freeze({ dev: status.dev, ino: status.ino });
  return Object.freeze({
    path: root,
    async cleanup(): Promise<void> {
      const currentParent = await lstat(parent, { bigint: true });
      const current = await lstat(root, { bigint: true });
      if (
        !currentParent.isDirectory()
        || currentParent.isSymbolicLink()
        || currentParent.dev !== parentIdentity.dev
        || currentParent.ino !== parentIdentity.ino
        || await realpath(parent) !== parent
        || path.dirname(root) !== parent
        || !path.basename(root).startsWith(FIXTURE_PREFIX)
        || !current.isDirectory()
        || current.isSymbolicLink()
        || current.dev !== rootIdentity.dev
        || current.ino !== rootIdentity.ino
        || await realpath(root) !== root
      ) {
        throw new Error("refusing recursive cleanup of an unowned fixture root");
      }
      const immediateParent = await lstat(parent, { bigint: true });
      const immediateParentCanonical = await realpath(parent);
      const immediate = await lstat(root, { bigint: true });
      if (
        immediateParentCanonical !== parent
        || !immediateParent.isDirectory()
        || immediateParent.isSymbolicLink()
        || immediateParent.dev !== parentIdentity.dev
        || immediateParent.ino !== parentIdentity.ino
        || path.dirname(root) !== parent
        || !path.basename(root).startsWith(FIXTURE_PREFIX)
        || !immediate.isDirectory()
        || immediate.isSymbolicLink()
        || immediate.dev !== rootIdentity.dev
        || immediate.ino !== rootIdentity.ino
        || await realpath(root) !== root
      ) {
        throw new Error("fixture root changed immediately before cleanup");
      }
      await rm(root, { recursive: true, force: false });
    },
  });
}

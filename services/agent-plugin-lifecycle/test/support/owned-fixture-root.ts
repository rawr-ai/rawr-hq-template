import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

const FIXTURE_PREFIX = "rawr-agent-plugin-lifecycle-service-test-";

export interface OwnedFixtureRoot {
  readonly path: string;
  readonly parent: string;
  readonly name: string;
  readonly parentDev: bigint;
  readonly parentIno: bigint;
  readonly dev: bigint;
  readonly ino: bigint;
}

export async function createOwnedFixtureRoot(): Promise<OwnedFixtureRoot> {
  const parent = await realpath(tmpdir());
  const parentStats = await lstat(parent, { bigint: true });
  if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) {
    throw new Error("Fixture parent must be a canonical non-symlink directory");
  }
  const fixturePath = await mkdtemp(join(parent, FIXTURE_PREFIX));
  const stats = await lstat(fixturePath, { bigint: true });
  const resolved = await realpath(fixturePath);
  const name = basename(fixturePath);
  if (
    dirname(fixturePath) !== parent ||
    !name.startsWith(FIXTURE_PREFIX) ||
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    resolved !== fixturePath
  ) {
    throw new Error("mkdtemp did not create the expected canonical owned fixture root");
  }
  return {
    path: fixturePath,
    parent,
    name,
    parentDev: parentStats.dev,
    parentIno: parentStats.ino,
    dev: stats.dev,
    ino: stats.ino,
  };
}

export async function disposeOwnedFixtureRoot(root: OwnedFixtureRoot): Promise<void> {
  const parent = await realpath(root.parent);
  const parentStats = await lstat(root.parent, { bigint: true });
  if (
    parent !== root.parent ||
    !parentStats.isDirectory() ||
    parentStats.isSymbolicLink() ||
    parentStats.dev !== root.parentDev ||
    parentStats.ino !== root.parentIno ||
    dirname(root.path) !== root.parent ||
    basename(root.path) !== root.name ||
    join(root.parent, root.name) !== root.path ||
    !root.name.startsWith(FIXTURE_PREFIX)
  ) {
    throw new Error("Fixture root is not the owned canonical direct child");
  }

  const stats = await lstat(root.path, { bigint: true });
  const resolved = await realpath(root.path);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    stats.dev !== root.dev ||
    stats.ino !== root.ino ||
    resolved !== root.path
  ) {
    throw new Error("Fixture root identity changed before cleanup");
  }

  const immediateParent = await lstat(root.parent, { bigint: true });
  const immediateParentResolved = await realpath(root.parent);
  const immediate = await lstat(root.path, { bigint: true });
  const immediateResolved = await realpath(root.path);
  if (
    immediateParentResolved !== root.parent ||
    !immediateParent.isDirectory() ||
    immediateParent.isSymbolicLink() ||
    immediateParent.dev !== root.parentDev ||
    immediateParent.ino !== root.parentIno ||
    dirname(root.path) !== root.parent ||
    basename(root.path) !== root.name ||
    !root.name.startsWith(FIXTURE_PREFIX) ||
    !immediate.isDirectory() ||
    immediate.isSymbolicLink() ||
    immediate.dev !== root.dev ||
    immediate.ino !== root.ino ||
    immediateResolved !== root.path
  ) {
    throw new Error("Fixture root identity changed at cleanup admission");
  }
  await rm(root.path, { recursive: true, force: false });
}

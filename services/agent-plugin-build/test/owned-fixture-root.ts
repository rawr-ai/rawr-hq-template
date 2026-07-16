import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const FIXTURE_PREFIX = "rawr-agent-plugin-build-test-";

declare const ownedFixtureRootBrand: unique symbol;

export type OwnedFixtureRoot = Readonly<{
  path: string;
  parent: string;
  basename: string;
  parentDev: bigint;
  parentIno: bigint;
  dev: bigint;
  ino: bigint;
  [ownedFixtureRootBrand]: "OwnedFixtureRoot";
}>;

export async function createOwnedFixtureRoot(): Promise<OwnedFixtureRoot> {
  const parent = await realpath(resolve(tmpdir()));
  const parentStatus = await lstat(parent, { bigint: true });
  if (!parentStatus.isDirectory() || parentStatus.isSymbolicLink()) {
    throw new Error(`fixture parent is not a canonical directory: ${parent}`);
  }
  const candidate = await mkdtemp(join(parent, FIXTURE_PREFIX));
  const status = await lstat(candidate, { bigint: true });
  const canonical = await realpath(candidate);
  const candidateBasename = basename(candidate);
  if (
    !status.isDirectory()
    || status.isSymbolicLink()
    || canonical !== candidate
    || dirname(candidate) !== parent
    || !candidateBasename.startsWith(FIXTURE_PREFIX)
  ) {
    throw new Error(`fixture root failed its creation proof: ${candidate}`);
  }
  return Object.freeze({
    path: candidate,
    parent,
    basename: candidateBasename,
    parentDev: parentStatus.dev,
    parentIno: parentStatus.ino,
    dev: status.dev,
    ino: status.ino,
  }) as OwnedFixtureRoot;
}

export async function removeOwnedFixtureRoot(fixture: OwnedFixtureRoot): Promise<void> {
  const canonicalParent = await realpath(resolve(fixture.parent));
  const parentStatus = await lstat(fixture.parent, { bigint: true });
  const candidate = resolve(fixture.path);
  const status = await lstat(candidate, { bigint: true });
  const canonical = await realpath(candidate);
  if (
    canonicalParent !== fixture.parent
    || !parentStatus.isDirectory()
    || parentStatus.isSymbolicLink()
    || parentStatus.dev !== fixture.parentDev
    || parentStatus.ino !== fixture.parentIno
    || dirname(candidate) !== canonicalParent
    || basename(candidate) !== fixture.basename
    || !fixture.basename.startsWith(FIXTURE_PREFIX)
    || !status.isDirectory()
    || status.isSymbolicLink()
    || status.dev !== fixture.dev
    || status.ino !== fixture.ino
    || canonical !== candidate
  ) {
    throw new Error(`refusing to remove substituted fixture root: ${candidate}`);
  }
  const admittedParent = await lstat(fixture.parent, { bigint: true });
  const admittedParentCanonical = await realpath(fixture.parent);
  const admitted = await lstat(candidate, { bigint: true });
  const admittedCanonical = await realpath(candidate);
  if (
    admittedParentCanonical !== fixture.parent
    || !admittedParent.isDirectory()
    || admittedParent.isSymbolicLink()
    || admittedParent.dev !== fixture.parentDev
    || admittedParent.ino !== fixture.parentIno
    || dirname(candidate) !== fixture.parent
    || basename(candidate) !== fixture.basename
    || !fixture.basename.startsWith(FIXTURE_PREFIX)
    || !admitted.isDirectory()
    || admitted.isSymbolicLink()
    || admitted.dev !== fixture.dev
    || admitted.ino !== fixture.ino
    || admittedCanonical !== candidate
  ) {
    throw new Error(`fixture root changed at recursive removal admission: ${candidate}`);
  }
  await rm(candidate, { recursive: true, force: false });
}

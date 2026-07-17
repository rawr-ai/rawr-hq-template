import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

export interface OwnedFixtureRoot {
  readonly path: string;
  cleanup(): Promise<void>;
}

export async function createOwnedFixtureRoot(): Promise<OwnedFixtureRoot> {
  const canonicalTemporaryRoot = await realpath(tmpdir());
  const initialParent = await lstat(canonicalTemporaryRoot, { bigint: true });
  if (
    !initialParent.isDirectory()
    || initialParent.isSymbolicLink()
    || await realpath(canonicalTemporaryRoot) !== canonicalTemporaryRoot
  ) throw new Error("Test fixture parent ownership admission failed");
  const path = await mkdtemp(join(canonicalTemporaryRoot, "rawr-agent-plugin-export-test-"));
  const initial = await lstat(path, { bigint: true });
  if (
    !initial.isDirectory()
    || initial.isSymbolicLink()
    || dirname(path) !== canonicalTemporaryRoot
    || !basename(path).startsWith("rawr-agent-plugin-export-test-")
    || await realpath(path) !== path
  ) throw new Error("Test fixture root ownership admission failed");
  let cleaned = false;
  return Object.freeze({
    path,
    async cleanup(): Promise<void> {
      if (cleaned) return;
      if (dirname(path) !== canonicalTemporaryRoot || !basename(path).startsWith("rawr-agent-plugin-export-test-")) {
        throw new Error("Refusing recursive cleanup outside the exact mkdtemp namespace");
      }
      const currentParent = await lstat(canonicalTemporaryRoot, { bigint: true });
      if (
        !currentParent.isDirectory()
        || currentParent.isSymbolicLink()
        || currentParent.dev !== initialParent.dev
        || currentParent.ino !== initialParent.ino
        || await realpath(canonicalTemporaryRoot) !== canonicalTemporaryRoot
      ) throw new Error("Refusing recursive cleanup after temporary-parent substitution");
      const current = await lstat(path, { bigint: true });
      const resolved = await realpath(path);
      if (
        resolved !== path
        || !current.isDirectory()
        || current.isSymbolicLink()
        || current.dev !== initial.dev
        || current.ino !== initial.ino
      ) throw new Error("Refusing recursive cleanup after fixture-root substitution");
      const immediateParent = await lstat(canonicalTemporaryRoot, { bigint: true });
      if (
        !immediateParent.isDirectory()
        || immediateParent.isSymbolicLink()
        || immediateParent.dev !== initialParent.dev
        || immediateParent.ino !== initialParent.ino
        || await realpath(canonicalTemporaryRoot) !== canonicalTemporaryRoot
      ) throw new Error("Refusing recursive cleanup without an immediate parent proof");
      const [immediate, immediateResolved] = await Promise.all([
        lstat(path, { bigint: true }),
        realpath(path),
      ]);
      if (
        dirname(path) !== canonicalTemporaryRoot
        || !basename(path).startsWith("rawr-agent-plugin-export-test-")
        || immediateResolved !== path
        || !immediate.isDirectory()
        || immediate.isSymbolicLink()
        || immediate.dev !== initial.dev
        || immediate.ino !== initial.ino
      ) throw new Error("Refusing recursive cleanup without an immediate ownership proof");
      await rm(path, { recursive: true, force: false });
      cleaned = true;
    },
  });
}

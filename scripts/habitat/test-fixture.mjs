import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const TEMP_ALIAS = "/tmp";
const PREFIX_PATTERN = /^rawr-habitat-[a-z0-9-]+-$/;

/** @param {string} prefix */
export async function createHabitatTestRoot(prefix) {
  if (!PREFIX_PATTERN.test(prefix)) {
    throw new Error(`Refusing invalid Habitat fixture prefix: ${prefix}`);
  }

  const tempRoot = await canonicalTempRoot();
  return mkdtemp(join(tempRoot, prefix));
}

/** @param {string} root @param {string} prefix */
export async function removeHabitatTestRoot(root, prefix) {
  if (!PREFIX_PATTERN.test(prefix)) {
    throw new Error(`Refusing invalid Habitat fixture prefix: ${prefix}`);
  }

  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink()) {
    throw new Error(`Refusing non-directory Habitat fixture cleanup: ${root}`);
  }

  const tempRoot = await canonicalTempRoot();
  const canonicalRoot = await realpath(root);
  if (
    canonicalRoot !== root
    || dirname(canonicalRoot) !== tempRoot
    || !basename(canonicalRoot).startsWith(prefix)
  ) {
    throw new Error(`Refusing unsafe Habitat fixture cleanup: ${canonicalRoot}`);
  }

  await rm(canonicalRoot, { recursive: true });
}

async function canonicalTempRoot() {
  const root = await realpath(TEMP_ALIAS);
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink()) {
    throw new Error(`Refusing unsafe Habitat fixture parent: ${root}`);
  }
  return root;
}

import {
  lstat,
  mkdtemp,
  readFile,
  rename,
  rmdir,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { createOwnedFixtureRoot, removeOwnedFixtureRoot } from "./owned-fixture-root";

describe("build owned fixture cleanup", () => {
  it("rejects a symlink substitution and preserves its target", async () => {
    const fixture = await createOwnedFixtureRoot();
    const preserved = `${fixture.path}.preserved`;
    const target = await mkdtemp(join(dirname(fixture.path), "rawr-build-target-"));
    const targetFile = join(target, "sentinel.txt");
    let cleaned = false;
    try {
      await writeFile(targetFile, "target\n");
      await writeFile(join(fixture.path, "owned.txt"), "owned\n");
      await rename(fixture.path, preserved);
      await symlink(target, fixture.path, "dir");

      await expect(removeOwnedFixtureRoot(fixture)).rejects.toThrow(/substituted fixture root|cleanup admission/u);
      expect(await readFile(targetFile, "utf8")).toBe("target\n");
      expect((await lstat(fixture.path)).isSymbolicLink()).toBe(true);

      await unlink(fixture.path);
      await rename(preserved, fixture.path);
      await removeOwnedFixtureRoot(fixture);
      cleaned = true;
    } finally {
      if (!cleaned) {
        if ((await statusIfPresent(fixture.path))?.isSymbolicLink()) await unlink(fixture.path);
        if (await statusIfPresent(preserved)) await rename(preserved, fixture.path);
        await removeOwnedFixtureRoot(fixture).catch(() => undefined);
      }
      await unlink(targetFile).catch(() => undefined);
      await rmdir(target).catch(() => undefined);
    }
  });
});

async function statusIfPresent(candidate: string) {
  try {
    return await lstat(candidate);
  } catch (error) {
    if (isCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

function isCode(error: unknown, code: string): boolean {
  return error !== null
    && typeof error === "object"
    && "code" in error
    && (error as { code?: unknown }).code === code;
}

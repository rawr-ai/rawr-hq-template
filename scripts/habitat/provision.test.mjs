import { afterEach, describe, expect, it } from "bun:test";
import { lstat, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  parseReleaseManifest,
  selectReleaseAsset,
  sha256File,
  verifyReleaseAsset,
} from "./provision.mjs";

const roots = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    const canonicalRoot = await realpath(root);
    const canonicalTemp = await realpath(tmpdir());
    const status = await lstat(canonicalRoot);
    if (
      !status.isDirectory()
      || dirname(canonicalRoot) !== canonicalTemp
      || !basename(canonicalRoot).startsWith("rawr-habitat-provision-test-")
    ) {
      throw new Error(`Refusing unsafe Habitat fixture cleanup: ${canonicalRoot}`);
    }
    await rm(canonicalRoot, { recursive: true });
  }
});

function fixtureManifest() {
  return parseReleaseManifest({
    schemaVersion: 1,
    owner: {
      repository: "owner/repository",
      sourceCommit: "source-commit",
      habitatTree: "habitat-tree",
    },
    build: { bunVersion: "1.4.0", bunRevision: "1.4.0-canary+revision" },
    release: { tag: "habitat-sdk-v1" },
    assets: {
      "darwin-arm64": { filename: "darwin", bytes: 5, sha256: "0".repeat(64) },
      "linux-x64": { filename: "linux", bytes: 5, sha256: "1".repeat(64) },
    },
  });
}

describe("Habitat standalone release consumer", () => {
  it("refuses an unsupported host", () => {
    expect(() => selectReleaseAsset(fixtureManifest(), "win32", "x64"))
      .toThrow("unavailable for win32-x64");
  });

  it("verifies exact bytes and rejects a corrupt asset", async () => {
    const root = await mkdtemp(join(tmpdir(), "rawr-habitat-provision-test-"));
    roots.push(root);
    const filename = join(root, "habitat");
    await writeFile(filename, "exact");
    const asset = {
      filename: "habitat",
      bytes: 5,
      sha256: await sha256File(filename),
    };
    await expect(verifyReleaseAsset(filename, asset)).resolves.toBe(filename);
    await writeFile(filename, "wrong");
    await expect(verifyReleaseAsset(filename, asset)).rejects.toThrow("digest mismatch");
  });
});

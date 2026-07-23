import { afterEach, describe, expect, it } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  parseReleaseManifest,
  selectReleaseAsset,
  sha256File,
  verifyReleaseAsset,
} from "./provision.mjs";
import {
  createHabitatTestRoot,
  removeHabitatTestRoot,
} from "./test-fixture.mjs";

const TEMP_PREFIX = "rawr-habitat-provision-test-";
const roots = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await removeHabitatTestRoot(root, TEMP_PREFIX);
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
    const root = await createHabitatTestRoot(TEMP_PREFIX);
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

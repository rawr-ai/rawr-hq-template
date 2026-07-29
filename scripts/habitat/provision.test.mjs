import { afterEach, describe, expect, it } from "bun:test";
import { access, symlink, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  parseReleaseManifest,
  selectReleaseAsset,
  sha256File,
  verifyReleaseAsset,
} from "./provision.mjs";
import { createHabitatTestRoot, removeHabitatTestRoot } from "./test-fixture.mjs";

const TEMP_PREFIX = "rawr-habitat-provision-test-";
const roots = /** @type {string[]} */ ([]);
const looseEntries = /** @type {string[]} */ ([]);

afterEach(async () => {
  for (const path of looseEntries.splice(0)) {
    await unlink(path);
  }
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
    },
  });
}

describe("Habitat standalone release consumer", () => {
  it("refuses an unsupported host", () => {
    expect(() => selectReleaseAsset(fixtureManifest(), "linux", "x64")).toThrow(
      "unavailable for linux-x64"
    );
  });

  it("refuses fields outside the release schema", () => {
    expect(() => parseReleaseManifest({ ...fixtureManifest(), extra: true })).toThrow(
      "release manifest is invalid"
    );
  });

  it("refuses an asset filename outside the release cache", () => {
    const valid = fixtureManifest();
    const manifest = {
      ...valid,
      assets: {
        ...valid.assets,
        "darwin-arm64": {
          ...valid.assets["darwin-arm64"],
          filename: "../../package.json",
        },
      },
    };
    expect(() => parseReleaseManifest(manifest)).toThrow("requires a basename");
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

describe("Habitat fixture cleanup boundary", () => {
  it("refuses invalid or mismatched ownership prefixes without deleting the fixture", async () => {
    const root = await createHabitatTestRoot(TEMP_PREFIX);
    roots.push(root);

    await expect(removeHabitatTestRoot(root, "habitat-test-")).rejects.toThrow(
      "invalid Habitat fixture prefix"
    );
    await expect(removeHabitatTestRoot(root, "rawr-habitat-other-test-")).rejects.toThrow(
      "unsafe Habitat fixture cleanup"
    );
    await expect(access(root)).resolves.toBeNull();
  });

  it("refuses files and symlinks without deleting either target", async () => {
    const root = await createHabitatTestRoot(TEMP_PREFIX);
    roots.push(root);
    const file = `${root}-file`;
    const link = `${root}-link`;
    await writeFile(file, "keep");
    await symlink(root, link, "dir");
    looseEntries.push(file, link);

    await expect(removeHabitatTestRoot(file, TEMP_PREFIX)).rejects.toThrow(
      "non-directory Habitat fixture cleanup"
    );
    await expect(removeHabitatTestRoot(link, TEMP_PREFIX)).rejects.toThrow(
      "non-directory Habitat fixture cleanup"
    );
    await expect(access(file)).resolves.toBeNull();
    await expect(access(root)).resolves.toBeNull();
  });

  it("refuses parent aliases and directories outside the canonical temporary root", async () => {
    const root = await createHabitatTestRoot(TEMP_PREFIX);
    roots.push(root);
    const aliasParent = `${root}-parent-alias`;
    await symlink(dirname(root), aliasParent, "dir");
    looseEntries.push(aliasParent);
    const aliasedRoot = join(aliasParent, basename(root));

    await expect(removeHabitatTestRoot(aliasedRoot, TEMP_PREFIX)).rejects.toThrow(
      "unsafe Habitat fixture cleanup"
    );
    await expect(removeHabitatTestRoot(process.cwd(), TEMP_PREFIX)).rejects.toThrow(
      "unsafe Habitat fixture cleanup"
    );
    await expect(access(root)).resolves.toBeNull();
    await expect(access(join(process.cwd(), "package.json"))).resolves.toBeNull();
  });
});

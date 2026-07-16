import { afterEach, describe, expect, test } from "bun:test";
import { link, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { observeControllerPayload } from "../../../apps/cli/src/lib/controller/release-inspector.ts";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { force: true, recursive: true })));
});

async function temporaryDirectory(label: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), `rawr-${label}-`));
  cleanup.push(path);
  return path;
}

describe("controller payload inventory", () => {
  test("reports the inode count needed to reject a shared payload file", async () => {
    const fixtureRoot = await temporaryDirectory("hardlink");
    const releaseRoot = join(fixtureRoot, "release");
    const sharedRoot = join(fixtureRoot, "shared");
    const sharedFile = join(sharedRoot, "dependency.js");
    await mkdir(join(releaseRoot, "node_modules", "dependency"), { recursive: true });
    await mkdir(sharedRoot, { recursive: true });
    await writeFile(sharedFile, "export const shared = true;\n");
    await link(sharedFile, join(releaseRoot, "node_modules", "dependency", "index.js"));

    const observed = await observeControllerPayload(releaseRoot);
    expect(observed).toHaveLength(1);
    expect(observed[0]?.nlink).toBe(2);
  });
});

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("phase-a gate scaffold (hq)", () => {
  it("metadata contract gate scaffold keeps shared metadata surfaces reachable", async () => {
    await expect(
      fs.access(path.join(repoRoot, "packages", "hq", "src", "workspace", "plugins.ts")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(repoRoot, "plugins", "cli", "plugins", "src", "lib", "workspace-plugins.ts")),
    ).resolves.toBeUndefined();
  });

  it("import boundary gate scaffold keeps package/plugin roots discoverable", async () => {
    await expect(fs.access(path.join(repoRoot, "packages", "hq", "src", "workspace"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(repoRoot, "plugins", "cli", "plugins", "src", "lib"))).resolves.toBeUndefined();
  });

  it("forbidden legacy metadata keys gate scaffold exposes deterministic scanner", async () => {
    await expect(
      fs.access(path.join(repoRoot, "scripts", "phase-a", "check-forbidden-legacy-metadata-keys.mjs")),
    ).resolves.toBeUndefined();
  });
});

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("phase-a gate scaffold (plugin-plugins)", () => {
  it("metadata contract gate scaffold keeps workspace parser files in scope", async () => {
    await expect(
      fs.access(path.join(repoRoot, "plugins", "cli", "plugins", "src", "lib", "workspace-plugins.ts")),
    ).resolves.toBeUndefined();
  });

  it("import boundary gate scaffold keeps package boundary owner path visible", async () => {
    await expect(fs.access(path.join(repoRoot, "packages", "hq", "src", "workspace", "plugins.ts"))).resolves.toBeUndefined();
  });

  it("forbidden legacy metadata keys gate scaffold keeps scanner file available", async () => {
    await expect(
      fs.access(path.join(repoRoot, "scripts", "phase-a", "check-forbidden-legacy-metadata-keys.mjs")),
    ).resolves.toBeUndefined();
  });
});

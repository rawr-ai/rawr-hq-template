import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("phase-a gate scaffold (plugin-plugins)", () => {
  it("metadata contract gate scaffold keeps hq-ops catalog ownership in scope", async () => {
    await expect(
      fs.access(path.join(repoRoot, "services", "hq-ops", "src", "service", "shared", "repositories", "workspace-plugin-catalog-repository.ts")),
    ).resolves.toBeUndefined();
  });

  it("import boundary gate scaffold keeps projection service binding visible", async () => {
    await expect(
      fs.access(path.join(repoRoot, "plugins", "cli", "plugins", "src", "lib", "hq-ops-client.ts")),
    ).resolves.toBeUndefined();
  });

  it("forbidden legacy metadata keys gate scaffold keeps scanner file available", async () => {
    await expect(
      fs.access(path.join(repoRoot, "scripts", "phase-a", "check-forbidden-legacy-metadata-keys.mjs")),
    ).resolves.toBeUndefined();
  });
});

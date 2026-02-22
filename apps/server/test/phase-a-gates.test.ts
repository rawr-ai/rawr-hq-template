import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("phase-a gate scaffold (server)", () => {
  it("host composition guard gate scaffold keeps ingress mount wiring visible", async () => {
    const rawrSource = await fs.readFile(path.join(repoRoot, "apps", "server", "src", "rawr.ts"), "utf8");
    expect(rawrSource).toContain('"/api/inngest"');
  });

  it("route negative assertions gate scaffold keeps server route tests present", async () => {
    await expect(fs.access(path.join(repoRoot, "apps", "server", "test", "rawr.test.ts"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(repoRoot, "apps", "server", "test", "orpc-handlers.test.ts"))).resolves.toBeUndefined();
  });

  it("observability contract gate scaffold keeps observability package path present", async () => {
    await expect(
      fs.access(path.join(repoRoot, "packages", "coordination-observability", "test", "observability.test.ts")),
    ).resolves.toBeUndefined();
  });
});

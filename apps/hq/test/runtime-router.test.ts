import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("hq app runtime seam guard", () => {
  it("keeps the manifest cold and free of executable materialization", async () => {
    const manifestSource = await fs.readFile(path.join(repoRoot, "apps", "hq", "src", "manifest.ts"), "utf8");

    expect(manifestSource).not.toContain("implement(");
    expect(manifestSource).not.toContain("createRouterClient(");
    expect(manifestSource).not.toContain("materializeManifestBridgeSurfaces");
    expect(manifestSource).not.toContain("createEmbeddedInMemoryDbPoolAdapter");
    expect(manifestSource).not.toContain("createCoordinationClient(");
    expect(manifestSource).not.toContain("createStateClient(");
    expect(manifestSource).not.toContain("hostLogger");
  });

  it("does not preserve the old executable bridge in testing or rawr.hq.ts", async () => {
    const [testingSource, rawrHqSource] = await Promise.all([
      fs.readFile(path.join(repoRoot, "apps", "hq", "src", "testing.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "rawr.hq.ts"), "utf8"),
    ]);

    expect(testingSource).not.toContain("createTestingRawrHqManifest");
    expect(testingSource).not.toContain("createRawrHqManifest(");
    expect(testingSource).not.toContain("@orpc/server");
    expect(rawrHqSource).not.toContain("@rawr/hq-app/testing");
    expect(rawrHqSource).not.toContain("rawrHqManifest");
  });
});

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function normalizeSemanticSource(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, "");
}

describe("hq app declaration seam guard", () => {
  it("keeps the manifest cold and free of executable materialization", async () => {
    const manifestSource = await fs.readFile(path.join(repoRoot, "apps", "hq", "src", "manifest.ts"), "utf8");

    expect(manifestSource).not.toContain("implement(");
    expect(manifestSource).not.toContain("createRouterClient(");
    expect(manifestSource).not.toContain("materializeManifestBridgeSurfaces");
    expect(manifestSource).not.toContain("createEmbeddedInMemoryDbPoolAdapter");
    expect(manifestSource).not.toContain("createStateClient(");
    expect(manifestSource).not.toContain("hostLogger");
  });

  it("does not preserve the old executable bridge in testing or rawr.hq.ts", async () => {
    const testingPath = path.join(repoRoot, "apps", "hq", "src", "testing.ts");
    const rawrHqPath = path.join(repoRoot, "rawr.hq.ts");
    const [testingSource, rawrHqSource] = await Promise.all([
      fs.readFile(testingPath, "utf8").catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      }),
      fs.readFile(rawrHqPath, "utf8").catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      }),
    ]);

    expect(testingSource === null || normalizeSemanticSource(testingSource) === "export{};").toBe(true);
    expect(rawrHqSource).toBeNull();
  });

  it("does not publish a testing export from the HQ app package", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(repoRoot, "apps", "hq", "package.json"), "utf8"),
    ) as { exports?: Record<string, unknown> };

    expect(packageJson.exports?.["./testing"]).toBeUndefined();
  });
});

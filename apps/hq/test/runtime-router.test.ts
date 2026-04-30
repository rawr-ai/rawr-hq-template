import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { startRawrHqAsync } from "../async";
import { bootstrapRawrHqDev } from "../dev";
import { startRawrHqServer } from "../server";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function normalizeSemanticSource(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, "");
}

describe("hq app declaration seam guard", () => {
  it("keeps the canonical app shell cold and explicit about role/surface membership", async () => {
    const manifestSource = await fs.readFile(path.join(repoRoot, "apps", "hq", "rawr.hq.ts"), "utf8");

    expect(manifestSource).toContain('id: "hq"');
    expect(manifestSource).toContain("roles:");
    expect(manifestSource).toContain("server:");
    expect(manifestSource).toContain("async:");
    expect(manifestSource).not.toContain("implement(");
    expect(manifestSource).not.toContain("createRouterClient(");
    expect(manifestSource).not.toContain("materializeManifestBridgeSurfaces");
    expect(manifestSource).not.toContain("createEmbeddedInMemoryDbPoolAdapter");
    expect(manifestSource).not.toContain("createStateClient(");
    expect(manifestSource).not.toContain("hostLogger");
  });

  it("keeps src/manifest.ts as a thin compatibility forwarder", async () => {
    const testingPath = path.join(repoRoot, "apps", "hq", "src", "testing.ts");
    const manifestCompatPath = path.join(repoRoot, "apps", "hq", "src", "manifest.ts");
    const [testingSource, manifestCompatSource] = await Promise.all([
      fs.readFile(testingPath, "utf8").catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      }),
      fs.readFile(manifestCompatPath, "utf8"),
    ]);

    expect(testingSource === null || normalizeSemanticSource(testingSource) === "export{};").toBe(true);
    expect(normalizeSemanticSource(manifestCompatSource)).toBe(
      'export{createRawrHqManifest}from"../rawr.hq";exporttype{RawrHqManifest}from"../rawr.hq";',
    );
  });

  it("keeps entrypoints thin and runtime-app-owned", async () => {
    const [serverSource, asyncSource, devSource] = await Promise.all([
      fs.readFile(path.join(repoRoot, "apps", "hq", "server.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "apps", "hq", "async.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "apps", "hq", "dev.ts"), "utf8"),
    ]);

    expect(serverSource).toContain('from "./rawr.hq"');
    expect(serverSource).toContain("@rawr/sdk/app");
    expect(serverSource).toContain("startApp(");
    expect(serverSource).toContain('roles: ["server"]');
    expect(serverSource).not.toContain("./legacy-cutover");
    expect(asyncSource).toContain('from "./rawr.hq"');
    expect(asyncSource).not.toContain("./legacy-cutover");
    expect(devSource).toContain('from "./rawr.hq"');
    expect(devSource).not.toContain("./legacy-cutover");
    expect(serverSource).not.toContain("../server/src/");
    expect(asyncSource).not.toContain("../server/src/");
    expect(devSource).not.toContain("../server/src/");
    expect(serverSource).not.toContain("@rawr/server");
    expect(asyncSource).not.toContain("@rawr/server");
    expect(devSource).not.toContain("@rawr/server");
  });

  it("selects canonical shell entrypoints without importing server internals", async () => {
    const server = await startRawrHqServer();
    const dev = await bootstrapRawrHqDev();
    const asyncRole = await startRawrHqAsync();

    expect(server.role).toBe("server");
    expect(server.status).toBe("selected");
    expect(server.manifest.id).toBe("hq");
    expect(dev.roles).toEqual(["server", "async"]);
    expect(dev.status).toBe("selected");
    expect(dev.manifest.id).toBe("hq");
    expect(asyncRole.status).toBe("selected");
    expect(asyncRole.workflows).toEqual([]);
  });

  it("does not publish a testing export from the HQ app package", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(repoRoot, "apps", "hq", "package.json"), "utf8"),
    ) as { exports?: Record<string, unknown> };

    expect(packageJson.exports?.["./testing"]).toBeUndefined();
    expect(packageJson.exports?.["./manifest"]).toEqual({
      types: "./rawr.hq.ts",
      default: "./rawr.hq.ts",
    });
    expect(packageJson.exports?.["./legacy-cutover"]).toBeUndefined();
  });
});

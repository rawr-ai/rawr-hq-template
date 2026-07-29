import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("hq app declaration seam guard", () => {
  it("keeps the canonical app shell cold and explicit about role/surface membership", async () => {
    const manifestSource = await fs.readFile(
      path.join(repoRoot, "apps", "hq", "rawr.hq.ts"),
      "utf8"
    );

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

  it("keeps app-owned entrypoints and removes the legacy cutover", async () => {
    const hqRoot = path.join(repoRoot, "apps", "hq");
    const [serverSource, asyncSource, devSource] = await Promise.all([
      fs.readFile(path.join(hqRoot, "server.ts"), "utf8"),
      fs.readFile(path.join(hqRoot, "async.ts"), "utf8"),
      fs.readFile(path.join(hqRoot, "dev.ts"), "utf8"),
    ]);

    expect(serverSource).toContain("@rawr/server/host");
    expect(serverSource).toContain('role: "server"');
    expect(serverSource).not.toContain("legacy-cutover");
    expect(asyncSource).toContain('role: "async"');
    expect(devSource).toContain("startRawrHqServer");
    await expect(fs.access(path.join(hqRoot, "legacy-cutover.ts"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps the package graph one-way from the HQ app into the server host", async () => {
    const [hqPackage, serverPackage] = await Promise.all(
      ["hq", "server"].map(async (app) =>
        JSON.parse(await fs.readFile(path.join(repoRoot, "apps", app, "package.json"), "utf8"))
      )
    );

    expect(hqPackage.dependencies?.["@rawr/server"]).toBe("workspace:*");
    expect(serverPackage.dependencies?.["@rawr/hq-app"]).toBeUndefined();
    expect(hqPackage.exports?.["./testing"]).toBeUndefined();
    expect(hqPackage.exports?.["./manifest"]).toEqual({
      types: "./rawr.hq.ts",
      default: "./rawr.hq.ts",
    });
    expect(hqPackage.exports?.["./legacy-cutover"]).toBeUndefined();
    await expect(
      fs.access(path.join(repoRoot, "apps", "hq", "src", "manifest.ts"))
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});

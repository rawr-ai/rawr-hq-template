import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
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

  it("keeps entrypoints thin and shell-owned", async () => {
    const [serverSource, asyncSource, devSource, legacyCutoverSource] = await Promise.all([
      fs.readFile(path.join(repoRoot, "apps", "hq", "server.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "apps", "hq", "async.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "apps", "hq", "dev.ts"), "utf8"),
      fs.readFile(path.join(repoRoot, "apps", "hq", "legacy-cutover.ts"), "utf8"),
    ]);

    expect(serverSource).toContain('from "./rawr.hq"');
    expect(serverSource).toContain('from "./legacy-cutover"');
    expect(asyncSource).toContain('from "./rawr.hq"');
    expect(asyncSource).toContain('from "./legacy-cutover"');
    expect(devSource).toContain('from "./rawr.hq"');
    expect(devSource).toContain('from "./legacy-cutover"');
    expect(serverSource).not.toContain("../server/src/host-composition");
    expect(asyncSource).not.toContain("../server/src/host-composition");
    expect(devSource).not.toContain("../server/src/host-composition");
    expect(legacyCutoverSource).toContain('../server/src/bootstrap');
    expect(legacyCutoverSource).not.toContain("../server/src/host-composition");
    expect(legacyCutoverSource).not.toContain("../server/src/host-seam");
    expect(legacyCutoverSource).not.toContain("../server/src/host-realization");
  });

  it("smoke-boots the canonical shell through stubbed bridge deps", async () => {
    const listen = vi.fn();
    const fakeBootstrapped = {
      app: { listen },
      config: { port: 3100, baseUrl: "http://localhost:3100" },
      enabledPlugins: new Set<string>(),
      telemetry: { shutdown: vi.fn() },
    } as never;

    const server = await startRawrHqServer({
      deps: {
        bootstrapServer: async () => fakeBootstrapped,
      },
    });
    const dev = await bootstrapRawrHqDev({
      deps: {
        bootstrapServer: async () => fakeBootstrapped,
      },
    });
    const asyncRole = await startRawrHqAsync({
      log: vi.fn(),
    });

    expect(server.role).toBe("server");
    expect(server.manifest.id).toBe("hq");
    expect(listen).toHaveBeenCalledWith(3100);
    expect(dev.roles).toEqual(["server", "async"]);
    expect(dev.server.manifest.id).toBe("hq");
    expect(asyncRole.status).toBe("reserved");
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
  });
});

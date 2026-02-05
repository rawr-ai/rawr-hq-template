import { describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("rawr server routes", () => {
  it("does not serve plugin web modules when disabled", async () => {
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: new Set() });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(404);
  });

  it("serves plugin web modules when enabled", async () => {
    const enabled = new Set(["@rawr/plugin-mfe-demo"]);
    const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: enabled });
    const res = await app.handle(new Request("http://localhost/rawr/plugins/web/mfe-demo"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    const text = await res.text();
    expect(text).toContain("mount");
  });
});


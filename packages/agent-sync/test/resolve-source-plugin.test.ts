import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveSourcePlugin } from "../src/lib/resolve-source-plugin";

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<{ root: string; pluginDir: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-resolve-"));
  tempDirs.push(root);
  await fs.mkdir(path.join(root, "plugins", "agents"), { recursive: true });
  await fs.mkdir(path.join(root, "plugins", "cli"), { recursive: true });
  await fs.mkdir(path.join(root, "plugins", "web"), { recursive: true });
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "workspace" }), "utf8");

  const pluginDir = path.join(root, "plugins", "agents", "demo-plugin");
  await fs.mkdir(pluginDir, { recursive: true });
  await fs.writeFile(
    path.join(pluginDir, "package.json"),
    JSON.stringify({ name: "@rawr/plugin-demo", version: "1.2.3", description: "Demo plugin" }),
    "utf8",
  );

  return { root, pluginDir };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("resolveSourcePlugin", () => {
  it("resolves by package name", async () => {
    const { root, pluginDir } = await makeWorkspace();
    const resolved = await resolveSourcePlugin("@rawr/plugin-demo", root);
    expect(resolved.absPath).toBe(pluginDir);
    expect(resolved.packageName).toBe("@rawr/plugin-demo");
  });

  it("resolves by directory name", async () => {
    const { root, pluginDir } = await makeWorkspace();
    const resolved = await resolveSourcePlugin("demo-plugin", root);
    expect(resolved.absPath).toBe(pluginDir);
    expect(resolved.dirName).toBe("demo-plugin");
  });

  it("resolves by path", async () => {
    const { root, pluginDir } = await makeWorkspace();
    const relativePath = path.relative(root, pluginDir);
    const resolved = await resolveSourcePlugin(relativePath, root);
    expect(resolved.absPath).toBe(pluginDir);
  });

  it("throws when missing", async () => {
    const { root } = await makeWorkspace();
    await expect(resolveSourcePlugin("missing-plugin", root)).rejects.toThrow("Could not resolve plugin");
  });
});

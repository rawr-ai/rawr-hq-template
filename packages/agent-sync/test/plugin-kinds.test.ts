import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const AllowedKinds = ["toolkit", "agent", "web", "api", "workflows"] as const;
type RawrKind = (typeof AllowedKinds)[number];

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p: string): Promise<any> {
  const txt = await fs.readFile(p, "utf8");
  return JSON.parse(txt);
}

describe("plugin kinds", () => {
  it("every plugins/{cli,agents,web,api,workflows}/* package.json declares rawr.kind + rawr.capability", async () => {
    const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
    const pluginsDir = path.join(workspaceRoot, "plugins");

    const failures: string[] = [];

    for (const rootName of ["cli", "agents", "web", "api", "workflows"] as const) {
      const rootAbs = path.join(pluginsDir, rootName);
      if (!(await pathExists(rootAbs))) continue;
      const dirents = await fs.readdir(rootAbs, { withFileTypes: true });

      for (const dirent of dirents) {
        if (!dirent.isDirectory()) continue;
        const pluginAbs = path.join(rootAbs, dirent.name);
        const pkgPath = path.join(pluginAbs, "package.json");
        if (!(await pathExists(pkgPath))) continue;

        const pkg = await readJson(pkgPath);
        const kind: RawrKind | undefined = pkg?.rawr?.kind;
        const capability = typeof pkg?.rawr?.capability === "string" ? pkg.rawr.capability.trim() : "";
        if (!kind || !AllowedKinds.includes(kind)) {
          failures.push(`${rootName}/${dirent.name}: missing/invalid rawr.kind`);
        }
        if (!capability) {
          failures.push(`${rootName}/${dirent.name}: missing/invalid rawr.capability`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("toolkits export agent context via agent-pack/ (no canonical content roots at plugin root)", async () => {
    const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
    const toolkitsDir = path.join(workspaceRoot, "plugins", "cli");
    const dirents = await fs.readdir(toolkitsDir, { withFileTypes: true });

    const failures: string[] = [];

    for (const dirent of dirents) {
      if (!dirent.isDirectory()) continue;
      const pluginAbs = path.join(toolkitsDir, dirent.name);
      const pkgPath = path.join(pluginAbs, "package.json");
      if (!(await pathExists(pkgPath))) continue;

      const pkg = await readJson(pkgPath);
      const kind: RawrKind | undefined = pkg?.rawr?.kind;
      if (kind !== "toolkit") continue;

      for (const forbidden of ["skills", "workflows", "agents", "scripts"] as const) {
        if (await pathExists(path.join(pluginAbs, forbidden))) {
          failures.push(`${dirent.name}: toolkit must not define ${forbidden}/ at plugin root (use agent-pack/)`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});

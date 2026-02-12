import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanSourcePlugin } from "../src/lib/scan-source-plugin";
import type { SourcePlugin } from "../src/lib/types";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function writePkgJson(dir: string, data: any): Promise<void> {
  await fs.writeFile(path.join(dir, "package.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

describe("tools composition", () => {
  it("composes toolkit agent-pack content into tools with deterministic namespacing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-tools-ws-"));
    tempDirs.push(root);

    await writePkgJson(root, { name: "demo", private: true, workspaces: ["plugins/*/*"] });
    await fs.mkdir(path.join(root, "plugins", "agents"), { recursive: true });
    await fs.mkdir(path.join(root, "plugins", "cli"), { recursive: true });
    await fs.mkdir(path.join(root, "plugins", "web"), { recursive: true });

    const toolsDir = path.join(root, "plugins", "agents", "tools");
    await fs.mkdir(toolsDir, { recursive: true });
    await writePkgJson(toolsDir, { name: "@rawr/plugin-tools", rawr: { kind: "agent", pluginContent: { version: 1 } } });

    const tkDir = path.join(root, "plugins", "cli", "session-tools");
    await fs.mkdir(tkDir, { recursive: true });
    await writePkgJson(tkDir, { name: "@rawr/plugin-session-tools", rawr: { kind: "toolkit" } });

    await fs.mkdir(path.join(tkDir, "agent-pack", "skills", "sessions", "references"), { recursive: true });
    await fs.writeFile(path.join(tkDir, "agent-pack", "skills", "sessions", "SKILL.md"), "# sessions", "utf8");
    await fs.writeFile(path.join(tkDir, "agent-pack", "skills", "sessions", "references", "x.md"), "x", "utf8");

    await fs.mkdir(path.join(tkDir, "agent-pack", "workflows"), { recursive: true });
    await fs.writeFile(path.join(tkDir, "agent-pack", "workflows", "howto.md"), "# wf", "utf8");

    await fs.mkdir(path.join(tkDir, "agent-pack", "agents"), { recursive: true });
    await fs.writeFile(path.join(tkDir, "agent-pack", "agents", "helper.md"), "# agent", "utf8");

    await fs.mkdir(path.join(tkDir, "agent-pack", "scripts"), { recursive: true });
    await fs.writeFile(path.join(tkDir, "agent-pack", "scripts", "tool.sh"), "echo hi", "utf8");

    const source: SourcePlugin = {
      ref: "tools",
      absPath: toolsDir,
      dirName: "tools",
      packageName: "@rawr/plugin-tools",
      rawrKind: "agent",
    };

    const scanned = await scanSourcePlugin(source);
    expect(scanned.skills.map((s) => s.name)).toEqual(["toolkit-session-tools-sessions"]);
    expect(scanned.workflowFiles.map((w) => w.name)).toEqual(["session-tools--howto"]);
    expect(scanned.agentFiles.map((a) => a.name)).toEqual(["session-tools--helper"]);
    expect(scanned.scripts.map((s) => s.name)).toEqual(["session-tools--tool.sh"]);
  });

  it("respects tools plugin.yaml imports.toolkits selection", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-tools-ws-select-"));
    tempDirs.push(root);

    await writePkgJson(root, { name: "demo", private: true, workspaces: ["plugins/*/*"] });
    await fs.mkdir(path.join(root, "plugins", "agents"), { recursive: true });
    await fs.mkdir(path.join(root, "plugins", "cli"), { recursive: true });
    await fs.mkdir(path.join(root, "plugins", "web"), { recursive: true });

    const toolsDir = path.join(root, "plugins", "agents", "tools");
    await fs.mkdir(toolsDir, { recursive: true });
    await writePkgJson(toolsDir, { name: "@rawr/plugin-tools", rawr: { kind: "agent", pluginContent: { version: 1 } } });
    await fs.writeFile(
      path.join(toolsDir, "plugin.yaml"),
      "version: 1\nimports:\n  toolkits:\n    - a\n",
      "utf8",
    );

    const aDir = path.join(root, "plugins", "cli", "a");
    await fs.mkdir(aDir, { recursive: true });
    await writePkgJson(aDir, { name: "@rawr/plugin-a", rawr: { kind: "toolkit" } });
    await fs.mkdir(path.join(aDir, "agent-pack", "workflows"), { recursive: true });
    await fs.writeFile(path.join(aDir, "agent-pack", "workflows", "x.md"), "# x", "utf8");

    const bDir = path.join(root, "plugins", "cli", "b");
    await fs.mkdir(bDir, { recursive: true });
    await writePkgJson(bDir, { name: "@rawr/plugin-b", rawr: { kind: "toolkit" } });
    await fs.mkdir(path.join(bDir, "agent-pack", "workflows"), { recursive: true });
    await fs.writeFile(path.join(bDir, "agent-pack", "workflows", "y.md"), "# y", "utf8");

    const source: SourcePlugin = {
      ref: "tools",
      absPath: toolsDir,
      dirName: "tools",
      packageName: "@rawr/plugin-tools",
      rawrKind: "agent",
    };

    const scanned = await scanSourcePlugin(source);
    expect(scanned.workflowFiles.map((w) => w.name)).toEqual(["a--x"]);
  });
});

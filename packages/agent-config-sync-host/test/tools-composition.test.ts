import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanSourcePlugin } from "../src/scan-source-plugin";
import type { HostSourcePlugin } from "../src/types";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

async function writePackageJson(dir: string, data: unknown): Promise<void> {
  await fs.writeFile(path.join(dir, "package.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

describe("tools composition", () => {
  it("composes toolkit agent-pack content into tools with deterministic namespacing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-tools-ws-"));
    tempDirs.push(root);

    await writePackageJson(root, { name: "demo", private: true, workspaces: ["plugins/*/*"] });
    await fs.mkdir(path.join(root, "plugins", "agents"), { recursive: true });
    await fs.mkdir(path.join(root, "plugins", "cli"), { recursive: true });
    await fs.mkdir(path.join(root, "plugins", "web"), { recursive: true });

    const toolsDir = path.join(root, "plugins", "agents", "tools");
    await fs.mkdir(toolsDir, { recursive: true });
    await writePackageJson(toolsDir, {
      name: "@rawr/plugin-tools",
      rawr: { kind: "agent", pluginContent: { version: 1 } },
    });

    const toolkitDir = path.join(root, "plugins", "cli", "session-tools");
    await fs.mkdir(toolkitDir, { recursive: true });
    await writePackageJson(toolkitDir, {
      name: "@rawr/plugin-session-tools",
      rawr: { kind: "toolkit" },
    });

    await fs.mkdir(path.join(toolkitDir, "agent-pack", "skills", "sessions", "references"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(toolkitDir, "agent-pack", "skills", "sessions", "SKILL.md"),
      "# sessions",
      "utf8",
    );

    await fs.mkdir(path.join(toolkitDir, "agent-pack", "workflows"), { recursive: true });
    await fs.writeFile(
      path.join(toolkitDir, "agent-pack", "workflows", "howto.md"),
      "# wf",
      "utf8",
    );

    await fs.mkdir(path.join(toolkitDir, "agent-pack", "agents"), { recursive: true });
    await fs.writeFile(
      path.join(toolkitDir, "agent-pack", "agents", "helper.md"),
      "# agent",
      "utf8",
    );

    await fs.mkdir(path.join(toolkitDir, "agent-pack", "scripts"), { recursive: true });
    await fs.writeFile(
      path.join(toolkitDir, "agent-pack", "scripts", "tool.sh"),
      "echo hi",
      "utf8",
    );

    const sourcePlugin: HostSourcePlugin = {
      ref: "tools",
      absPath: toolsDir,
      dirName: "tools",
      packageName: "@rawr/plugin-tools",
      rawrKind: "agent",
    };

    const scanned = await scanSourcePlugin(sourcePlugin);
    expect(scanned.skills.map((skill) => skill.name)).toEqual([
      "toolkit-session-tools-sessions",
    ]);
    expect(scanned.workflowFiles.map((workflow) => workflow.name)).toEqual([
      "session-tools--howto",
    ]);
    expect(scanned.agentFiles.map((agent) => agent.name)).toEqual([
      "session-tools--helper",
    ]);
    expect(scanned.scripts.map((script) => script.name)).toEqual([
      "session-tools--tool.sh",
    ]);
  });

  it("respects tools plugin.yaml imports.toolkits selection", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-tools-select-"));
    tempDirs.push(root);

    await writePackageJson(root, { name: "demo", private: true, workspaces: ["plugins/*/*"] });
    await fs.mkdir(path.join(root, "plugins", "agents"), { recursive: true });
    await fs.mkdir(path.join(root, "plugins", "cli"), { recursive: true });
    await fs.mkdir(path.join(root, "plugins", "web"), { recursive: true });

    const toolsDir = path.join(root, "plugins", "agents", "tools");
    await fs.mkdir(toolsDir, { recursive: true });
    await writePackageJson(toolsDir, {
      name: "@rawr/plugin-tools",
      rawr: { kind: "agent", pluginContent: { version: 1 } },
    });
    await fs.writeFile(
      path.join(toolsDir, "plugin.yaml"),
      "version: 1\nimports:\n  toolkits:\n    - a\n",
      "utf8",
    );

    const aDir = path.join(root, "plugins", "cli", "a");
    await fs.mkdir(aDir, { recursive: true });
    await writePackageJson(aDir, { name: "@rawr/plugin-a", rawr: { kind: "toolkit" } });
    await fs.mkdir(path.join(aDir, "agent-pack", "workflows"), { recursive: true });
    await fs.writeFile(path.join(aDir, "agent-pack", "workflows", "x.md"), "# x", "utf8");

    const bDir = path.join(root, "plugins", "cli", "b");
    await fs.mkdir(bDir, { recursive: true });
    await writePackageJson(bDir, { name: "@rawr/plugin-b", rawr: { kind: "toolkit" } });
    await fs.mkdir(path.join(bDir, "agent-pack", "workflows"), { recursive: true });
    await fs.writeFile(path.join(bDir, "agent-pack", "workflows", "y.md"), "# y", "utf8");

    const sourcePlugin: HostSourcePlugin = {
      ref: "tools",
      absPath: toolsDir,
      dirName: "tools",
      packageName: "@rawr/plugin-tools",
      rawrKind: "agent",
    };

    const scanned = await scanSourcePlugin(sourcePlugin);
    expect(scanned.workflowFiles.map((workflow) => workflow.name)).toEqual(["a--x"]);
  });
});

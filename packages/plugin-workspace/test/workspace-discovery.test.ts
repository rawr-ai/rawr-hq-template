import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { listWorkspacePlugins } from "../src";

const tempDirs: string[] = [];

const KIND_BY_ROOT = {
  cli: "toolkit",
  agents: "agent",
  web: "web",
  "server/api": "api",
  "async/workflows": "workflows",
  "async/schedules": "schedules",
} as const;

type DiscoveryRoot = keyof typeof KIND_BY_ROOT;

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function createWorkspaceWithRoots(roots: DiscoveryRoot[]): Promise<string> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-plugin-workspace-discovery-"));
  tempDirs.push(tempRoot);
  const workspaceRoot = path.join(tempRoot, "repo");

  await writeJsonFile(path.join(workspaceRoot, "package.json"), {
    name: "rawr-plugin-workspace-discovery-test",
    private: true,
  });

  for (const root of roots) {
    const dirName = `sample-${root.replaceAll("/", "-")}`;
    await writeJsonFile(path.join(workspaceRoot, "plugins", root, dirName, "package.json"), {
      name: `@rawr/sample-${root.replaceAll("/", "-")}`,
      private: true,
      rawr: {
        kind: KIND_BY_ROOT[root],
        capability: `cap-${root.replaceAll("/", "-")}`,
      },
    });
  }

  return workspaceRoot;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("@rawr/plugin-workspace discovery roots", () => {
  it("discovers plugins under cli/agents/web and canonical runtime roots", async () => {
    const workspaceRoot = await createWorkspaceWithRoots(["cli", "agents", "web", "server/api", "async/workflows", "async/schedules"]);

    const plugins = await listWorkspacePlugins(workspaceRoot);

    expect(plugins.map((plugin) => plugin.kind).sort()).toEqual(["agent", "api", "schedules", "toolkit", "web", "workflows"]);
    expect(plugins.map((plugin) => plugin.capability).sort()).toEqual([
      "cap-agents",
      "cap-async-schedules",
      "cap-async-workflows",
      "cap-cli",
      "cap-server-api",
      "cap-web",
    ]);
  });

  it("keeps existing cli/agents/web behavior when new roots are absent", async () => {
    const workspaceRoot = await createWorkspaceWithRoots(["cli", "agents", "web"]);

    const plugins = await listWorkspacePlugins(workspaceRoot);

    expect(plugins).toHaveLength(3);
    expect(plugins.map((plugin) => plugin.kind).sort()).toEqual(["agent", "toolkit", "web"]);
    expect(plugins.some((plugin) => plugin.kind === "api")).toBe(false);
    expect(plugins.some((plugin) => plugin.kind === "workflows")).toBe(false);
  });

  it("ignores package roots that do not opt into the rawr plugin contract", async () => {
    const workspaceRoot = await createWorkspaceWithRoots(["web"]);

    await writeJsonFile(path.join(workspaceRoot, "plugins", "server", "api", "example-todo", "package.json"), {
      name: "@rawr/plugin-server-api-example-todo",
      private: true,
    });

    const plugins = await listWorkspacePlugins(workspaceRoot);

    expect(plugins).toHaveLength(1);
    expect(plugins[0]?.kind).toBe("web");
    expect(plugins.some((plugin) => plugin.dirName === "example-todo")).toBe(false);
  });
});

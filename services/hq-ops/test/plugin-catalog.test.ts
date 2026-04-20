import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createClient } from "../src/client";
import { createClientOptions, invocation } from "./helpers";

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

async function createWorkspace(): Promise<string> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-ops-plugin-catalog-"));
  tempDirs.push(tempRoot);
  const workspaceRoot = path.join(tempRoot, "repo");
  await writeJsonFile(path.join(workspaceRoot, "package.json"), { private: true });
  return workspaceRoot;
}

async function writePlugin(
  workspaceRoot: string,
  root: DiscoveryRoot,
  dirName: string,
  packageJson: Record<string, unknown> = {},
): Promise<string> {
  const pluginRoot = path.join(workspaceRoot, "plugins", root, dirName);
  await writeJsonFile(path.join(pluginRoot, "package.json"), {
    name: `@rawr/${dirName}`,
    rawr: {
      kind: KIND_BY_ROOT[root],
      capability: dirName,
    },
    ...packageJson,
  });
  return pluginRoot;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("hq-ops pluginCatalog", () => {
  it("discovers canonical roots and computes command/runtime eligibility", async () => {
    const workspaceRoot = await createWorkspace();
    await writePlugin(workspaceRoot, "cli", "plugin-command", {
      oclif: { commands: "./src/commands", typescript: { commands: "./src/commands" } },
    });
    await writePlugin(workspaceRoot, "web", "plugin-web", {
      exports: { "./web": "./src/web.ts" },
    });
    await writePlugin(workspaceRoot, "agents", "plugin-agent");
    await writePlugin(workspaceRoot, "server/api", "plugin-api");
    await writePlugin(workspaceRoot, "async/workflows", "plugin-workflows");
    await writePlugin(workspaceRoot, "async/schedules", "plugin-schedules");
    await writeJsonFile(path.join(workspaceRoot, "plugins", "web", "not-a-plugin", "package.json"), {
      name: "@rawr/not-a-plugin",
    });

    const client = createClient(createClientOptions({ repoRoot: workspaceRoot }));
    const result = await client.pluginCatalog.listWorkspacePlugins({ workspaceRoot }, invocation("trace-catalog-list"));

    expect(result.plugins.map((plugin) => plugin.kind).sort()).toEqual(["agent", "api", "schedules", "toolkit", "web", "workflows"]);
    expect(result.plugins.map((plugin) => plugin.discoveryRoot).sort()).toEqual([
      "agents",
      "async/schedules",
      "async/workflows",
      "cli",
      "server/api",
      "web",
    ]);
    expect(result.plugins.find((plugin) => plugin.dirName === "plugin-command")?.commandPlugin).toEqual({
      eligible: true,
      reason: "has package.json#oclif command wiring",
    });
    expect(result.plugins.find((plugin) => plugin.dirName === "plugin-web")?.runtimeWeb).toEqual({
      eligible: true,
      reason: "has runtime exports (./server or ./web)",
    });
  });

  it("hard-fails forbidden legacy rawr keys and root kind mismatches", async () => {
    const workspaceRoot = await createWorkspace();
    await writePlugin(workspaceRoot, "cli", "legacy", {
      rawr: {
        kind: "toolkit",
        capability: "legacy",
        templateRole: "operational",
      },
    });

    const client = createClient(createClientOptions({ repoRoot: workspaceRoot }));
    await expect(
      client.pluginCatalog.listWorkspacePlugins({ workspaceRoot }, invocation("trace-catalog-forbidden")),
    ).rejects.toThrowError("forbidden rawr.templateRole");

    await fs.rm(path.join(workspaceRoot, "plugins", "cli", "legacy"), { recursive: true, force: true });
    await writePlugin(workspaceRoot, "cli", "wrong-kind", {
      rawr: {
        kind: "web",
        capability: "wrong-kind",
      },
    });

    await expect(
      client.pluginCatalog.listWorkspacePlugins({ workspaceRoot }, invocation("trace-catalog-kind")),
    ).rejects.toThrowError('rawr.kind must be "toolkit" for plugins/cli/*');
  });

  it("resolves IDs and reports not-found/kind-mismatch statuses", async () => {
    const workspaceRoot = await createWorkspace();
    await writePlugin(workspaceRoot, "web", "plugin-web", {
      name: "@rawr/plugin-web",
      exports: { "./server": "./src/server.ts" },
    });

    const client = createClient(createClientOptions({ repoRoot: workspaceRoot }));

    await expect(
      client.pluginCatalog.resolveWorkspacePlugin(
        { workspaceRoot, inputId: "plugin-web", requiredKind: "web" },
        invocation("trace-catalog-resolve-dir"),
      ),
    ).resolves.toMatchObject({
      status: "found",
      plugin: {
        id: "@rawr/plugin-web",
        dirName: "plugin-web",
        kind: "web",
      },
    });

    await expect(
      client.pluginCatalog.resolveWorkspacePlugin(
        { workspaceRoot, inputId: "@rawr/plugin-web", requiredKind: "toolkit" },
        invocation("trace-catalog-kind-mismatch"),
      ),
    ).resolves.toMatchObject({
      status: "kind_mismatch",
      actualKind: "web",
      knownPluginIds: ["@rawr/plugin-web"],
    });

    await expect(
      client.pluginCatalog.resolveWorkspacePlugin(
        { workspaceRoot, inputId: "missing", requiredKind: "web" },
        invocation("trace-catalog-not-found"),
      ),
    ).resolves.toMatchObject({
      status: "not_found",
      knownPluginIds: ["@rawr/plugin-web"],
    });
  });

  it("hard-fails ambiguous plugin identities", async () => {
    const workspaceRoot = await createWorkspace();
    await writePlugin(workspaceRoot, "cli", "duplicate", {
      name: "@rawr/plugin-one",
      oclif: { commands: "./src/commands", typescript: { commands: "./src/commands" } },
    });
    await writePlugin(workspaceRoot, "web", "duplicate", {
      name: "@rawr/plugin-two",
      exports: { "./web": "./src/web.ts" },
    });

    const client = createClient(createClientOptions({ repoRoot: workspaceRoot }));
    await expect(
      client.pluginCatalog.listWorkspacePlugins({ workspaceRoot }, invocation("trace-catalog-duplicate-dir")),
    ).rejects.toThrowError('duplicate plugin directory "duplicate"');

    await fs.rm(path.join(workspaceRoot, "plugins", "web", "duplicate"), { recursive: true, force: true });
    await writePlugin(workspaceRoot, "web", "unique-web", {
      name: "@rawr/plugin-one",
      exports: { "./web": "./src/web.ts" },
    });

    await expect(
      client.pluginCatalog.listWorkspacePlugins({ workspaceRoot }, invocation("trace-catalog-duplicate-id")),
    ).rejects.toThrowError('duplicate plugin id "@rawr/plugin-one"');
  });
});

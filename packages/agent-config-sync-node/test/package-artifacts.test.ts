import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { packageCodexPlugin } from "../src/codex-package";
import { packageCoworkPlugin } from "../src/cowork-package";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function listZipEntries(zipPath: string): Promise<string[]> {
  const buffer = await fs.readFile(zipPath);
  const entries: string[] = [];
  for (let offset = 0; offset <= buffer.length - 46; offset += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    entries.push(buffer.subarray(nameStart, nameEnd).toString("utf8"));
    offset = nameEnd + extraLength + commentLength - 1;
  }
  return entries.sort((left, right) => left.localeCompare(right));
}

describe("@rawr/agent-config-sync-node package artifacts", () => {
  it("builds baseline Codex native plugin package artifacts with source support material", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-codex-package-"));
    tempDirs.push(root);
    const pluginRoot = path.join(root, "plugin-demo");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    const agentPath = path.join(pluginRoot, "agents", "researcher.md");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.mkdir(path.dirname(agentPath), { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
    await fs.writeFile(agentPath, "# Researcher\n", "utf8");
    const outDir = path.join(root, "dist");

    const result = await packageCodexPlugin({
      sourcePlugin: {
        ref: "plugin-demo",
        absPath: pluginRoot,
        dirName: "plugin-demo",
        packageName: "@rawr/plugin-demo",
        version: "1.2.3",
        description: "Demo plugin",
      },
      content: {
        workflowFiles: [],
        skills: [{ name: "demo-skill", absPath: skillRoot }],
        scripts: [],
        agentFiles: [{ name: "researcher", absPath: agentPath }],
      },
      outDirAbs: outDir,
      dryRun: false,
    });

    expect(result).toMatchObject({
      plugin: "plugin-demo",
      action: "written",
      skillCount: 1,
      agentCount: 1,
    });
    const packageDir = path.join(outDir, "plugins", "plugin-demo");
    const manifest = JSON.parse(await fs.readFile(path.join(packageDir, ".codex-plugin", "plugin.json"), "utf8"));
    expect(manifest).toEqual({
      name: "plugin-demo",
      version: "1.2.3",
      description: "Demo plugin",
      skills: "./skills/",
      interface: {
        displayName: "plugin-demo",
        shortDescription: "Demo plugin",
        category: "rawr",
        capabilities: ["skills", "agents"],
      },
    });
    await expect(fs.readFile(path.join(packageDir, "skills", "demo-skill", "SKILL.md"), "utf8")).resolves.toBe("# Demo Skill\n");
    await expect(fs.readFile(path.join(packageDir, "agents", "researcher.md"), "utf8")).resolves.toBe("# Researcher\n");
    await expect(fs.stat(path.join(packageDir, "hooks"))).rejects.toThrow();
    expect(result.validationNotes).toContain("Custom agents and settings are packaged as RAWR source/support material until Codex exposes provider-native activation semantics for those surfaces");
  });

  it("builds Codex package artifacts with hooks, MCP, settings, and assets", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-codex-runtime-package-"));
    tempDirs.push(root);
    const pluginRoot = path.join(root, "plugin-demo");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    const hookPath = path.join(pluginRoot, "hooks", "pre-tool-use.mjs");
    const hookConfigPath = path.join(pluginRoot, "hooks", "hooks.json");
    const mcpPath = path.join(pluginRoot, "mcp", "demo-server.mjs");
    const scriptPath = path.join(pluginRoot, "scripts", "support.sh");
    const settingPath = path.join(pluginRoot, "settings", "config.toml");
    const assetPath = path.join(pluginRoot, "assets", "icon.txt");
    await Promise.all([
      fs.mkdir(skillRoot, { recursive: true }),
      fs.mkdir(path.dirname(hookPath), { recursive: true }),
      fs.mkdir(path.dirname(mcpPath), { recursive: true }),
      fs.mkdir(path.dirname(scriptPath), { recursive: true }),
      fs.mkdir(path.dirname(settingPath), { recursive: true }),
      fs.mkdir(path.dirname(assetPath), { recursive: true }),
    ]);
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
    await fs.writeFile(hookPath, "console.log('hook')\n", "utf8");
    await fs.writeFile(hookConfigPath, `${JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: `node "${pluginRoot}/hooks/pre-tool-use.mjs"` }],
          },
        ],
      },
    }, null, 2)}\n`, "utf8");
    await fs.writeFile(mcpPath, "console.log('mcp')\n", "utf8");
    await fs.writeFile(scriptPath, "echo support\n", "utf8");
    await fs.writeFile(settingPath, "model = \"gpt-5\"\n", "utf8");
    await fs.writeFile(assetPath, "asset\n", "utf8");

    const result = await packageCodexPlugin({
      sourcePlugin: {
        ref: "plugin-demo",
        absPath: pluginRoot,
        dirName: "plugin-demo",
        packageName: "@rawr/plugin-demo",
        version: "1.2.3",
        description: "Demo plugin",
      },
      content: {
        workflowFiles: [],
        skills: [{ name: "demo-skill", absPath: skillRoot }],
        scripts: [{ name: "support.sh", absPath: scriptPath }],
        agentFiles: [],
        hooks: [{ name: "pre-tool-use.mjs", absPath: hookPath }],
        hookConfigs: [{ name: "hooks.json", absPath: hookConfigPath }],
        mcpServers: [{ name: "demo-server.mjs", absPath: mcpPath }],
        settings: [{ name: "config.toml", absPath: settingPath }],
        assets: [{ name: "icon.txt", absPath: assetPath }],
        orchestration: [],
      },
      outDirAbs: path.join(root, "dist"),
      dryRun: false,
    });

    expect(result).toMatchObject({
      hookCount: 1,
      hookConfigCount: 1,
      scriptCount: 1,
      mcpServerCount: 1,
      settingsCount: 1,
      assetCount: 1,
    });
    const outDir = path.join(root, "dist", "plugins", "plugin-demo");
    const manifest = JSON.parse(await fs.readFile(path.join(outDir, ".codex-plugin", "plugin.json"), "utf8"));
    expect(manifest).toMatchObject({
      skills: "./skills/",
      hooks: "./hooks/hooks.json",
      mcpServers: "./.mcp.json",
      interface: {
        capabilities: ["skills", "hooks", "scripts", "mcp", "settings", "assets"],
      },
    });
    await expect(fs.readFile(path.join(outDir, "hooks", "pre-tool-use.mjs"), "utf8")).resolves.toContain("hook");
    const hooksJson = JSON.parse(await fs.readFile(path.join(outDir, "hooks", "hooks.json"), "utf8"));
    expect(hooksJson).toEqual({
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: "node \"${CODEX_PLUGIN_ROOT}/hooks/pre-tool-use.mjs\"" }],
          },
        ],
      },
    });
    await expect(fs.readFile(path.join(outDir, "scripts", "support.sh"), "utf8")).resolves.toBe("echo support\n");
    await expect(fs.readFile(path.join(outDir, "mcp", "demo-server.mjs"), "utf8")).resolves.toContain("mcp");
    const mcpJson = JSON.parse(await fs.readFile(path.join(outDir, ".mcp.json"), "utf8"));
    expect(mcpJson).toEqual({
      "demo-server": {
        command: "node",
        args: ["./mcp/demo-server.mjs"],
      },
    });
    await expect(fs.readFile(path.join(outDir, "assets", "icon.txt"), "utf8")).resolves.toBe("asset\n");
    await expect(fs.stat(path.join(outDir, "agents"))).rejects.toThrow();
    await expect(fs.readFile(path.join(outDir, "settings", "config.toml"), "utf8")).resolves.toBe("model = \"gpt-5\"\n");
  });

  it("packages hook scripts as support material without advertising inert hook lifecycle support", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-codex-hook-script-only-"));
    tempDirs.push(root);
    const pluginRoot = path.join(root, "plugin-demo");
    const hookPath = path.join(pluginRoot, "hooks", "pre-tool-use.mjs");
    await fs.mkdir(path.dirname(hookPath), { recursive: true });
    await fs.writeFile(hookPath, "console.log('hook')\n", "utf8");

    const result = await packageCodexPlugin({
      sourcePlugin: {
        ref: "plugin-demo",
        absPath: pluginRoot,
        dirName: "plugin-demo",
        packageName: "@rawr/plugin-demo",
        version: "1.2.3",
        description: "Demo plugin",
      },
      content: {
        workflowFiles: [],
        skills: [],
        scripts: [],
        agentFiles: [],
        hooks: [{ name: "pre-tool-use.mjs", absPath: hookPath }],
        hookConfigs: [],
      },
      outDirAbs: path.join(root, "dist"),
      dryRun: false,
    });

    expect(result).toMatchObject({
      hookCount: 1,
      hookConfigCount: 0,
    });
    const outDir = path.join(root, "dist", "plugins", "plugin-demo");
    const manifest = JSON.parse(await fs.readFile(path.join(outDir, ".codex-plugin", "plugin.json"), "utf8"));
    expect(manifest.hooks).toBeUndefined();
    expect(manifest.interface.capabilities).not.toContain("hooks");
    await expect(fs.readFile(path.join(outDir, "hooks", "pre-tool-use.mjs"), "utf8")).resolves.toContain("hook");
    await expect(fs.stat(path.join(outDir, "hooks", "hooks.json"))).rejects.toThrow();
  });

  it("removes stale Codex package output before rewriting skills", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-codex-package-stale-"));
    tempDirs.push(root);
    const pluginRoot = path.join(root, "plugin-demo");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    const outDir = path.join(root, "dist");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
    const packageDir = path.join(outDir, "plugins", "plugin-demo");
    await fs.mkdir(path.join(packageDir, "skills", "removed-skill"), { recursive: true });
    await fs.writeFile(path.join(packageDir, "skills", "removed-skill", "SKILL.md"), "# stale\n", "utf8");
    await fs.mkdir(path.join(packageDir, "skills", "demo-skill"), { recursive: true });
    await fs.writeFile(path.join(packageDir, "skills", "demo-skill", "stale.md"), "stale\n", "utf8");

    await packageCodexPlugin({
      sourcePlugin: {
        ref: "plugin-demo",
        absPath: pluginRoot,
        dirName: "plugin-demo",
        packageName: "@rawr/plugin-demo",
      },
      content: {
        workflowFiles: [],
        skills: [{ name: "demo-skill", absPath: skillRoot }],
        scripts: [],
        agentFiles: [],
      },
      outDirAbs: outDir,
      dryRun: false,
    });

    await expect(fs.stat(path.join(packageDir, "skills", "removed-skill"))).rejects.toThrow();
    await expect(fs.stat(path.join(packageDir, "skills", "demo-skill", "stale.md"))).rejects.toThrow();
    await expect(fs.readFile(path.join(packageDir, "skills", "demo-skill", "SKILL.md"), "utf8")).resolves.toBe("# Demo Skill\n");
  });

  it("builds a Codex marketplace root next to generated plugin package artifacts", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-codex-marketplace-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "rawr-hq-template", workspaces: ["plugins/*"] }, null, 2)}\n`,
      "utf8",
    );
    const pluginRoot = path.join(root, "plugins", "plugin-demo");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    const outDir = path.join(root, "dist", "codex", "plugins");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");

    const result = await packageCodexPlugin({
      sourcePlugin: {
        ref: "plugin-demo",
        absPath: pluginRoot,
        dirName: "plugin-demo",
        packageName: "@rawr/plugin-demo",
        version: "1.2.3",
        description: "Demo plugin",
        rawrKind: "toolkit",
      },
      content: {
        workflowFiles: [],
        skills: [{ name: "demo-skill", absPath: skillRoot }],
        scripts: [],
        agentFiles: [],
      },
      outDirAbs: outDir,
      dryRun: false,
    });

    expect(result).toMatchObject({
      marketplaceName: "rawr-hq-template",
      marketplaceRoot: path.join(root, "dist", "codex"),
      marketplacePath: path.join(root, "dist", "codex", ".agents", "plugins", "marketplace.json"),
      marketplaceAction: "written",
      marketplacePluginCount: 1,
    });
    const marketplace = JSON.parse(await fs.readFile(result.marketplacePath, "utf8"));
    expect(marketplace).toEqual({
      name: "rawr-hq-template",
      plugins: [
        {
          name: "plugin-demo",
          source: {
            source: "local",
            path: "./plugins/plugin-demo",
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL",
          },
          category: "toolkit",
        },
      ],
    });
  });

  it("removes stale Codex marketplace entries during full package regeneration", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-codex-marketplace-stale-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "rawr-hq-template", workspaces: ["plugins/*"] }, null, 2)}\n`,
      "utf8",
    );
    const pluginRoot = path.join(root, "plugins", "plugin-current");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    const codexRoot = path.join(root, "dist", "codex");
    const outDir = path.join(codexRoot, "plugins");
    const marketplacePath = path.join(codexRoot, ".agents", "plugins", "marketplace.json");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
    await fs.mkdir(path.join(outDir, "plugin-kept", ".codex-plugin"), { recursive: true });
    await fs.writeFile(path.join(outDir, "plugin-kept", ".codex-plugin", "plugin.json"), "{}\n", "utf8");
    await fs.mkdir(path.join(outDir, "plugin-retired", ".codex-plugin"), { recursive: true });
    await fs.writeFile(path.join(outDir, "plugin-retired", ".codex-plugin", "plugin.json"), "{}\n", "utf8");
    await fs.mkdir(path.dirname(marketplacePath), { recursive: true });
    await fs.writeFile(
      marketplacePath,
      `${JSON.stringify({
        name: "old-marketplace",
        plugins: [
          {
            name: "plugin-kept",
            source: { source: "local", path: "./plugins/plugin-kept" },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "toolkit",
          },
          {
            name: "plugin-missing",
            source: { source: "local", path: "./plugins/plugin-missing" },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "toolkit",
          },
          {
            name: "plugin-retired",
            source: { source: "local", path: "./plugins/plugin-retired" },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "toolkit",
          },
        ],
      }, null, 2)}\n`,
      "utf8",
    );

    const result = await packageCodexPlugin({
      sourcePlugin: {
        ref: "plugin-current",
        absPath: pluginRoot,
        dirName: "plugin-current",
        packageName: "@rawr/plugin-current",
        rawrKind: "agent",
      },
      content: {
        workflowFiles: [],
        skills: [{ name: "demo-skill", absPath: skillRoot }],
        scripts: [],
        agentFiles: [],
      },
      outDirAbs: outDir,
      dryRun: false,
      activePluginNames: ["plugin-current", "plugin-kept"],
    });

    expect(result.marketplacePluginCount).toBe(2);
    const marketplace = JSON.parse(await fs.readFile(marketplacePath, "utf8"));
    expect(marketplace).toEqual({
      name: "rawr-hq-template",
      plugins: [
        {
          name: "plugin-current",
          source: {
            source: "local",
            path: "./plugins/plugin-current",
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL",
          },
          category: "agent",
        },
        {
          name: "plugin-kept",
          source: {
            source: "local",
            path: "./plugins/plugin-kept",
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL",
          },
          category: "toolkit",
        },
      ],
    });
    await expect(fs.stat(path.join(outDir, "plugin-retired"))).rejects.toThrow();
  });

  it("reports Cowork ZIP validation details and manifest summary", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-cowork-package-"));
    tempDirs.push(root);
    const pluginRoot = path.join(root, "plugin-demo");
    const workflowPath = path.join(pluginRoot, "workflows", "hello.md");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    const scriptPath = path.join(pluginRoot, "scripts", "demo.sh");
    const agentPath = path.join(pluginRoot, "agents", "researcher.md");
    await Promise.all([
      fs.mkdir(path.dirname(workflowPath), { recursive: true }),
      fs.mkdir(skillRoot, { recursive: true }),
      fs.mkdir(path.dirname(scriptPath), { recursive: true }),
      fs.mkdir(path.dirname(agentPath), { recursive: true }),
    ]);
    await fs.writeFile(workflowPath, "# hello\n", "utf8");
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
    await fs.writeFile(scriptPath, "echo demo\n", "utf8");
    await fs.writeFile(agentPath, "# Researcher\n", "utf8");

    const result = await packageCoworkPlugin({
      sourcePlugin: {
        ref: "plugin-demo",
        absPath: pluginRoot,
        dirName: "plugin-demo",
        packageName: "@rawr/plugin-demo",
        version: "1.2.3",
        description: "Demo plugin",
      },
      content: {
        workflowFiles: [{ name: "hello", absPath: workflowPath }],
        skills: [{ name: "demo-skill", absPath: skillRoot }],
        scripts: [{ name: "demo.sh", absPath: scriptPath }],
        agentFiles: [{ name: "researcher", absPath: agentPath }],
      },
      outDirAbs: path.join(root, "dist"),
      dryRun: false,
      includeAgents: true,
    });

    expect(result.manifestSummary).toEqual({
      name: "plugin-demo",
      version: "1.2.3",
      commands: 1,
      skills: 1,
      scripts: 1,
      agents: 1,
    });
    expect(result.distributionMode).toBe("manual_upload");
    expect(result.warnings).toEqual([]);
    expect(result.sizeBytes).toBeGreaterThan(0);
    const zipHeader = await fs.readFile(result.outFile);
    expect(zipHeader.subarray(0, 2).toString("utf8")).toBe("PK");
    await expect(listZipEntries(result.outFile)).resolves.toEqual([
      ".claude-plugin/plugin.json",
      "agents/researcher.md",
      "commands/hello.md",
      "scripts/demo.sh",
      "skills/demo-skill/SKILL.md",
    ]);
  });

  it("rejects Cowork manifests with unsupported component path overrides", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-cowork-bad-manifest-"));
    tempDirs.push(root);
    const pluginRoot = path.join(root, "plugin-demo");
    const manifestPath = path.join(pluginRoot, ".claude-plugin", "plugin.json");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    await Promise.all([
      fs.mkdir(path.dirname(manifestPath), { recursive: true }),
      fs.mkdir(skillRoot, { recursive: true }),
    ]);
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
    await fs.writeFile(
      manifestPath,
      `${JSON.stringify({
        name: "plugin-demo",
        version: "1.2.3",
        description: "Demo plugin",
        skills: "./custom-skills/",
      }, null, 2)}\n`,
      "utf8",
    );

    await expect(packageCoworkPlugin({
      sourcePlugin: {
        ref: "plugin-demo",
        absPath: pluginRoot,
        dirName: "plugin-demo",
        packageName: "@rawr/plugin-demo",
        version: "1.2.3",
        description: "Demo plugin",
      },
      content: {
        workflowFiles: [],
        skills: [{ name: "demo-skill", absPath: skillRoot }],
        scripts: [],
        agentFiles: [],
      },
      outDirAbs: path.join(root, "dist"),
      dryRun: false,
      includeAgents: true,
    })).rejects.toThrow("Unsupported Cowork plugin manifest path for 'skills'");
  });
});

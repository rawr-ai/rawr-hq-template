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

describe("@rawr/agent-config-sync-node package artifacts", () => {
  it("builds Codex plugin package artifacts with skills only", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-codex-package-"));
    tempDirs.push(root);
    const pluginRoot = path.join(root, "plugin-demo");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
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
        agentFiles: [{ name: "researcher", absPath: path.join(pluginRoot, "agents", "researcher.md") }],
      },
      outDirAbs: outDir,
      dryRun: false,
    });

    expect(result).toMatchObject({
      plugin: "plugin-demo",
      action: "written",
      skillCount: 1,
    });
    const manifest = JSON.parse(await fs.readFile(path.join(outDir, "plugin-demo", ".codex-plugin", "plugin.json"), "utf8"));
    expect(manifest).toEqual({
      name: "plugin-demo",
      version: "1.2.3",
      description: "Demo plugin",
      skills: "./skills/",
    });
    await expect(fs.readFile(path.join(outDir, "plugin-demo", "skills", "demo-skill", "SKILL.md"), "utf8")).resolves.toBe("# Demo Skill\n");
    await expect(fs.stat(path.join(outDir, "plugin-demo", "agents"))).rejects.toThrow();
    await expect(fs.stat(path.join(outDir, "plugin-demo", "hooks"))).rejects.toThrow();
    expect(result.validationNotes).toContain("Only skills are packaged; custom agents, hooks, MCP, and settings are intentionally omitted");
  });

  it("removes stale Codex package output before rewriting skills", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-node-codex-package-stale-"));
    tempDirs.push(root);
    const pluginRoot = path.join(root, "plugin-demo");
    const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
    const outDir = path.join(root, "dist");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
    await fs.mkdir(path.join(outDir, "plugin-demo", "skills", "removed-skill"), { recursive: true });
    await fs.writeFile(path.join(outDir, "plugin-demo", "skills", "removed-skill", "SKILL.md"), "# stale\n", "utf8");
    await fs.mkdir(path.join(outDir, "plugin-demo", "skills", "demo-skill"), { recursive: true });
    await fs.writeFile(path.join(outDir, "plugin-demo", "skills", "demo-skill", "stale.md"), "stale\n", "utf8");

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

    await expect(fs.stat(path.join(outDir, "plugin-demo", "skills", "removed-skill"))).rejects.toThrow();
    await expect(fs.stat(path.join(outDir, "plugin-demo", "skills", "demo-skill", "stale.md"))).rejects.toThrow();
    await expect(fs.readFile(path.join(outDir, "plugin-demo", "skills", "demo-skill", "SKILL.md"), "utf8")).resolves.toBe("# Demo Skill\n");
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
    expect(result.warnings).toEqual([]);
    expect(result.sizeBytes).toBeGreaterThan(0);
    const zipHeader = await fs.readFile(result.outFile);
    expect(zipHeader.subarray(0, 2).toString("utf8")).toBe("PK");
  });
});

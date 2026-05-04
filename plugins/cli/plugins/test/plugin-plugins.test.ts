import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";
import { describe, expect, it } from "vitest";
import { packageCodexPlugin } from "../src/lib/agent-config-sync-resources/codex-package";
import { packageCoworkPlugin } from "../src/lib/agent-config-sync-resources/cowork-package";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("@rawr/plugin-plugins", () => {
  it("keeps sweep candidate classification out of the projection command", async () => {
    const commandSource = await fs.readFile(
      path.join(testDir, "..", "src", "commands", "plugins", "sweep.ts"),
      "utf8",
    );

    expect(commandSource).toContain("planSweepCandidates");
    expect(commandSource).not.toContain("inferTypeFromPath");
  });

  it("builds Codex plugin package artifacts with skills only", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-plugins-codex-package-"));
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
  });

  it("reports Cowork ZIP validation details and manifest summary", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-plugins-cowork-package-"));
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

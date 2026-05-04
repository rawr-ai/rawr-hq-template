import fs from "node:fs/promises";
import path from "node:path";

import { copyDirTree, ensureDir, writeJsonFile } from "./fs-utils";
import type { HostSourceContent, HostSourcePlugin } from "./types";

type CodexPluginManifest = {
  name: string;
  version: string;
  description: string;
  skills: string;
};

export type CodexPackageResult = {
  plugin: string;
  outDir: string;
  action: "planned" | "written";
  manifestPath: string;
  skillCount: number;
  validationNotes: string[];
};

export async function packageCodexPlugin(input: {
  sourcePlugin: HostSourcePlugin;
  content: HostSourceContent;
  outDirAbs: string;
  dryRun: boolean;
  undoCapture?: {
    captureWriteTarget(target: string): Promise<void>;
  };
}): Promise<CodexPackageResult> {
  const pluginDir = path.join(input.outDirAbs, input.sourcePlugin.dirName);
  const manifestPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
  const manifest: CodexPluginManifest = {
    name: input.sourcePlugin.dirName,
    version: input.sourcePlugin.version ?? "1.0.0",
    description: input.sourcePlugin.description ?? "Synced from RAWR HQ",
    skills: "./skills/",
  };

  if (!input.dryRun) {
    await input.undoCapture?.captureWriteTarget(pluginDir);
    await fs.rm(pluginDir, { recursive: true, force: true });
    await ensureDir(path.dirname(manifestPath));
    await writeJsonFile(manifestPath, manifest);

    for (const skill of input.content.skills) {
      const skillDir = path.join(pluginDir, "skills", skill.name);
      await ensureDir(skillDir);
      await copyDirTree(skill.absPath, skillDir);
    }

    const unsupportedDirs = ["agents", "hooks", "mcp", "settings"];
    for (const dir of unsupportedDirs) {
      await fs.rm(path.join(pluginDir, dir), { recursive: true, force: true });
    }
  }

  return {
    plugin: input.sourcePlugin.dirName,
    outDir: pluginDir,
    action: input.dryRun ? "planned" : "written",
    manifestPath,
    skillCount: input.content.skills.length,
    validationNotes: [
      "Codex package generation is artifact-only; runtime plugin install validation requires a Codex binary with plugin support",
      "Only skills are packaged; custom agents, hooks, MCP, and settings are intentionally omitted",
    ],
  };
}

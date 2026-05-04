import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import yazl from "yazl";

import {
  copyDirTree,
  ensureDir,
  pathExists,
  readJsonFile,
  writeJsonFile,
} from "./fs-utils";
import type { HostSourceContent, HostSourcePlugin } from "./types";

type ClaudePluginManifest = {
  name?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
};

type PackageJson = {
  version?: unknown;
  description?: unknown;
};

type CoworkManifestSummary = {
  name: string;
  version: string;
  commands: number;
  skills: number;
  scripts: number;
  agents: number;
};

/**
 * Converts host paths to portable zip entry paths.
 */
function toZipPath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

/**
 * Lists files deterministically before writing a Cowork archive.
 */
async function listFilesRecursively(rootAbsPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dirAbsPath: string): Promise<void> {
    const dirents = await fs.readdir(dirAbsPath, { withFileTypes: true });
    for (const dirent of dirents) {
      if (dirent.name === "." || dirent.name === "..") continue;
      const absPath = path.join(dirAbsPath, dirent.name);
      if (dirent.isDirectory()) {
        await walk(absPath);
      } else if (dirent.isFile()) {
        files.push(absPath);
      }
    }
  }

  await walk(rootAbsPath);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

/**
 * Writes a staged plugin directory to a zip archive.
 */
async function zipDirToFile(input: {
  dirAbs: string;
  outFileAbs: string;
}): Promise<void> {
  const files = await listFilesRecursively(input.dirAbs);
  await ensureDir(path.dirname(input.outFileAbs));

  await new Promise<void>((resolve, reject) => {
    const zipFile = new yazl.ZipFile();
    for (const absPath of files) {
      const relativePath = path.relative(input.dirAbs, absPath);
      zipFile.addFile(absPath, toZipPath(relativePath));
    }

    zipFile.outputStream
      .pipe(createWriteStream(input.outFileAbs))
      .on("close", resolve)
      .on("error", reject);

    zipFile.end();
  });
}

/**
 * Supplies the Claude plugin manifest for Cowork archives from source metadata
 * or package.json fallback values.
 */
async function readOrCreatePluginManifest(input: {
  sourcePlugin: HostSourcePlugin;
  stagingRootAbs: string;
  dryRun: boolean;
}): Promise<ClaudePluginManifest> {
  const sourceManifestPath = path.join(
    input.sourcePlugin.absPath,
    ".claude-plugin",
    "plugin.json",
  );
  const stagingManifestPath = path.join(
    input.stagingRootAbs,
    ".claude-plugin",
    "plugin.json",
  );

  if (await pathExists(sourceManifestPath)) {
    const raw = await fs.readFile(sourceManifestPath, "utf8");
    if (!input.dryRun) {
      await fs.writeFile(stagingManifestPath, raw, "utf8");
    }
    return JSON.parse(raw) as ClaudePluginManifest;
  }

  const packageJsonPath = path.join(input.sourcePlugin.absPath, "package.json");
  const packageJson = (await readJsonFile<PackageJson>(packageJsonPath)) ?? {};
  const version =
    typeof packageJson.version === "string"
      ? packageJson.version
      : input.sourcePlugin.version ?? "1.0.0";
  const description =
    typeof packageJson.description === "string"
      ? packageJson.description
      : input.sourcePlugin.description ?? "Synced from RAWR HQ";

  const manifest: ClaudePluginManifest = {
    name: input.sourcePlugin.dirName,
    version,
    description,
  };

  if (!input.dryRun) {
    await writeJsonFile(stagingManifestPath, manifest);
  }
  return manifest;
}

/**
 * Result for CLI-owned Cowork packaging.
 */
export type CoworkPackageResult = {
  plugin: string;
  outFile: string;
  action: "planned" | "written";
  sizeBytes?: number;
  manifestSummary: CoworkManifestSummary;
  warnings: string[];
};

function validateCoworkManifestSummary(summary: CoworkManifestSummary): string[] {
  const warnings: string[] = [];
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(summary.name)) {
    warnings.push("plugin name should be lowercase kebab-case and <= 64 characters");
  }
  if (summary.version.trim().length === 0 || summary.version === "1.0.0") {
    warnings.push("plugin version should be explicit and meaningful");
  }
  return warnings;
}

/**
 * Packages provider-effective Claude content into a Cowork-compatible archive.
 *
 * The CLI owns archive staging and zip output; provider content resolution
 * stays in agent-config-sync.
 */
export async function packageCoworkPlugin(input: {
  sourcePlugin: HostSourcePlugin;
  content: HostSourceContent;
  outDirAbs: string;
  dryRun: boolean;
  includeAgents: boolean;
  undoCapture?: {
    captureWriteTarget(target: string): Promise<void>;
  };
}): Promise<CoworkPackageResult> {
  const outFile = path.join(input.outDirAbs, `${input.sourcePlugin.dirName}.zip`);
  const baseSummary: CoworkManifestSummary = {
    name: input.sourcePlugin.dirName,
    version: input.sourcePlugin.version ?? "1.0.0",
    commands: input.content.workflowFiles.length,
    skills: input.content.skills.length,
    scripts: input.content.scripts.length,
    agents: input.includeAgents ? input.content.agentFiles.length : 0,
  };
  if (input.dryRun) {
    return {
      plugin: input.sourcePlugin.dirName,
      outFile,
      action: "planned",
      manifestSummary: baseSummary,
      warnings: validateCoworkManifestSummary(baseSummary),
    };
  }

  const stagingRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), `rawr-cowork-${input.sourcePlugin.dirName}-`),
  );
  try {
    const pluginRoot = path.join(stagingRoot, input.sourcePlugin.dirName);
    const claudePluginDir = path.join(pluginRoot, ".claude-plugin");
    const commandsDir = path.join(pluginRoot, "commands");
    const skillsDir = path.join(pluginRoot, "skills");
    const scriptsDir = path.join(pluginRoot, "scripts");
    const agentsDir = path.join(pluginRoot, "agents");

    await Promise.all([
      ensureDir(claudePluginDir),
      ensureDir(commandsDir),
      ensureDir(skillsDir),
      ensureDir(scriptsDir),
      ensureDir(agentsDir),
    ]);

    const manifest = await readOrCreatePluginManifest({
      sourcePlugin: input.sourcePlugin,
      stagingRootAbs: pluginRoot,
      dryRun: false,
    });
    const manifestSummary: CoworkManifestSummary = {
      ...baseSummary,
      name: typeof manifest.name === "string" ? manifest.name : baseSummary.name,
      version: typeof manifest.version === "string" ? manifest.version : baseSummary.version,
    };

    for (const workflow of input.content.workflowFiles) {
      await fs.copyFile(
        workflow.absPath,
        path.join(commandsDir, `${workflow.name}.md`),
      );
    }

    for (const skill of input.content.skills) {
      const skillDir = path.join(skillsDir, skill.name);
      await ensureDir(skillDir);
      await copyDirTree(skill.absPath, skillDir);
    }

    for (const script of input.content.scripts) {
      await fs.copyFile(script.absPath, path.join(scriptsDir, script.name));
    }

    if (input.includeAgents) {
      for (const agent of input.content.agentFiles) {
        await fs.copyFile(agent.absPath, path.join(agentsDir, `${agent.name}.md`));
      }
    }

    await input.undoCapture?.captureWriteTarget(outFile);
    await zipDirToFile({ dirAbs: pluginRoot, outFileAbs: outFile });
    const sizeBytes = (await fs.stat(outFile)).size;
    const warnings = validateCoworkManifestSummary(manifestSummary);
    if (sizeBytes >= 45 * 1024 * 1024) {
      warnings.push("package size is near Cowork's 50 MB practical limit");
    }
    return {
      plugin: input.sourcePlugin.dirName,
      outFile,
      action: "written",
      sizeBytes,
      manifestSummary,
      warnings,
    };
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }
}

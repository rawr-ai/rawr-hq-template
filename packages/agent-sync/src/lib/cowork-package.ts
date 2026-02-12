import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import yazl from "yazl";

import { copyDirTree, ensureDir, pathExists, readJsonFile, writeJsonFile } from "./fs-utils";
import type { SourceContent, SourcePlugin } from "./types";

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

function toZipPath(relPath: string): string {
  // Zip entries must use forward slashes.
  return relPath.split(path.sep).join("/");
}

async function listFilesRecursively(rootAbs: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(dirAbs: string) {
    const dirents = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const d of dirents) {
      if (d.name === "." || d.name === "..") continue;
      const abs = path.join(dirAbs, d.name);
      if (d.isDirectory()) await walk(abs);
      else if (d.isFile()) out.push(abs);
    }
  }

  await walk(rootAbs);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

async function zipDirToFile(input: { dirAbs: string; outFileAbs: string }): Promise<void> {
  const files = await listFilesRecursively(input.dirAbs);
  await ensureDir(path.dirname(input.outFileAbs));

  await new Promise<void>((resolve, reject) => {
    const zipfile = new yazl.ZipFile();
    for (const abs of files) {
      const rel = path.relative(input.dirAbs, abs);
      zipfile.addFile(abs, toZipPath(rel));
    }

    zipfile.outputStream
      .pipe(createWriteStream(input.outFileAbs))
      .on("close", resolve)
      .on("error", reject);

    zipfile.end();
  });
}

async function readOrCreatePluginManifest(input: {
  sourcePlugin: SourcePlugin;
  stagingRootAbs: string;
  dryRun: boolean;
}): Promise<void> {
  const sourceManifest = path.join(input.sourcePlugin.absPath, ".claude-plugin", "plugin.json");
  const stagingManifest = path.join(input.stagingRootAbs, ".claude-plugin", "plugin.json");

  if (await pathExists(sourceManifest)) {
    const raw = await fs.readFile(sourceManifest, "utf8");
    if (!input.dryRun) await fs.writeFile(stagingManifest, raw, "utf8");
    return;
  }

  const pkgPath = path.join(input.sourcePlugin.absPath, "package.json");
  const pkg = (await readJsonFile<PackageJson>(pkgPath)) ?? {};
  const version = typeof pkg.version === "string" ? pkg.version : input.sourcePlugin.version ?? "1.0.0";
  const description =
    typeof pkg.description === "string"
      ? pkg.description
      : input.sourcePlugin.description ?? "Synced from RAWR HQ";

  const manifest: ClaudePluginManifest = {
    name: input.sourcePlugin.dirName,
    version,
    description,
  };

  if (!input.dryRun) {
    await writeJsonFile(stagingManifest, manifest);
  }
}

export type CoworkPackageResult = {
  plugin: string;
  outFile: string;
  action: "planned" | "written";
};

export async function packageCoworkPlugin(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  outDirAbs: string;
  dryRun: boolean;
  includeAgents: boolean;
  undoCapture?: {
    captureWriteTarget(target: string): Promise<void>;
  };
}): Promise<CoworkPackageResult> {
  const outFile = path.join(input.outDirAbs, `${input.sourcePlugin.dirName}.zip`);
  if (input.dryRun) return { plugin: input.sourcePlugin.dirName, outFile, action: "planned" };

  const stagingRoot = await fs.mkdtemp(path.join(os.tmpdir(), `rawr-cowork-${input.sourcePlugin.dirName}-`));
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

    await readOrCreatePluginManifest({
      sourcePlugin: input.sourcePlugin,
      stagingRootAbs: pluginRoot,
      dryRun: false,
    });

    // workflows -> commands
    for (const wf of input.content.workflowFiles) {
      const target = path.join(commandsDir, `${wf.name}.md`);
      await fs.copyFile(wf.absPath, target);
    }

    // skills directories
    for (const skill of input.content.skills) {
      const target = path.join(skillsDir, skill.name);
      await ensureDir(target);
      await copyDirTree(skill.absPath, target);
    }

    // scripts
    for (const script of input.content.scripts) {
      const target = path.join(scriptsDir, script.name);
      await fs.copyFile(script.absPath, target);
    }

    if (input.includeAgents) {
      for (const agent of input.content.agentFiles) {
        const target = path.join(agentsDir, `${agent.name}.md`);
        await fs.copyFile(agent.absPath, target);
      }
    }

    await input.undoCapture?.captureWriteTarget(outFile);

    // Zip the plugin root itself (not the temp staging parent).
    await zipDirToFile({ dirAbs: pluginRoot, outFileAbs: outFile });
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }

  return { plugin: input.sourcePlugin.dirName, outFile, action: "written" };
}

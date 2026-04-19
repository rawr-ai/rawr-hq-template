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

function toZipPath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

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

async function readOrCreatePluginManifest(input: {
  sourcePlugin: HostSourcePlugin;
  stagingRootAbs: string;
  dryRun: boolean;
}): Promise<void> {
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
    return;
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
}

export type CoworkPackageResult = {
  plugin: string;
  outFile: string;
  action: "planned" | "written";
};

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
  if (input.dryRun) {
    return { plugin: input.sourcePlugin.dirName, outFile, action: "planned" };
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

    await readOrCreatePluginManifest({
      sourcePlugin: input.sourcePlugin,
      stagingRootAbs: pluginRoot,
      dryRun: false,
    });

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
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }

  return { plugin: input.sourcePlugin.dirName, outFile, action: "written" };
}

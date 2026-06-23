import { createHash } from "node:crypto";
import type { SourceContent, SourcePlugin } from "../../entities";
import { stableJsonStringify } from "../../helpers/stable-json";
import type { AgentConfigSyncResources } from "../../resources";

export type ProviderContentVersion = {
  contentHash: string;
  providerVersion: string;
};

type FingerprintedFile = {
  path: string;
  sha256: string;
};

type FingerprintedEntry = {
  name: string;
  files: FingerprintedFile[];
};

const VERSION_HASH_LENGTH = 12;

export async function resolveProviderVersion(input: {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  resources: AgentConfigSyncResources;
}): Promise<ProviderContentVersion> {
  const fingerprint = {
    plugin: input.sourcePlugin.dirName,
    packageName: input.sourcePlugin.packageName ?? null,
    description: input.sourcePlugin.description ?? null,
    workflows: await fingerprintFiles(input.content.workflowFiles, input.resources),
    skills: await fingerprintContentEntries(input.content.skills, input.resources),
    scripts: await fingerprintFiles(input.content.scripts, input.resources),
    agents: await fingerprintFiles(input.content.agentFiles, input.resources),
    hooks: await fingerprintFiles(input.content.hooks ?? [], input.resources),
    hookConfigs: await fingerprintFiles(input.content.hookConfigs ?? [], input.resources),
    mcpServers: await fingerprintFiles(input.content.mcpServers ?? [], input.resources),
    settings: await fingerprintFiles(input.content.settings ?? [], input.resources),
    assets: await fingerprintFiles(input.content.assets ?? [], input.resources),
    orchestration: [...(input.content.orchestration ?? [])]
      .map((item) => ({
        name: item.name,
        provider: item.provider,
        sourceKind: item.sourceKind,
        skillInvocations: [...item.skillInvocations].sort(),
        taskSpawns: [...item.taskSpawns].sort(),
        todoState: item.todoState,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };

  const contentHash = sha256Text(stableJsonStringify(fingerprint));
  return {
    contentHash,
    providerVersion: `0.0.0-rawr.${contentHash.slice(0, VERSION_HASH_LENGTH)}`,
  };
}

async function fingerprintFiles(
  files: Array<{ name: string; absPath: string }>,
  resources: AgentConfigSyncResources,
): Promise<FingerprintedEntry[]> {
  const entries = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      files: [
        {
          path: file.name,
          sha256: await sha256File(file.absPath, resources),
        },
      ],
    })),
  );
  return sortEntries(entries);
}

async function fingerprintContentEntries(
  entries: Array<{ name: string; absPath: string }>,
  resources: AgentConfigSyncResources,
): Promise<FingerprintedEntry[]> {
  const fingerprinted = await Promise.all(
    entries.map(async (entry) => ({
      name: entry.name,
      files: await fingerprintPathTree(entry.absPath, resources),
    })),
  );
  return sortEntries(fingerprinted);
}

async function fingerprintPathTree(
  rootPath: string,
  resources: AgentConfigSyncResources,
): Promise<FingerprintedFile[]> {
  const rootKind = await resources.files.statPathKind(rootPath);
  if (rootKind === "file") {
    return [{ path: resources.path.basename(rootPath), sha256: await sha256File(rootPath, resources) }];
  }
  if (rootKind !== "dir") {
    return [{ path: ".", sha256: "missing" }];
  }

  const files: FingerprintedFile[] = [];
  await walk(rootPath);
  return files.sort((a, b) => a.path.localeCompare(b.path));

  async function walk(dirPath: string): Promise<void> {
    const dirents = await resources.files.readDir(dirPath);
    for (const dirent of dirents.sort((a, b) => a.name.localeCompare(b.name))) {
      const absPath = resources.path.join(dirPath, dirent.name);
      if (dirent.isDirectory) {
        await walk(absPath);
        continue;
      }
      files.push({
        path: resources.path.relative(rootPath, absPath).split(resources.path.sep).join("/"),
        sha256: await sha256File(absPath, resources),
      });
    }
  }
}

async function sha256File(filePath: string, resources: AgentConfigSyncResources): Promise<string> {
  const bytes = await resources.files.readFileBytes(filePath);
  if (!bytes) return "missing";
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sortEntries(entries: FingerprintedEntry[]): FingerprintedEntry[] {
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

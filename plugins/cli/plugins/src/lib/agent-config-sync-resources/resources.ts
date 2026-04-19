import fs from "node:fs/promises";
import path from "node:path";

import type { AgentConfigSyncResources } from "@rawr/agent-config-sync";
import { resolvePluginContentLayout } from "./plugin-content";
import { scanCanonicalContentAtRoot } from "./scan-canonical-content";
import {
  copyDirTree,
  dirsIdentical,
  ensureDir,
  filesIdentical,
  pathExists,
  readJsonFile,
  writeJsonFile,
} from "./fs-utils";

export function createNodeAgentConfigSyncResources(): AgentConfigSyncResources {
  return {
    files: {
      pathExists,
      readJsonFile,
      writeJsonFile,
      ensureDir,
      filesIdentical,
      dirsIdentical,
      copyFile: async (sourcePath, destinationPath) => {
        await ensureDir(path.dirname(destinationPath));
        await fs.copyFile(sourcePath, destinationPath);
      },
      copyDirTree,
      removePath: async (targetPath, options) => {
        await fs.rm(targetPath, { recursive: options?.recursive ?? false, force: true });
      },
      statPathKind: async (targetPath) => {
        try {
          const stat = await fs.stat(targetPath);
          return stat.isDirectory() ? "dir" : "file";
        } catch {
          return null;
        }
      },
      readDir: async (targetPath) => {
        try {
          const dirents = await fs.readdir(targetPath, { withFileTypes: true });
          return dirents.map((dirent) => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
          }));
        } catch {
          return [];
        }
      },
    },
    sources: {
      readProviderOverlay: async ({ agent, sourcePlugin }) => {
        const layout = await resolvePluginContentLayout(sourcePlugin);
        const overlayRoot = layout.overlayRootAbs[agent];
        if (!(await pathExists(overlayRoot))) return null;
        return scanCanonicalContentAtRoot(overlayRoot, layout.includeByProvider[agent]);
      },
    },
  };
}

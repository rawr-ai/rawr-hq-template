import fs from "node:fs/promises";
import path from "node:path";

import type { AgentConfigSyncResources } from "@rawr/agent-config-sync/resources";
import {
  copyDirTree,
  dirsIdentical,
  ensureDir,
  filesIdentical,
  pathExists,
  readJsonFile,
  writeJsonFile,
} from "./fs-utils";

/**
 * Node filesystem adapter for agent-config-sync.
 *
 * These are primitive file operations only; source-content layout and merge
 * semantics live in the service modules.
 */
export function createNodeAgentConfigSyncResources(): AgentConfigSyncResources {
  return {
    files: {
      pathExists,
      readTextFile: async (filePath) => {
        try {
          return await fs.readFile(filePath, "utf8");
        } catch {
          return null;
        }
      },
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
    path: {
      join: (...parts) => path.join(...parts),
      resolve: (...parts) => path.resolve(...parts),
      dirname: (targetPath) => path.dirname(targetPath),
      basename: (targetPath) => path.basename(targetPath),
      relative: (from, to) => path.relative(from, to),
      isAbsolute: (targetPath) => path.isAbsolute(targetPath),
      sep: path.sep,
    },
  };
}

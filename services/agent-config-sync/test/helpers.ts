import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import fs from "node:fs/promises";
import path from "node:path";
import type { CreateClientOptions } from "../src/client";
import type { Service } from "../src/service/base";
import type { AgentConfigSyncResources } from "../src/service/shared/resources";

export function createFakeResources(): AgentConfigSyncResources {
  return {
    files: {
      pathExists: async () => false,
      readTextFile: async () => null,
      readJsonFile: async () => null,
      writeJsonFile: async () => {},
      ensureDir: async () => {},
      filesIdentical: async () => false,
      dirsIdentical: async () => false,
      copyFile: async () => {},
      copyDirTree: async () => {},
      removePath: async () => {},
      statPathKind: async () => null,
      readDir: async () => [],
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

export function createNodeTestResources(): AgentConfigSyncResources {
  async function pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async function listFilesRecursive(rootPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(absDir: string): Promise<void> {
      const dirents = await fs.readdir(absDir, { withFileTypes: true });
      for (const dirent of dirents) {
        const absPath = path.join(absDir, dirent.name);
        if (dirent.isDirectory()) {
          await walk(absPath);
          continue;
        }
        if (dirent.isFile()) files.push(absPath);
      }
    }

    if (!(await pathExists(rootPath))) return files;
    await walk(rootPath);
    return files.sort((a, b) => a.localeCompare(b));
  }

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
      readJsonFile: async <T>(filePath: string) => {
        try {
          return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
        } catch {
          return null;
        }
      },
      writeJsonFile: async (filePath, data) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
      },
      ensureDir: async (dirPath) => {
        await fs.mkdir(dirPath, { recursive: true });
      },
      filesIdentical: async (leftPath, rightPath) => {
        if (!(await pathExists(leftPath)) || !(await pathExists(rightPath))) return false;
        const [left, right] = await Promise.all([fs.readFile(leftPath), fs.readFile(rightPath)]);
        return left.equals(right);
      },
      dirsIdentical: async (leftPath, rightPath) => {
        const [leftFiles, rightFiles] = await Promise.all([listFilesRecursive(leftPath), listFilesRecursive(rightPath)]);
        const leftRelative = leftFiles.map((filePath) => path.relative(leftPath, filePath));
        const rightRelative = rightFiles.map((filePath) => path.relative(rightPath, filePath));
        if (JSON.stringify(leftRelative) !== JSON.stringify(rightRelative)) return false;
        for (const relPath of leftRelative) {
          const [left, right] = await Promise.all([
            fs.readFile(path.join(leftPath, relPath)),
            fs.readFile(path.join(rightPath, relPath)),
          ]);
          if (!left.equals(right)) return false;
        }
        return true;
      },
      copyFile: async (sourcePath, destinationPath) => {
        await fs.mkdir(path.dirname(destinationPath), { recursive: true });
        await fs.copyFile(sourcePath, destinationPath);
      },
      copyDirTree: async (sourceDir, destinationDir) => {
        for (const sourceFile of await listFilesRecursive(sourceDir)) {
          const relPath = path.relative(sourceDir, sourceFile);
          const destinationFile = path.join(destinationDir, relPath);
          await fs.mkdir(path.dirname(destinationFile), { recursive: true });
          await fs.copyFile(sourceFile, destinationFile);
        }
      },
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

export function createClientOptions(input: {
  repoRoot?: string;
  resources?: AgentConfigSyncResources;
} = {}): CreateClientOptions {
  const deps: Service["Deps"] = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    resources: input.resources ?? createFakeResources(),
  };

  return {
    deps,
    scope: {
      repoRoot: input.repoRoot ?? "/tmp/workspace",
    },
    config: {},
  };
}

export type AgentConfigSyncPathKind = "file" | "dir";

export type AgentConfigSyncDirEntry = {
  name: string;
  isDirectory: boolean;
};

/**
 * Port type for path operations required by the agent-config-sync service.
 *
 * @remarks
 * This is intentionally typed as the full Node path module surface, but the
 * service never imports `node:path` directly at runtime. The composition root
 * provides this dependency, keeping adapters outside the service package.
 */
export type AgentConfigSyncPathResources = typeof import("node:path");

export interface AgentConfigSyncFileResources {
  pathExists(filePath: string): Promise<boolean>;
  readTextFile(filePath: string): Promise<string | null>;
  readJsonFile<T>(filePath: string): Promise<T | null>;
  writeJsonFile(filePath: string, data: unknown): Promise<void>;
  ensureDir(dirPath: string): Promise<void>;
  filesIdentical(leftPath: string, rightPath: string): Promise<boolean>;
  dirsIdentical(leftPath: string, rightPath: string): Promise<boolean>;
  copyFile(sourcePath: string, destinationPath: string): Promise<void>;
  copyDirTree(sourceDir: string, destinationDir: string): Promise<void>;
  removePath(targetPath: string, options?: { recursive?: boolean }): Promise<void>;
  statPathKind(targetPath: string): Promise<AgentConfigSyncPathKind | null>;
  readDir(targetPath: string): Promise<AgentConfigSyncDirEntry[]>;
}

export interface AgentConfigSyncResources {
  files: AgentConfigSyncFileResources;
  path: AgentConfigSyncPathResources;
}

export interface AgentConfigSyncUndoCapture {
  captureWriteTarget(target: string): Promise<void>;
  captureDeleteTarget(target: string): Promise<void>;
}

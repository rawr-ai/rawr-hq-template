import path from "node:path";

type RelativeEntry = {
  relativePath: string;
};

type FileEntry = RelativeEntry & {
  fileId: unknown;
};

type DirectoryEntry = RelativeEntry & {
  directoryId: unknown;
};

function resolveRelativePath(workspaceRoot: string, relativePath: string) {
  return path.join(workspaceRoot, ...relativePath.split("/"));
}

function indexByFileId(entries: readonly FileEntry[]) {
  return new Map(
    entries.map((entry) => {
      if (typeof entry.fileId !== "string") {
        throw new Error("Service result included a non-string file id.");
      }
      return [entry.fileId, entry.relativePath] as const;
    }),
  );
}

function indexByDirectoryId(entries: readonly DirectoryEntry[]) {
  return new Map(
    entries.map((entry) => {
      if (typeof entry.directoryId !== "string") {
        throw new Error("Service result included a non-string directory id.");
      }
      return [entry.directoryId, entry.relativePath] as const;
    }),
  );
}

function requireRelativePath(map: Map<string, string>, id: string, kind: "file" | "directory"): string {
  const value = map.get(id);
  if (!value) {
    throw new Error(`Service result did not include expected ${kind} id: ${id}`);
  }
  return value;
}

export function projectInitResult(workspaceRoot: string, data: {
  createdEntries: readonly string[];
  existingEntries: readonly string[];
  managedFiles: readonly FileEntry[];
}) {
  const files = indexByFileId(data.managedFiles);

  return {
    workspaceRoot,
    createdPaths: data.createdEntries.map((entry) => resolveRelativePath(workspaceRoot, entry)),
    existingPaths: data.existingEntries.map((entry) => resolveRelativePath(workspaceRoot, entry)),
    files: {
      readmePath: resolveRelativePath(workspaceRoot, requireRelativePath(files, "workspace-readme", "file")),
      gitignorePath: resolveRelativePath(workspaceRoot, requireRelativePath(files, "workspace-gitignore", "file")),
    },
  };
}

export function projectConsolidateResult(workspaceRoot: string, data: {
  sourceCounts: {
    jsonConversations: number;
    markdownDocuments: number;
    totalSources: number;
  };
  familyCount: number;
  normalizedThreadCount: number;
  anomalyCount: number;
  warnings: readonly string[];
  outputDirectories: readonly DirectoryEntry[];
  outputEntries: readonly FileEntry[];
}) {
  const files = indexByFileId(data.outputEntries);
  const directories = indexByDirectoryId(data.outputDirectories);

  return {
    workspaceRoot,
    sourceCounts: data.sourceCounts,
    familyCount: data.familyCount,
    normalizedThreadCount: data.normalizedThreadCount,
    anomalyCount: data.anomalyCount,
    warnings: [...data.warnings],
    outputPaths: {
      inventory: resolveRelativePath(workspaceRoot, requireRelativePath(files, "inventory", "file")),
      familyGraphs: resolveRelativePath(workspaceRoot, requireRelativePath(files, "familyGraphs", "file")),
      intermediateGraph: resolveRelativePath(workspaceRoot, requireRelativePath(files, "intermediateGraph", "file")),
      manifest: resolveRelativePath(workspaceRoot, requireRelativePath(files, "manifest", "file")),
      reportsDir: resolveRelativePath(workspaceRoot, requireRelativePath(directories, "reports", "directory")),
      normalizedThreadsDir: resolveRelativePath(
        workspaceRoot,
        requireRelativePath(directories, "normalizedThreads", "directory"),
      ),
      validationReport: resolveRelativePath(workspaceRoot, requireRelativePath(files, "validationReport", "file")),
    },
  };
}

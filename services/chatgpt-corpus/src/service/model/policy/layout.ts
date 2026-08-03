type DirectorySpec<DirectoryId extends string> = {
  readonly directoryId: DirectoryId;
  readonly relativePath: string;
};

type FileSpec<FileId extends string> = {
  readonly fileId: FileId;
  readonly relativePath: string;
};

export const SOURCE_MATERIAL_DIRECTORIES = {
  conversations: "source-material/conversations/raw-json",
  documents: "work/docs/source",
} as const;

export const REQUIRED_WORKSPACE_DIRECTORIES = [
  SOURCE_MATERIAL_DIRECTORIES.conversations,
  SOURCE_MATERIAL_DIRECTORIES.documents,
] as const;

export const WORKSPACE_MANAGED_FILE_REFS = [
  {
    fileId: "workspace-readme",
    relativePath: "work/README.md",
  },
  {
    fileId: "workspace-gitignore",
    relativePath: ".gitignore",
  },
] as const satisfies readonly FileSpec<string>[];

export const ARTIFACT_OUTPUT_DIRECTORIES = [
  {
    directoryId: "generatedCorpus",
    relativePath: "work/generated/corpus",
  },
  {
    directoryId: "normalizedThreads",
    relativePath: "work/generated/corpus/normalized-threads",
  },
  {
    directoryId: "reports",
    relativePath: "work/generated/reports",
  },
] as const satisfies readonly DirectorySpec<string>[];

export const STATIC_ARTIFACT_FILE_REFS = [
  {
    fileId: "inventory",
    relativePath: "work/generated/corpus/inventory.json",
  },
  {
    fileId: "familyGraphs",
    relativePath: "work/generated/corpus/family-graphs.json",
  },
  {
    fileId: "intermediateGraph",
    relativePath: "work/generated/corpus/intermediate-graph.json",
  },
  {
    fileId: "manifest",
    relativePath: "work/generated/corpus/corpus-manifest.json",
  },
  {
    fileId: "anomalies",
    relativePath: "work/generated/reports/anomalies.json",
  },
  {
    fileId: "ambiguityFlags",
    relativePath: "work/generated/reports/ambiguity-flags.json",
  },
  {
    fileId: "canonicalitySummary",
    relativePath: "work/generated/reports/canonicality-summary.md",
  },
  {
    fileId: "decisionLog",
    relativePath: "work/generated/reports/decision-log.md",
  },
  {
    fileId: "mentalMap",
    relativePath: "work/generated/reports/mental-map.md",
  },
  {
    fileId: "validationReport",
    relativePath: "work/generated/reports/validation-report.json",
  },
] as const satisfies readonly FileSpec<string>[];

export type WorkspaceManagedFileId = (typeof WORKSPACE_MANAGED_FILE_REFS)[number]["fileId"];
export type ArtifactDirectoryId = (typeof ARTIFACT_OUTPUT_DIRECTORIES)[number]["directoryId"];
export type StaticArtifactFileId = (typeof STATIC_ARTIFACT_FILE_REFS)[number]["fileId"];
export type ArtifactFileId = StaticArtifactFileId | `normalizedThread:${string}`;

export function createNormalizedThreadArtifactRef(threadId: string): FileSpec<ArtifactFileId> {
  return {
    fileId: `normalizedThread:${threadId}`,
    relativePath: `work/generated/corpus/normalized-threads/${threadId}.json`,
  };
}

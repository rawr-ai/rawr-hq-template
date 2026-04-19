import type {
  ArtifactDirectoryId,
  ArtifactFileId,
  StaticArtifactFileId,
  WorkspaceManagedFileId,
} from "../../shared/layout";

export type WorkspaceDirectoryEntry<DirectoryId extends string = string> = {
  directoryId: DirectoryId;
  relativePath: string;
};

export type WorkspaceFileEntry<FileId extends string = string> = {
  fileId: FileId;
  relativePath: string;
};

export type WorkspaceManagedFile<FileId extends string = string> = WorkspaceFileEntry<FileId> & {
  contents: string;
};

export type WorkspaceTemplate = {
  requiredDirectories: string[];
  managedFiles: WorkspaceManagedFile<WorkspaceManagedFileId>[];
  outputDirectories: WorkspaceDirectoryEntry<ArtifactDirectoryId>[];
  outputFiles: WorkspaceFileEntry<StaticArtifactFileId>[];
};

export type WorkspaceScaffoldResult = {
  createdEntries: string[];
  existingEntries: string[];
};

export type WorkspaceTextEntry = {
  relativePath: string;
  contents: string;
};

export type RawSourceMaterials = {
  conversations: WorkspaceTextEntry[];
  documents: WorkspaceTextEntry[];
};

export type WorkspaceSourceDirectories = {
  conversations: string;
  documents: string;
};

export type WorkspaceArtifactFile = WorkspaceManagedFile<ArtifactFileId>;

export type WorkspaceArtifactBundle = {
  outputDirectories: WorkspaceDirectoryEntry<ArtifactDirectoryId>[];
  files: WorkspaceArtifactFile[];
};

export type WorkspaceMaterializeResult = {
  outputDirectories: WorkspaceDirectoryEntry<ArtifactDirectoryId>[];
  writtenEntries: WorkspaceFileEntry<ArtifactFileId>[];
};

export interface WorkspaceStore {
  scaffoldWorkspace(input: {
    workspaceRef: string;
    template: WorkspaceTemplate;
  }): Promise<WorkspaceScaffoldResult>;
  readSourceMaterials(input: {
    workspaceRef: string;
    sourceDirectories: WorkspaceSourceDirectories;
  }): Promise<RawSourceMaterials>;
  writeArtifactBundle(input: {
    workspaceRef: string;
    bundle: WorkspaceArtifactBundle;
  }): Promise<WorkspaceMaterializeResult>;
}

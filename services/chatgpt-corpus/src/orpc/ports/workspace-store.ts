export type WorkspaceManagedFile = {
  fileId: string;
  relativePath: string;
  contents: string;
};

export type WorkspaceTemplate = {
  requiredDirectories: string[];
  managedFiles: WorkspaceManagedFile[];
  outputDirectories: string[];
  outputFiles: string[];
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

export type WorkspaceArtifactFile = {
  fileId: string;
  relativePath: string;
  contents: string;
};

export type WorkspaceArtifactBundle = {
  outputDirectories: string[];
  files: WorkspaceArtifactFile[];
};

export type WorkspaceMaterializeResult = {
  writtenEntries: Array<{
    fileId: string;
    relativePath: string;
  }>;
};

export interface WorkspaceStore {
  scaffoldWorkspace(input: {
    workspaceRef: string;
    template: WorkspaceTemplate;
  }): Promise<WorkspaceScaffoldResult>;
  readSourceMaterials(input: {
    workspaceRef: string;
  }): Promise<RawSourceMaterials>;
  writeArtifactBundle(input: {
    workspaceRef: string;
    bundle: WorkspaceArtifactBundle;
  }): Promise<WorkspaceMaterializeResult>;
}

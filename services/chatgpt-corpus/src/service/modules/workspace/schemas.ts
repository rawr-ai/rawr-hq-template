import { type Static, Type, type TSchema } from "typebox";
import {
  ARTIFACT_OUTPUT_DIRECTORIES,
  WORKSPACE_MANAGED_FILE_REFS,
} from "../../../shared/layout";

function literalUnion(values: readonly string[]): TSchema {
  if (values.length === 1) return Type.Literal(values[0]!);
  return Type.Union(values.map((value) => Type.Literal(value)) as unknown as [TSchema, TSchema, ...TSchema[]]);
}

const WorkspaceManagedFileIdSchema = literalUnion(WORKSPACE_MANAGED_FILE_REFS.map((file) => file.fileId));
const ArtifactDirectoryIdSchema = literalUnion(ARTIFACT_OUTPUT_DIRECTORIES.map((directory) => directory.directoryId));

export const WorkspaceDirectoryEntrySchema = Type.Object(
  {
    directoryId: ArtifactDirectoryIdSchema,
    relativePath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const WorkspaceManagedFileSchema = Type.Object(
  {
    fileId: WorkspaceManagedFileIdSchema,
    relativePath: Type.String({ minLength: 1 }),
    contents: Type.String(),
  },
  { additionalProperties: false },
);

export const WorkspaceManagedFileRefSchema = Type.Object(
  {
    fileId: WorkspaceManagedFileIdSchema,
    relativePath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const WorkspaceTemplateSchema = Type.Object(
  {
    requiredDirectories: Type.Array(Type.String({ minLength: 1 })),
    managedFiles: Type.Array(WorkspaceManagedFileSchema),
    outputDirectories: Type.Array(WorkspaceDirectoryEntrySchema),
    outputFiles: Type.Array(Type.Object(
      {
        fileId: Type.String({ minLength: 1 }),
        relativePath: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    )),
  },
  { additionalProperties: false },
);

export const InitializeWorkspaceOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    createdEntries: Type.Array(Type.String({ minLength: 1 })),
    existingEntries: Type.Array(Type.String({ minLength: 1 })),
    managedFiles: Type.Array(WorkspaceManagedFileRefSchema),
  },
  { additionalProperties: false },
);

export type WorkspaceTemplateValue = Static<typeof WorkspaceTemplateSchema>;
export type InitializeWorkspaceResult = Static<typeof InitializeWorkspaceOutputSchema>;

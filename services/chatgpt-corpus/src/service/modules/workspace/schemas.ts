import { type Static, Type } from "typebox";

export const WorkspaceManagedFileSchema = Type.Object(
  {
    fileId: Type.String({ minLength: 1 }),
    relativePath: Type.String({ minLength: 1 }),
    contents: Type.String(),
  },
  { additionalProperties: false },
);

export const WorkspaceManagedFileRefSchema = Type.Object(
  {
    fileId: Type.String({ minLength: 1 }),
    relativePath: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const WorkspaceTemplateSchema = Type.Object(
  {
    requiredDirectories: Type.Array(Type.String({ minLength: 1 })),
    managedFiles: Type.Array(WorkspaceManagedFileSchema),
    outputDirectories: Type.Array(Type.String({ minLength: 1 })),
    outputFiles: Type.Array(Type.String({ minLength: 1 })),
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

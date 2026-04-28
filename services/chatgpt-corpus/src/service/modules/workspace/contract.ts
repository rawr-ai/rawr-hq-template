import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  WorkspaceManagedFileRefSchema,
  WorkspaceTemplateSchema,
} from "./entities";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });
const InitializeWorkspaceOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    createdEntries: Type.Array(Type.String({ minLength: 1 })),
    existingEntries: Type.Array(Type.String({ minLength: 1 })),
    managedFiles: Type.Array(WorkspaceManagedFileRefSchema),
  },
  { additionalProperties: false },
);

export const contract = {
  describeTemplate: ocBase
    .meta({ idempotent: true })
    .input(schema(EmptyInputSchema))
    .output(schema(WorkspaceTemplateSchema)),
  initialize: ocBase
    .meta({ idempotent: false })
    .input(schema(EmptyInputSchema))
    .output(schema(InitializeWorkspaceOutputSchema)),
};

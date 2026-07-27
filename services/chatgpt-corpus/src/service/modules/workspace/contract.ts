import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { WorkspaceManagedFileRefSchema, WorkspaceTemplateSchema } from "./entities";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });
const InitializeWorkspaceOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({
      minLength: 1,
      description: "Identity of the workspace established from the canonical template.",
    }),
    createdEntries: Type.Array(Type.String({ minLength: 1 }), {
      description: "Managed workspace entries created by this initialization.",
    }),
    existingEntries: Type.Array(Type.String({ minLength: 1 }), {
      description: "Managed workspace entries already present before initialization.",
    }),
    managedFiles: Type.Array(WorkspaceManagedFileRefSchema, {
      description: "Canonical managed files associated with the initialized workspace.",
    }),
  },
  { additionalProperties: false }
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

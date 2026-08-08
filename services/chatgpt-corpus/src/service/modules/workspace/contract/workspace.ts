import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { WorkspaceManagedFileRefSchema, WorkspaceTemplateSchema } from "../model/dto";

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

export const workspace = {
  describeTemplate: oc
    .meta(procedureMetadata({ idempotent: true }))
    .input(standard(EmptyInputSchema))
    .output(standard(WorkspaceTemplateSchema)),
  initialize: oc
    .meta(procedureMetadata({ idempotent: false }))
    .input(standard(EmptyInputSchema))
    .output(standard(InitializeWorkspaceOutputSchema)),
};

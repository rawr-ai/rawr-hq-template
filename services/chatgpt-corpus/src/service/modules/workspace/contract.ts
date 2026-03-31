import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  InitializeWorkspaceOutputSchema,
  WorkspaceTemplateSchema,
} from "./schemas";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });

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

import { Type } from "typebox";
import {
  CoordinationIdInputSchema,
  CoordinationIdSchema,
  CoordinationWorkflowSchema,
  ValidationResultSchema,
} from "../../../domain/schemas";

export const ListWorkflowsInputSchema = Type.Object({}, { additionalProperties: false });
export const ListWorkflowsOutputSchema = Type.Object(
  { workflows: Type.Array(CoordinationWorkflowSchema) },
  { additionalProperties: false },
);

export const SaveWorkflowInputSchema = Type.Object(
  { workflow: CoordinationWorkflowSchema },
  { additionalProperties: false },
);
export const SaveWorkflowOutputSchema = Type.Object(
  { workflow: CoordinationWorkflowSchema },
  { additionalProperties: false },
);

export const GetWorkflowInputSchema = Type.Object(
  { workflowId: CoordinationIdInputSchema },
  { additionalProperties: false },
);
export const GetWorkflowOutputSchema = Type.Object(
  { workflow: CoordinationWorkflowSchema },
  { additionalProperties: false },
);

export const ValidateWorkflowInputSchema = Type.Object(
  { workflowId: CoordinationIdInputSchema },
  { additionalProperties: false },
);
export const ValidateWorkflowOutputSchema = Type.Object(
  {
    workflowId: CoordinationIdSchema,
    validation: ValidationResultSchema,
  },
  { additionalProperties: false },
);

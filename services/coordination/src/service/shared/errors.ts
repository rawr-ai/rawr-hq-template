import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";

const InvalidWorkflowIdDataSchema = Type.Object(
  {
    workflowId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  },
  { additionalProperties: false },
);

const WorkflowNotFoundDataSchema = Type.Object(
  {
    workflowId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const INVALID_WORKFLOW_ID = {
  status: 400,
  message: "Invalid workflowId format",
  data: schema(InvalidWorkflowIdDataSchema),
} as const;

export const WORKFLOW_NOT_FOUND = {
  status: 404,
  message: "workflow not found",
  data: schema(WorkflowNotFoundDataSchema),
} as const;

import { schema } from "@rawr/hq-sdk";
import { ValidationResultSchema } from "../../../schemas";

export const WORKFLOW_VALIDATION_FAILED = {
  status: 400,
  message: "Workflow validation failed",
  data: schema(ValidationResultSchema),
} as const;

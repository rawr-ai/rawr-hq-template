/**
 * @fileoverview Transport-free coordination capability contract.
 */
import { contract as runs } from "./modules/runs/contract";
import { contract as workflows } from "./modules/workflows/contract";

export {
  GetRunStatusInputSchema,
  GetRunStatusOutputSchema,
  GetRunTimelineInputSchema,
  GetRunTimelineOutputSchema,
  GetWorkflowInputSchema,
  GetWorkflowOutputSchema,
  ListWorkflowsInputSchema,
  ListWorkflowsOutputSchema,
  QueueRunInputSchema,
  QueueRunOutputSchema,
  RunStatusSchema,
  SaveWorkflowInputSchema,
  SaveWorkflowOutputSchema,
  ValidateWorkflowInputSchema,
  ValidateWorkflowOutputSchema,
  ValidationResultSchema,
} from "../schemas";

export const contract = {
  ...workflows,
  ...runs,
};

export type Contract = typeof contract;

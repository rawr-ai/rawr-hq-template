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
  QueueRunInputSchema,
  QueueRunOutputSchema,
} from "./modules/runs/schemas";

export {
  GetWorkflowInputSchema,
  GetWorkflowOutputSchema,
  ListWorkflowsInputSchema,
  ListWorkflowsOutputSchema,
  SaveWorkflowInputSchema,
  SaveWorkflowOutputSchema,
  ValidateWorkflowInputSchema,
  ValidateWorkflowOutputSchema,
} from "./modules/workflows/schemas";

export {
  RunStatusSchema,
  ValidationResultSchema,
} from "../domain/schemas";

export const contract = {
  workflows,
  runs,
};

export type Contract = typeof contract;

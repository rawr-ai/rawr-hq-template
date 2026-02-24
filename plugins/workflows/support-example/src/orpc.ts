import { os } from "@orpc/server";
import type { SupportExampleWorkflowContext } from "./context";
import { supportExampleWorkflowErrorMap } from "./errors";

export const workflowProcedure = os.$context<SupportExampleWorkflowContext>().errors(supportExampleWorkflowErrorMap);

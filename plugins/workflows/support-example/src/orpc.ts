import { implement } from "@orpc/server";
import { supportExampleWorkflowContract } from "./contract";
import type { SupportExampleWorkflowContext } from "./context";

export const os = implement<typeof supportExampleWorkflowContract, SupportExampleWorkflowContext>(supportExampleWorkflowContract);


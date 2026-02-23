import { implement } from "@orpc/server";
import { supportTriageWorkflowContract } from "./contract";
import type { SupportTriageWorkflowContext } from "./context";

export const os = implement<typeof supportTriageWorkflowContract, SupportTriageWorkflowContext>(supportTriageWorkflowContract);


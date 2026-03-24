import type { RequestBoundaryContext } from "@rawr/runtime-context";
import type { CoordinationRuntimeAdapter } from "./inngest";

export type CoordinationWorkflowContext = RequestBoundaryContext<CoordinationRuntimeAdapter>;

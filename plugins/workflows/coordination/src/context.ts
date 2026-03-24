import type { Logger } from "@rawr/hq-sdk";
import type { RequestBoundaryContext } from "@rawr/runtime-context";
import type { CoordinationRuntimeAdapter } from "./inngest";

export type CoordinationWorkflowContext = RequestBoundaryContext<CoordinationRuntimeAdapter> & {
  hostLogger?: Logger;
};

import type { Client as CoordinationClient } from "@rawr/coordination";
import type { RequestBoundaryContext } from "@rawr/runtime-context";
import type { CoordinationRuntimeAdapter } from "./inngest";

export type CoordinationWorkflowContext = RequestBoundaryContext<CoordinationRuntimeAdapter>;
export type CoordinationWorkflowAuthoringClient = CoordinationClient["workflows"];
export type CoordinationWorkflowAuthoringClientResolver = (repoRoot: string) => CoordinationWorkflowAuthoringClient;

import type { Client as CoordinationClient } from "@rawr/coordination";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import type { CoordinationRuntimeAdapter } from "./inngest";

export type CoordinationWorkflowContext = BoundaryRequestSupportContext<CoordinationRuntimeAdapter>;
export type CoordinationWorkflowAuthoringClient = CoordinationClient["workflows"];
export type CoordinationWorkflowAuthoringClientResolver = (repoRoot: string) => CoordinationWorkflowAuthoringClient;

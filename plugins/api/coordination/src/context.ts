import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import type { Client as CoordinationClient } from "@rawr/coordination";

export type CoordinationApiContext = BoundaryRequestSupportContext;

export type CoordinationWorkflowClient = CoordinationClient["workflows"];

export type CoordinationWorkflowClientResolver = (repoRoot: string) => CoordinationWorkflowClient;

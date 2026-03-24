/**
 * @fileoverview Single service definition seam for the coordination package.
 *
 * @remarks
 * Author the coordination capability once in this file:
 * - service-owned dependency ports
 * - stable scope/config lanes
 * - static policy vocabulary and metadata defaults
 * - bound service authoring surfaces used across `service/*`
 */
import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type {
  CoordinationWorkflowV1,
  DeskRunEventV1,
  JsonValue,
  RunStatusV1,
  RunTraceLinkV1,
} from "../types";
import type { CreateDeskEventDraft } from "../events";

export type QueueCoordinationRunRequest = Readonly<{
  workflow: CoordinationWorkflowV1;
  runId: string;
  input: JsonValue;
}>;

export type QueueCoordinationRunResult = Readonly<{
  run: RunStatusV1;
  eventIds: string[];
}>;

export type CoordinationQueueRun = (input: QueueCoordinationRunRequest) => Promise<QueueCoordinationRunResult>;

export type CoordinationTraceLinkFactory = (input: {
  runId: string;
  inngestRunId?: string;
  inngestEventId?: string;
}) => RunTraceLinkV1[];

export type CoordinationDeskEventFactory = (input: CreateDeskEventDraft) => DeskRunEventV1;

type InitialContext = {
  deps: {
    queueRun: CoordinationQueueRun;
    createTraceLinks: CoordinationTraceLinkFactory;
    createEvent: CoordinationDeskEventFactory;
  };
  scope: {
    repoRoot: string;
  };
  config: {};
};

type InvocationContext = {};

type ProcedureMetadata = {
  entity?: "workflow" | "run";
};

export const policy = {
  events: {},
} as const;

const service = defineService<{
  initialContext: InitialContext;
  invocationContext: InvocationContext;
  metadata: ProcedureMetadata;
}>({
  metadataDefaults: {
    idempotent: true,
    domain: "coordination",
    audience: "internal",
    entity: "workflow",
  },
  baseline: {
    policy,
  },
});

export type Service = ServiceOf<typeof service>;

export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;
export const createRequiredServiceObservabilityMiddleware = service.createRequiredObservabilityMiddleware;
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;
export const createServiceProvider = service.createProvider;
export const createServiceImplementer = service.createImplementer;

import {
  type DomainBoundary,
  type InferConfig,
  type InferDeps,
  type InferScope,
} from "@rawr/hq-sdk/boundary";
import { createClient as createCoordinationClient, type Client as CoordinationClient } from "../client";
import { router } from "./router";

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
export type CreateAuthoringClientOptions = DomainBoundary<typeof router>;

const unsupportedQueueRun = async () => {
  throw new Error("coordination authoring client does not expose run-dispatch procedures");
};

const unsupportedCreateEvent = () => {
  throw new Error("coordination authoring client does not expose run-dispatch procedures");
};

function createAuthoringBoundary(boundary: CreateAuthoringClientOptions) {
  return {
    deps: {
      ...boundary.deps,
      queueRun: unsupportedQueueRun,
      createTraceLinks: () => [],
      createEvent: unsupportedCreateEvent,
    },
    scope: boundary.scope,
    config: boundary.config,
  } satisfies Parameters<typeof createCoordinationClient>[0];
}

type AuthoringProcedureName = keyof typeof router;
export type AuthoringClient = Pick<CoordinationClient, AuthoringProcedureName>;

/**
 * Create a narrow in-process client for workflow authoring over the canonical
 * coordination workflow contract. Delegate to the canonical service client so
 * authoring procedures keep the same required observability and analytics
 * middleware as the full coordination surface.
 */
export function createAuthoringClient(boundary: CreateAuthoringClientOptions) {
  const client = createCoordinationClient(createAuthoringBoundary(boundary));
  return {
    listWorkflows: client.listWorkflows,
    saveWorkflow: client.saveWorkflow,
    getWorkflow: client.getWorkflow,
    validateWorkflow: client.validateWorkflow,
  } satisfies AuthoringClient;
}

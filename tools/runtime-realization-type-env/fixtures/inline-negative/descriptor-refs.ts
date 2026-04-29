import type { ExecutionDescriptorRef } from "@rawr/sdk/spine";

export const MissingStepId = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.async-step",
  executionId: "bad:missing-step",
  appId: "hq",
  role: "async",
  surface: "workflow",
  capability: "work-items",
  workflowId: "work-items.sync",
  // @ts-expect-error async step refs require stepId.
} as const satisfies ExecutionDescriptorRef;

export const MultipleAsyncOwners = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.async-step",
  executionId: "bad:multiple-owners",
  appId: "hq",
  role: "async",
  surface: "workflow",
  capability: "work-items",
  workflowId: "work-items.sync",
  // @ts-expect-error async step refs require exactly one async owner identity.
  scheduleId: "work-items.hourly",
  stepId: "sync-work-item",
} as const satisfies ExecutionDescriptorRef;

export const WrongBoundaryFields = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.server-api",
  executionId: "bad:wrong-field",
  appId: "hq",
  role: "server",
  surface: "api",
  capability: "work-items",
  // @ts-expect-error server API refs require routePath, not procedurePath.
  procedurePath: ["items", "create"],
} as const satisfies ExecutionDescriptorRef;

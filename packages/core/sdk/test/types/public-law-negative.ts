import { Effect } from "@rawr/sdk/effect";
import type { ExecutionDescriptorRef } from "@rawr/sdk/execution";

// @ts-expect-error public Effect facade must not export raw ManagedRuntime.
import type { ManagedRuntime } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Layer.
import type { Layer } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Queue.
import type { Queue } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw PubSub.
import type { PubSub } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Stream.
import type { Stream } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Schedule.
import type { Schedule } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Context.
import type { Context } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not expose raw runtime execution.
Effect.runPromise;

// @ts-expect-error public Effect facade must use exported root pipe, not Effect.pipe.
Effect.pipe;

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

export const MissingAsyncOwner = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.async-step",
  executionId: "bad:missing-owner",
  appId: "hq",
  role: "async",
  surface: "workflow",
  capability: "work-items",
  stepId: "sync-work-item",
  // @ts-expect-error async step refs require exactly one async owner identity.
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

void (undefined as unknown as ManagedRuntime);
void (undefined as unknown as Layer);
void (undefined as unknown as Queue);
void (undefined as unknown as PubSub);
void (undefined as unknown as Stream);
void (undefined as unknown as Schedule);
void (undefined as unknown as Context);

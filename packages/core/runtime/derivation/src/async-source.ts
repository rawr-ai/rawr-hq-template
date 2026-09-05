import type { AsyncStepMembership } from "../../definition/src/async-context";
import type {
  AsyncConsumerDefinition,
  AsyncScheduleDefinition,
  AsyncWorkflowDefinition,
} from "../../definition/src/async-plugin";
import type { ExecutionDescriptorRef } from "./execution-descriptor-ref";

export type RuntimeAsyncDescriptorReference = readonly [
  AsyncStepMembership[number],
  Extract<ExecutionDescriptorRef, { readonly boundary: "plugin.async-step" }>,
];

interface RuntimeAsyncDescriptorReferences {
  readonly descriptorReferences: readonly RuntimeAsyncDescriptorReference[];
}

export type RuntimeAsyncWorkflowSource = Pick<
  AsyncWorkflowDefinition,
  "kind" | "id" | "eventName" | "inputSchema" | "run" | "options"
> &
  RuntimeAsyncDescriptorReferences;

export type RuntimeAsyncScheduleSource = Pick<
  AsyncScheduleDefinition,
  "kind" | "id" | "cron" | "run" | "options"
> &
  RuntimeAsyncDescriptorReferences;

export type RuntimeAsyncConsumerSource = Pick<
  AsyncConsumerDefinition,
  "kind" | "id" | "eventName" | "eventSchema" | "run" | "options"
> &
  RuntimeAsyncDescriptorReferences;

export type RuntimeAsyncDeclarationSource =
  | RuntimeAsyncWorkflowSource
  | RuntimeAsyncScheduleSource
  | RuntimeAsyncConsumerSource;

/** Exact native orchestration and authored step capabilities beside one selected surface. */
export type RuntimeAsyncSource =
  | {
      readonly kind: "async/workflow";
      readonly declarations: readonly RuntimeAsyncWorkflowSource[];
    }
  | {
      readonly kind: "async/schedule";
      readonly declarations: readonly RuntimeAsyncScheduleSource[];
    }
  | {
      readonly kind: "async/consumer";
      readonly declarations: readonly RuntimeAsyncConsumerSource[];
    };

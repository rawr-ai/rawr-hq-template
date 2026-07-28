import { createObservabilityMiddleware } from "@rawr/hq-sdk";
import type { Context } from "../base";
import { metadataDefaults } from "../model/policy/procedure-metadata";

/** Adds lifecycle invocation fields to the native observability boundary. */
export const observability = createObservabilityMiddleware<Context>(metadataDefaults, {
  spanAttributes: ({ context }) => ({
    invocation_trace_id: context.invocation.traceId,
    invocation_command_id: context.invocation.commandId,
  }),
  logFields: ({ context, spanTraceId }) => ({
    spanTraceId,
    invocationTraceId: context.invocation.traceId,
    invocationCommandId: context.invocation.commandId,
  }),
  startEventAttributes: ({ context }) => ({
    traceId: context.invocation.traceId,
    commandId: context.invocation.commandId,
  }),
  successEventAttributes: () => ({}),
});

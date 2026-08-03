import { createObservabilityMiddlewareCallback } from "@habitat-ai/rawr-hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../model/policy";

const policyEvents = {
  readOnlyRejected: "todo.policy.read_only_rejected",
  assignmentLimitReached: "todo.policy.assignment_limit_reached",
} as const;

/** Owns the single Todo procedure observability lifecycle. */
export const middleware = base.middleware(
  createObservabilityMiddlewareCallback(metadataDefaults, {
    policyEvents,
    spanAttributes: ({ context }) => ({
      workspace_id: context.scope.workspaceId,
      read_only: context.config.readOnly,
      invocation_trace_id: context.invocation.traceId,
    }),
    logFields: ({ context, spanTraceId }) => ({
      spanTraceId,
      invocationTraceId: context.invocation.traceId,
      workspaceId: context.scope.workspaceId,
      readOnly: context.config.readOnly,
    }),
    startEventAttributes: ({ context }) => ({
      workspaceId: context.scope.workspaceId,
      traceId: context.invocation.traceId,
    }),
    successEventAttributes: ({ context }) => ({
      workspaceId: context.scope.workspaceId,
    }),
    onError: ({ span, context, pathLabel, error, policyEvents: events }) => {
      if (error.code === "READ_ONLY_MODE") {
        span?.addEvent(events?.readOnlyRejected ?? policyEvents.readOnlyRejected, {
          path: pathLabel,
          workspaceId: context.scope.workspaceId,
        });
      }
      if (error.code === "ASSIGNMENT_LIMIT_REACHED") {
        span?.addEvent(events?.assignmentLimitReached ?? policyEvents.assignmentLimitReached, {
          path: pathLabel,
          workspaceId: context.scope.workspaceId,
        });
      }
    },
  })
);

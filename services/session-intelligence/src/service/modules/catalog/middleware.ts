import { createServiceAnalyticsMiddleware, createServiceObservabilityMiddleware, createServiceProvider } from "../../base";
import type { SessionIndexRuntime } from "../../shared/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import { createRepository } from "./repository";

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    invocation_trace_id: context.invocation.traceId,
  }),
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
  }),
});

export const repository = createServiceProvider<{
  deps: {
    sessionSourceRuntime: SessionSourceRuntime;
    sessionIndexRuntime: SessionIndexRuntime;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository(context.deps.sessionSourceRuntime, context.deps.sessionIndexRuntime),
  });
});

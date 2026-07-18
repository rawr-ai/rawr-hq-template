import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
} from "../../base";

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    controller_identity: context.scope.controllerIdentity,
    invocation_trace_id: context.invocation.traceId,
  }),
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_controller_identity: context.scope.controllerIdentity,
  }),
});

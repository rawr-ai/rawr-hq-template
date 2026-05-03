import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
} from "../../base";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

export const observability = createServiceObservabilityMiddleware({});
export const analytics = createServiceAnalyticsMiddleware({});

import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import { createRepository } from "./repository";

export {
  createServiceAnalyticsMiddleware as createProcedureAnalytics,
  createServiceObservabilityMiddleware as createProcedureObservability,
} from "../../base";

export const observability = createServiceObservabilityMiddleware({});
export const analytics = createServiceAnalyticsMiddleware({});

export const repository = createServiceProvider().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ next }) => {
  return next({
    repo: createRepository(),
  });
});

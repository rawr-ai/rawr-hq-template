/**
 * @fileoverview Central oRPC implementer for the coordination package.
 */
import {
  createRequiredServiceAnalyticsMiddleware,
  createRequiredServiceObservabilityMiddleware,
  createServiceImplementer,
} from "./base";
import { contract } from "./contract";

export const impl = createServiceImplementer(contract, {
  observability: createRequiredServiceObservabilityMiddleware({}),
  analytics: createRequiredServiceAnalyticsMiddleware({}),
});

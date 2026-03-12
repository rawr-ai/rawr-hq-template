/**
 * @fileoverview oRPC SDK seam for this domain package.
 *
 * @remarks
 * This is the package-local authoring seam.
 * Service and module code should prefer this file over reaching into
 * `src/orpc/*` directly. Lower-level construction primitives stay internal.
 */
export type {
  BaseDeps,
  BaseMetadata,
  ServiceDepsOf,
  ServiceMetadataOf,
} from "./orpc/baseline/types";
export type {
  ServiceDeclaration,
  ServiceTypesOf,
} from "./orpc/service/types";
export type {
  BasePolicyProfile,
  ObservabilityErrorDetails,
  RequiredServiceAnalyticsMiddleware,
  RequiredServiceAnalyticsMiddlewareInput,
  RequiredServiceObservabilityMiddleware,
  RequiredServiceObservabilityMiddlewareInput,
  ServiceAnalyticsMiddlewareInput,
  ServiceObservabilityMiddlewareInput,
} from "./orpc/middleware";
export type { DbPool, Sql } from "./orpc/ports/db";
export type { AnalyticsClient } from "./orpc/ports/analytics";
export type { FeedbackClient } from "./orpc/ports/feedback";
export type { Logger } from "./orpc/ports/logger";
export {
  defineService,
} from "./orpc/service/define";
export type { ServiceOf } from "./orpc/service/define";
export { schema, typeBoxStandardSchema } from "./orpc/schema";
export {
  sqlProvider,
  feedbackProvider,
} from "./orpc/middleware";

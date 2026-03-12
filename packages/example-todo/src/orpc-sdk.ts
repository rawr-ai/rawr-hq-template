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
  ServiceDeclaration,
  ServiceDepsOf,
  ServiceMetadataOf,
  ServiceTypesOf,
} from "./orpc/base";
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
export type { FeedbackClient } from "./orpc/ports/feedback";
export {
  defineService,
} from "./orpc/factory/service";
export type { ServiceOf } from "./orpc/factory/service";
export { schema, typeBoxStandardSchema } from "./orpc/schema";
export {
  sqlProvider,
  feedbackProvider,
} from "./orpc/middleware";

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
  InitialContext,
  ServiceDepsOf,
  ServiceMetadataOf,
  ServiceContextOf,
} from "./orpc/base";
export type {
  BasePolicyProfile,
  ObservabilityErrorDetails,
  ServiceAnalyticsMiddlewareInput,
  ServiceAnalyticsProfile,
  ServiceObservabilityMiddlewareInput,
  ServiceObservabilityProfile,
} from "./orpc/middleware";
export type { DbPool, Sql } from "./orpc/adapters/sql";
export type { FeedbackClient } from "./orpc/adapters/feedback";
export {
  createServiceKit,
  defineService,
} from "./orpc/factory/service";
export type {
  AnyServiceKit,
  ServiceKit,
  ServiceKitConfig,
  ServiceKitContext,
  ServiceKitDeps,
  ServiceKitInvocation,
  ServiceKitMetadata,
  ServiceKitScope,
} from "./orpc/factory/service";
export { schema, typeBoxStandardSchema } from "./orpc/schema";
export {
  sqlProvider,
  feedbackProvider,
} from "./orpc/middleware";

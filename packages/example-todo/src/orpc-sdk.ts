/**
 * @fileoverview oRPC SDK seam for this domain package.
 *
 * @remarks
 * Today this re-exports the local proto-SDK implementation in `./orpc/*`.
 * Later, this file becomes the single swap point to import the shared SDK
 * instead (without rewriting domain/module code).
 */
export type {
  BaseDeps,
  Logger,
  BaseMetadata,
  BaseContext,
  InitialContext,
} from "./orpc/base";
export type { DbPool, Sql } from "./orpc/adapters/sql";
export type { FeedbackClient } from "./orpc/adapters/feedback";
export {
  createContractBuilder,
  createImplementer,
  createMiddlewareBuilder,
} from "./orpc/factory";
export type { DomainPackage, InferDeps } from "./orpc/domain-package";
export { defineDomainPackage } from "./orpc/domain-package";
export { createDomainModule, type DomainContext } from "./orpc/module";
export { schema, typeBoxStandardSchema } from "./orpc/schema";
export {
  createTelemetryMiddleware,
  createAnalyticsMiddleware,
  sqlProvider,
  feedbackProvider,
} from "./orpc/middleware";

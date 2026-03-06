/**
 * @fileoverview oRPC SDK seam for this domain package.
 *
 * @remarks
 * This is the intended package-local SDK surface for service/module authoring.
 * Later, it becomes the single swap point to import the shared SDK instead
 * (without rewriting domain/module code).
 *
 * Keep this surface intentionally narrow:
 * - export types and helpers that service/module authors should actually use
 * - keep lower-level construction primitives internal to `src/orpc/*` unless
 *   they are part of the intended authoring model
 */
export type {
  BaseDeps,
  BaseMetadata,
  InitialContext,
} from "./orpc/base";
export type { DbPool, Sql } from "./orpc/adapters/sql";
export type { FeedbackClient } from "./orpc/adapters/feedback";
export {
  createContractBuilder,
  createImplementer,
} from "./orpc/factory";
export { schema, typeBoxStandardSchema } from "./orpc/schema";
export {
  createTelemetryMiddleware,
  createAnalyticsMiddleware,
  sqlProvider,
  feedbackProvider,
} from "./orpc/middleware";

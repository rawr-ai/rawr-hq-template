/**
 * @fileoverview Task module middleware exports.
 *
 * @remarks
 * Keep standalone module middleware here so `module.ts` and `router.ts` can
 * import generic names:
 * - `observability`
 * - `analytics`
 * - `repository`
 *
 * This module currently has no standalone additive observability or analytics
 * behavior, so those exports are intentional no-op additive middleware
 * placeholders. `example-todo` keeps them anyway so every module exposes the
 * same generic middleware surface through `middleware.ts`.
 */
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { Sql } from "../../../orpc-sdk";
import { createRepository } from "./repository";

/** Intentional scaffold placeholder for the module's generic observability export. */
export const observability = createServiceObservabilityMiddleware({});

/** Intentional scaffold placeholder for the module's generic analytics export. */
export const analytics = createServiceAnalyticsMiddleware({});

/** Standalone repository provider attached at module scope in `module.ts`. */
export const repository = createServiceProvider<{
  scope: {
    workspaceId: string;
  };
  provided: {
    sql: Sql;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository(context.provided.sql, context.scope.workspaceId),
  });
});

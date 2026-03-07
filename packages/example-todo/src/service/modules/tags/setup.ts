/**
 * @fileoverview Tag module runtime setup.
 *
 * @remarks
 * This file owns module setup only:
 * - start from the package-level implementer base
 * - inject tag module dependencies/context
 * - export configured `os` for handler implementations
 */
import { impl } from "../../impl";
import { createServiceProvider } from "../../base";
import type { Sql } from "../../../orpc-sdk";
import { createRepository } from "./repository";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
const tagRepositoryProvider = createServiceProvider<{
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

export const os = impl.tags.use(tagRepositoryProvider);

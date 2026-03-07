/**
 * @fileoverview Assignments module runtime setup.
 *
 * @remarks
 * This file owns module setup only:
 * - start from the package-level implementer base
 * - inject assignment + dependent module repositories
 * - export configured `os` for handler implementations
 */
import { impl } from "../../impl";
import { createServiceProvider } from "../../base";
import type { Sql } from "../../../orpc-sdk";
import { createRepository as createTagRepository } from "../tags/repository";
import { createRepository as createTaskRepository } from "../tasks/repository";
import { createRepository as createAssignmentRepository } from "./repository";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
const assignmentRepositoriesProvider = createServiceProvider<{
  scope: {
    workspaceId: string;
  };
  provided: {
    sql: Sql;
  };
}>().middleware<{
  repo: ReturnType<typeof createAssignmentRepository>;
  tasks: ReturnType<typeof createTaskRepository>;
  tags: ReturnType<typeof createTagRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createAssignmentRepository(context.provided.sql, context.scope.workspaceId),
    tasks: createTaskRepository(context.provided.sql, context.scope.workspaceId),
    tags: createTagRepository(context.provided.sql, context.scope.workspaceId),
  });
});

export const os = impl.assignments.use(assignmentRepositoriesProvider);

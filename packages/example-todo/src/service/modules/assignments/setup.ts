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
import { createRepository as createTagRepository } from "../tags/repository";
import { createRepository as createTaskRepository } from "../tasks/repository";
import { createRepository as createAssignmentRepository } from "./repository";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
export const os = impl.assignments
  .use(({ context, next }) =>
    next({
      context: {
        repo: createAssignmentRepository(context.sql, context.scope.workspaceId),
        tasks: createTaskRepository(context.sql, context.scope.workspaceId),
        tags: createTagRepository(context.sql, context.scope.workspaceId),
      },
    }),
  );

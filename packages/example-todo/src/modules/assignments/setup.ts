/**
 * @fileoverview Assignments module runtime setup.
 *
 * @remarks
 * This file owns module setup only:
 * - start from the package-level implementer base
 * - inject assignment + dependent module repositories
 * - export configured `os` for handler implementations
 */
import { implementModuleRouter } from "../../orpc/base";
import { createRepository as createTagRepository } from "../tags/repository";
import { createRepository as createTaskRepository } from "../tasks/repository";
import { contract } from "./contract";
import { createRepository as createAssignmentRepository } from "./repository";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
export const os = implementModuleRouter(contract)
  .use(({ context, next }) =>
    next({
      context: {
        repo: createAssignmentRepository(context.deps.sql),
        tasks: createTaskRepository(context.deps.sql),
        tags: createTagRepository(context.deps.sql),
      },
    }),
  );

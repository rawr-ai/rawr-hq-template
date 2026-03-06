/**
 * @fileoverview Task module runtime setup.
 *
 * @remarks
 * This file owns module setup only:
 * - start from the package-level implementer base
 * - inject task module dependencies/context
 * - export configured `os` for handler implementations
 */
import { impl } from "../../impl";
import { createRepository } from "./repository";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
export const os = impl.tasks
  .use(({ context, next }) =>
    next({
      context: {
        repo: createRepository(context.sql),
      },
    }),
  );

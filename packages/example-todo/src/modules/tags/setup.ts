/**
 * @fileoverview Tag module runtime setup.
 *
 * @remarks
 * This file owns module setup only:
 * - start from the package-level implementer base
 * - inject tag module dependencies/context
 * - export configured `os` for handler implementations
 */
import { implementModuleRouter } from "../../orpc/base";
import { contract } from "./contract";
import { createRepository } from "./repository";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
export const os = implementModuleRouter(contract)
  .use(({ context, next }) =>
    next({
      context: {
        repo: createRepository(context.deps.sql),
      },
    }),
  );

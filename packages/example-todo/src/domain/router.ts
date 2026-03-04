/**
 * @fileoverview Domain module composition for the todo package.
 *
 * @remarks
 * This file is the shipping router for the package. It composes domain modules
 * inline, applies domain-wide middleware in-order, and performs a single final
 * `.router(...)` attach.
 */
import { router as assignments } from "./modules/assignments/router";
import { router as tags } from "./modules/tags/router";
import { router as tasks } from "./modules/tasks/router";
import { withReadOnlyMode } from "./middleware/with-read-only-mode";
import { os } from "./setup";

export const router = os
  .use(withReadOnlyMode)
  .router({
    tasks,
    tags,
    assignments,
  });

export type Router = typeof router;

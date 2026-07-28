/**
 * @fileoverview Service router composition for the todo package.
 *
 * @remarks
 * This file completes the service contract from already-authored module routers.
 *
 * Service-wide middleware is authored and attached in `src/service/impl.ts`.
 */

import { impl } from "./impl";
import { router as assignments } from "./modules/assignments/router";
import { router as tags } from "./modules/tags/router";
import { router as tasks } from "./modules/tasks/router";

/**
 * Completes the contract-first service router from the three authored module routers.
 *
 * @remarks
 * The unconfigured native implementer retains the root contract relation without
 * reapplying service middleware already inherited by each module branch.
 */
export const router = impl.router({
  tasks,
  tags,
  assignments,
});

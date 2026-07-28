/**
 * @fileoverview Service router composition for the todo package.
 *
 * @remarks
 * This file completes the service contract from already-authored module routers.
 *
 * Service-wide middleware is authored and attached in `src/service/impl.ts`.
 */

import { service } from "./impl";
import { router as assignments } from "./modules/assignments/router";
import { router as tags } from "./modules/tags/router";
import { router as tasks } from "./modules/tasks/router";

/**
 * Completes the contract-first service router from the three authored module routers.
 *
 * @remarks
 * The native implementer attaches the root contract relation used by oRPC's
 * runtime tooling. Module routers are already-completed plain objects; this
 * file contributes no handler behavior or middleware.
 */
export const router = service.router({
  tasks,
  tags,
  assignments,
});

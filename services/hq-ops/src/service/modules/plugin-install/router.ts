/**
 * hq-ops: plugin-install module.
 *
 * This router owns installation intent and drift assessment for plugin command
 * surfaces (e.g., expected links/targets). It intentionally separates:
 * - observation of local manager state (CLI/projection responsibility)
 * - from definition of "healthy" install state (service responsibility).
 */
import { module } from "./module";
import { assessInstallState } from "./procedures/assess-install-state";
import { planInstallRepair } from "./procedures/plan-install-repair";

/**
 * Router export for command-plugin install health and repair planning.
 */
export const router = module.router({
  assessInstallState,
  planInstallRepair,
});

/**
 * hq-ops: plugin-lifecycle module.
 *
 * This router owns plugin lifecycle checks (and their judgement semantics) for
 * workspace plugins. The module exists so lifecycle policy is service-owned and
 * consistent across projections, while host adapters are still injected via
 * ports (`HqOpsResources`).
 */
import { module } from "./module";
import { checkScratchPolicy } from "./procedures/check-scratch-policy";
import { decideMergePolicy } from "./procedures/decide-merge-policy";
import { evaluateLifecycleCompleteness } from "./procedures/evaluate-lifecycle-completeness";
import { planSweepCandidates } from "./procedures/plan-sweep-candidates";
import { resolveLifecycleTarget } from "./procedures/resolve-lifecycle-target";

/**
 * Router export for plugin lifecycle checks, sweep planning, and merge policy.
 */
export const router = module.router({
  resolveLifecycleTarget,
  evaluateLifecycleCompleteness,
  checkScratchPolicy,
  planSweepCandidates,
  decideMergePolicy,
});

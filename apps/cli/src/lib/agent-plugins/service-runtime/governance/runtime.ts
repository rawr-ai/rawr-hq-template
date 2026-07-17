import type { GovernanceLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/ports/governance";

/** Binds read-only repository and hosted evidence adapters to governance. */
export function createGovernanceLifecycleRuntime(
  runtime: GovernanceLifecycleRuntime,
): GovernanceLifecycleRuntime {
  return Object.freeze({ ...runtime });
}

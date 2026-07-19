import type { GovernanceLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/ports/governance";

/** Binds the read-only content Git adapter to governance. */
export function createGovernanceLifecycleRuntime(
  runtime: GovernanceLifecycleRuntime,
): GovernanceLifecycleRuntime {
  return Object.freeze({ ...runtime });
}

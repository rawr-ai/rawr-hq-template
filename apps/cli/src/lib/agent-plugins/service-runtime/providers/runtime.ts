import type { ProviderLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/ports/providers";

/** Binds concrete controller adapters to the provider module's closed port set. */
export function createProviderLifecycleRuntime(
  runtime: ProviderLifecycleRuntime,
): ProviderLifecycleRuntime {
  return Object.freeze({ ...runtime });
}

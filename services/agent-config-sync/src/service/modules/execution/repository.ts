import type { ExecutionRuntime, SyncExecutionInput } from "../../shared/ports/execution-runtime";

export function createRepository(runtime: ExecutionRuntime | undefined) {
  return {
    async runSync(input: SyncExecutionInput) {
      if (!runtime) {
        throw new Error("agent-config-sync execution runtime is not configured");
      }
      return runtime.runSync(input);
    },
  };
}

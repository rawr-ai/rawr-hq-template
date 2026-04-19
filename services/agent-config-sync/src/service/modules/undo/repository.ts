import type { UndoRunResult, UndoRuntime } from "../../shared/ports/undo-runtime";

export function createRepository(runtime: UndoRuntime | undefined) {
  return {
    async runUndo(input: { workspaceRoot: string; dryRun: boolean }): Promise<UndoRunResult> {
      if (!runtime) {
        return {
          ok: false,
          code: "UNDO_PROVIDER_UNSUPPORTED",
          message: "agent-config-sync undo runtime is not configured",
        };
      }
      return runtime.runUndo(input);
    },
  };
}

import type { RetainedResidue, RetireAction, RetiredPluginRef } from "../entities";
import { applyCleanupBehindCodex } from "../repositories/codex-cleanup-behind-repository";
import { module } from "../module";

export const cleanupBehindProviderSync = module.cleanupBehindProviderSync.handler(async ({ context, input }) => {
  const resources = context.resources;
  const undoCapture = input.dryRun ? undefined : context.undoCapture;
  const actions: RetireAction[] = [];
  const cleanedPlugins: RetiredPluginRef[] = [];
  const retainedResidue: RetainedResidue[] = [];
  let ok = true;

  for (const candidate of input.candidates) {
    if (candidate.provider === "codex" && candidate.reason === "codex_native_superseded_projection") {
      try {
        const result = await applyCleanupBehindCodex({
          dryRun: input.dryRun,
          candidate,
          claimCheckCodexHomes: input.claimCheckCodexHomes,
          resources,
          undoCapture,
        });
        if (!result.ok) ok = false;
        actions.push(...result.actions);
        cleanedPlugins.push(...result.cleanedPlugins);
        retainedResidue.push(...result.retainedResidue);
      } catch (err) {
        ok = false;
        actions.push({
          agent: candidate.provider,
          home: candidate.home,
          plugin: candidate.plugin,
          target: candidate.home,
          action: "failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    actions.push({
      agent: candidate.provider,
      home: candidate.home,
      plugin: candidate.plugin,
      target: candidate.home,
      action: "skipped",
      message: `cleanup-behind policy not implemented: ${candidate.reason}`,
    });
  }

  return { ok, cleanedPlugins, retainedResidue, actions };
});

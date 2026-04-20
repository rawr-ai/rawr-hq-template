/**
 * agent-config-sync: execution module.
 *
 * This router owns the "do the sync" capability: given normalized source-content
 * (canonical + provider overlay policy) and destination homes (Codex/Claude),
 * it applies the service's conflict/GC policy and performs the filesystem writes
 * through the service ports (`context.resources` + `context.undoCapture`).
 *
 * Boundary notes:
 * - Path/FS are injected ports; this module must not import host adapters.
 * - Content layout/merge policy lives in `shared/source-content`, not in the CLI.
 * - Registry/manifest writes are treated as part of the capability, not as
 *   incidental "metadata" helpers.
 */
import { module } from "./module";
import { resolveProviderContent as resolveServiceProviderContent } from "../../shared/source-content/helpers/provider-content";
import { summarizeScannedContent } from "../../shared/helpers/sync-results";
import type { SyncTargetResult } from "../../shared/entities/sync-results";
import { syncClaudeHomes } from "./helpers/sync-claude-homes";
import { syncCodexHomes } from "./helpers/sync-codex-homes";

/**
 * Execution procedure for running provider-specific effective content through
 * each selected destination home.
 */
const runSync = module.runSync.handler(async ({ context, input }) => {
  const targets: SyncTargetResult[] = [];
  const options = {
    dryRun: input.dryRun,
    force: input.force,
    gc: input.gc,
    includeAgentsInCodex: input.includeAgentsInCodex,
    includeAgentsInClaude: input.includeAgentsInClaude,
    undoCapture: input.dryRun ? undefined : context.undoCapture,
    resources: context.resources,
  };

  if (input.includeCodex) {
    const codexContent = await resolveServiceProviderContent({
      agent: "codex",
      sourcePlugin: input.sourcePlugin,
      base: input.content,
      resources: context.resources,
    });

    targets.push(...await syncCodexHomes({
      sourcePlugin: input.sourcePlugin,
      content: codexContent,
      codexHomes: input.codexHomes,
      options,
    }));
  }

  if (input.includeClaude) {
    const claudeContent = await resolveServiceProviderContent({
      agent: "claude",
      sourcePlugin: input.sourcePlugin,
      base: input.content,
      resources: context.resources,
    });

    targets.push(...await syncClaudeHomes({
      sourcePlugin: input.sourcePlugin,
      content: claudeContent,
      claudeHomes: input.claudeHomes,
      options,
    }));
  }

  return {
    ok: targets.every((target) => target.conflicts.length === 0),
    sourcePlugin: input.sourcePlugin,
    scanned: summarizeScannedContent(input.content),
    targets,
  };
});

/**
 * Read-only execution procedure that exposes source-content overlay policy
 * without granting the caller direct access to service internals.
 */
const resolveProviderContent = module.resolveProviderContent.handler(async ({ context, input }) => {
  return resolveServiceProviderContent({
    agent: input.agent,
    sourcePlugin: input.sourcePlugin,
    base: input.base,
    resources: context.resources,
  });
});

/**
 * Router export for agent destination sync execution.
 */
export const router = module.router({
  runSync,
  resolveProviderContent,
});

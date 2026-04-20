import { module } from "./module";
import { resolveProviderContent as resolveServiceProviderContent } from "../source-content/helpers/provider-content";
import { syncClaudeTarget } from "./helpers/claude-target";
import { syncCodexTarget } from "./helpers/codex-target";
import { summarizeScannedContent } from "./helpers/sync-results";
import type { SyncTargetResult } from "./contract";

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
    for (const codexHome of input.codexHomes) {
      targets.push(await syncCodexTarget({
        codexHome,
        sourcePlugin: input.sourcePlugin,
        content: codexContent,
        options,
      }));
    }
  }

  if (input.includeClaude) {
    const claudeContent = await resolveServiceProviderContent({
      agent: "claude",
      sourcePlugin: input.sourcePlugin,
      base: input.content,
      resources: context.resources,
    });
    for (const claudeHome of input.claudeHomes) {
      targets.push(await syncClaudeTarget({
        claudeLocalHome: claudeHome,
        sourcePlugin: input.sourcePlugin,
        content: claudeContent,
        options,
      }));
    }
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

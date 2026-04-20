import { module } from "./module";
import type { RetireAction, RetireStaleManagedResult } from "./contract";
import {
  claudeMarketplacePath,
  planClaudeHomeRetirement,
} from "./lib/claude-stale-managed";
import {
  codexPromptTarget,
  codexRegistryPath,
  codexScriptTarget,
  codexSkillTarget,
  planCodexHomeRetirement,
} from "./lib/codex-stale-managed";
import { deletePathIfPresent } from "./lib/filesystem-actions";

const retireStaleManaged = module.retireStaleManaged.handler(async ({ context, input }) => {
  const activePluginNames = new Set(input.activePluginNames);
  const undoCapture = input.dryRun ? undefined : context.undoCapture;
  const actions: RetireAction[] = [];
  const stalePlugins: RetireStaleManagedResult["stalePlugins"] = [];
  let ok = true;

  for (const codexHome of input.codexHomes) {
    try {
      const plan = await planCodexHomeRetirement({
        codexHome,
        workspaceRoot: input.workspaceRoot,
        scope: input.scope,
        activePluginNames,
        resources: context.resources,
      });
      if (!plan) continue;

      for (const plugin of plan.stalePlugins) {
        stalePlugins.push({ agent: "codex", home: codexHome, plugin: plugin.pluginName });

        for (const prompt of plugin.prompts) {
          const target = codexPromptTarget(codexHome, prompt);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            undoCapture,
            resources: context.resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: plugin.pluginName,
            target,
            action,
            message: "retire stale prompt",
          });
        }

        for (const skill of plugin.skills) {
          const target = codexSkillTarget(codexHome, skill);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            recursive: true,
            undoCapture,
            resources: context.resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: plugin.pluginName,
            target,
            action,
            message: "retire stale skill",
          });
        }

        for (const script of plugin.scripts) {
          const target = codexScriptTarget(codexHome, script);
          const action = await deletePathIfPresent({
            dryRun: input.dryRun,
            target,
            undoCapture,
            resources: context.resources,
          });
          actions.push({
            agent: "codex",
            home: codexHome,
            plugin: plugin.pluginName,
            target,
            action,
            message: "retire stale script",
          });
        }
      }

      if (!input.dryRun) {
        await undoCapture?.captureWriteTarget(plan.registryPath);
        await context.resources.files.writeJsonFile(plan.registryPath, plan.nextRegistry);
      }

      actions.push({
        agent: "codex",
        home: codexHome,
        plugin: "*",
        target: plan.registryPath,
        action: input.dryRun ? "planned" : "updated",
        message: `removed stale managed plugin entries: ${plan.staleNames.join(", ")}`,
      });
    } catch (err) {
      ok = false;
      actions.push({
        agent: "codex",
        home: codexHome,
        plugin: "*",
        target: codexRegistryPath(codexHome),
        action: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const claudeHome of input.claudeHomes) {
    try {
      const plan = await planClaudeHomeRetirement({
        claudeHome,
        workspaceRoot: input.workspaceRoot,
        scope: input.scope,
        activePluginNames,
        resources: context.resources,
      });

      for (const plugin of plan.stalePlugins) {
        stalePlugins.push({ agent: "claude", home: claudeHome, plugin: plugin.pluginName });
        const action = await deletePathIfPresent({
          dryRun: input.dryRun,
          target: plugin.target,
          recursive: true,
          undoCapture,
          resources: context.resources,
        });
        actions.push({
          agent: "claude",
          home: claudeHome,
          plugin: plugin.pluginName,
          target: plugin.target,
          action,
          message: "retire stale plugin directory",
        });
      }

      if (plan.marketplaceUpdate) {
        if (!input.dryRun) {
          await undoCapture?.captureWriteTarget(plan.marketplaceUpdate.marketplacePath);
          await context.resources.files.writeJsonFile(
            plan.marketplaceUpdate.marketplacePath,
            plan.marketplaceUpdate.nextMarketplace,
          );
        }
        actions.push({
          agent: "claude",
          home: claudeHome,
          plugin: "*",
          target: plan.marketplaceUpdate.marketplacePath,
          action: input.dryRun ? "planned" : "updated",
          message: `removed stale managed marketplace entries: ${plan.marketplaceUpdate.staleNames.join(", ")}`,
        });
      }
    } catch (err) {
      ok = false;
      actions.push({
        agent: "claude",
        home: claudeHome,
        plugin: "*",
        target: claudeMarketplacePath(claudeHome),
        action: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ok, stalePlugins, actions };
});

export const router = module.router({
  retireStaleManaged,
});

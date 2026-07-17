import { Effect } from "effect";

import type {
  ClaudeNativeAgentProviderSession,
  NativeAgentProviderResource,
  NativeProviderCapabilityProbe,
  NativeProviderSessionInput,
} from "@rawr/resource-native-agent-provider";
import {
  acquireEffectPlatformNodeProvider,
  type EffectPlatformNodeRequirements,
  parseHelpCommands,
  parseJsonObservation,
  requireMarketplaceIdentity,
  requirePluginSelector,
} from "#native-agent-provider-effect-platform-node";

const MAX_SETTINGS_BYTES = 4 * 1024 * 1024;

export const claudeEffectPlatformNodeProvider: NativeAgentProviderResource<
  ClaudeNativeAgentProviderSession,
  EffectPlatformNodeRequirements
> = Object.freeze({
  acquire: (input: NativeProviderSessionInput) => acquireEffectPlatformNodeProvider("claude", input).pipe(
    Effect.map((kernel): ClaudeNativeAgentProviderSession => {
      const probe: ClaudeNativeAgentProviderSession["probe"] = () => Effect.gen(function* () {
        const pluginHelp = yield* kernel.run("probe", ["plugin", "--help"]);
        const marketplaceHelp = yield* kernel.run("probe", ["plugin", "marketplace", "--help"]);
        return Object.freeze({
          provider: "claude",
          executablePath: kernel.executablePath,
          home: kernel.home,
          pluginCommands: parseHelpCommands(pluginHelp.stdout),
          marketplaceCommands: parseHelpCommands(marketplaceHelp.stdout),
          appServerMethods: Object.freeze([]),
        }) satisfies NativeProviderCapabilityProbe;
      });

      const pluginMutation = (
        operation: "plugin-install" | "plugin-enable" | "plugin-disable" | "plugin-remove",
        action: "install" | "enable" | "disable" | "uninstall",
        selector: string,
      ) => requirePluginSelector("claude", operation, selector).pipe(
        Effect.flatMap((canonicalSelector) => kernel.run(operation, [
          "plugin",
          action,
          canonicalSelector,
          "--scope",
          "user",
        ])),
      );

      return Object.freeze({
        provider: "claude",
        executablePath: kernel.executablePath,
        home: kernel.home,
        probe,
        listMarketplaces: () => kernel.run("marketplace-list", [
          "plugin",
          "marketplace",
          "list",
          "--json",
        ]).pipe(Effect.flatMap((result) => parseJsonObservation("claude", "marketplace-list", result))),
        addMarketplace: (request: Parameters<ClaudeNativeAgentProviderSession["addMarketplace"]>[0]) =>
          kernel.requireCanonicalDirectory("marketplace-add", request.sourcePath).pipe(
          Effect.flatMap((canonicalSource) => kernel.run("marketplace-add", [
            "plugin",
            "marketplace",
            "add",
            canonicalSource,
            "--scope",
            "user",
          ])),
        ),
        removeMarketplace: (request: Parameters<ClaudeNativeAgentProviderSession["removeMarketplace"]>[0]) =>
          requireMarketplaceIdentity("claude", "marketplace-remove", request.identity).pipe(
          Effect.flatMap((canonicalIdentity) => kernel.run("marketplace-remove", [
            "plugin",
            "marketplace",
            "remove",
            canonicalIdentity,
            "--scope",
            "user",
          ])),
        ),
        listPlugins: () => kernel.run("plugin-list", [
          "plugin",
          "list",
          "--available",
          "--json",
        ]).pipe(Effect.flatMap((result) => parseJsonObservation("claude", "plugin-list", result))),
        installPlugin: (request: Parameters<ClaudeNativeAgentProviderSession["installPlugin"]>[0]) =>
          pluginMutation("plugin-install", "install", request.selector),
        enablePlugin: (request: Parameters<ClaudeNativeAgentProviderSession["enablePlugin"]>[0]) =>
          pluginMutation("plugin-enable", "enable", request.selector),
        disablePlugin: (request: Parameters<ClaudeNativeAgentProviderSession["disablePlugin"]>[0]) =>
          pluginMutation("plugin-disable", "disable", request.selector),
        uninstallPlugin: (request: Parameters<ClaudeNativeAgentProviderSession["uninstallPlugin"]>[0]) =>
          pluginMutation("plugin-remove", "uninstall", request.selector),
        readConfiguration: () => kernel.readHomeJsonFile("settings.json", MAX_SETTINGS_BYTES),
        readPackage: kernel.readPackage,
      });
    }),
  ),
});

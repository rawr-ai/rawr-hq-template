import { Effect } from "effect";

import type {
  ClaudeNativeAgentProviderSession,
  NativeAgentProviderFailure,
  NativeAgentProviderResource,
  NativeProviderCapabilityProbe,
  NativeProviderJsonValue,
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
  acquire: (input: NativeProviderSessionInput) =>
    acquireEffectPlatformNodeProvider("claude", input).pipe(
      Effect.map((kernel): ClaudeNativeAgentProviderSession => {
        const probe: ClaudeNativeAgentProviderSession["probe"] = () =>
          Effect.gen(function* () {
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
          selector: string
        ) =>
          requirePluginSelector("claude", operation, selector).pipe(
            Effect.flatMap((canonicalSelector) =>
              kernel.run(operation, ["plugin", action, canonicalSelector, "--scope", "user"])
            )
          );

        const listMarketplaces: ClaudeNativeAgentProviderSession["listMarketplaces"] = () =>
          kernel
            .run("marketplace-list", ["plugin", "marketplace", "list", "--json"])
            .pipe(
              Effect.flatMap((result) => parseJsonObservation("claude", "marketplace-list", result))
            );

        const listPlugins: ClaudeNativeAgentProviderSession["listPlugins"] = () =>
          kernel
            .run("plugin-list", ["plugin", "list", "--available", "--json"])
            .pipe(
              Effect.flatMap((result) => parseJsonObservation("claude", "plugin-list", result))
            );

        const listInstalledPlugins = () =>
          kernel
            .run("plugin-read", ["plugin", "list", "--json"])
            .pipe(
              Effect.flatMap((result) => parseJsonObservation("claude", "plugin-read", result))
            );

        return Object.freeze({
          provider: "claude",
          executablePath: kernel.executablePath,
          home: kernel.home,
          probe,
          listMarketplaces,
          readMarketplace: (
            request: Parameters<ClaudeNativeAgentProviderSession["readMarketplace"]>[0]
          ) =>
            requireMarketplaceIdentity("claude", "marketplace-read", request.identity).pipe(
              Effect.flatMap((identity) =>
                listMarketplaces().pipe(
                  Effect.flatMap((observation) => selectMarketplaceRoot(observation.json, identity))
                )
              ),
              Effect.flatMap((root) => kernel.readMarketplacePackage(root, request))
            ),
          addMarketplace: (
            source: Parameters<ClaudeNativeAgentProviderSession["addMarketplace"]>[0]
          ) =>
            kernel
              .requireCanonicalDirectory("marketplace-add", source)
              .pipe(
                Effect.flatMap((canonicalSource) =>
                  kernel.run("marketplace-add", [
                    "plugin",
                    "marketplace",
                    "add",
                    canonicalSource,
                    "--scope",
                    "user",
                  ])
                )
              ),
          removeMarketplace: (
            request: Parameters<ClaudeNativeAgentProviderSession["removeMarketplace"]>[0]
          ) =>
            requireMarketplaceIdentity("claude", "marketplace-remove", request.identity).pipe(
              Effect.flatMap((canonicalIdentity) =>
                kernel.run("marketplace-remove", [
                  "plugin",
                  "marketplace",
                  "remove",
                  canonicalIdentity,
                  "--scope",
                  "user",
                ])
              )
            ),
          listPlugins,
          readPlugin: (request: Parameters<ClaudeNativeAgentProviderSession["readPlugin"]>[0]) =>
            requirePluginSelector("claude", "plugin-read", request.selector).pipe(
              Effect.flatMap((selector) =>
                listInstalledPlugins().pipe(
                  Effect.flatMap((observation) =>
                    selectInstalledPluginRoot(observation.json, selector)
                  )
                )
              ),
              Effect.flatMap((root) => kernel.readPluginPackage(root, request))
            ),
          installPlugin: (
            request: Parameters<ClaudeNativeAgentProviderSession["installPlugin"]>[0]
          ) => pluginMutation("plugin-install", "install", request.selector),
          enablePlugin: (
            request: Parameters<ClaudeNativeAgentProviderSession["enablePlugin"]>[0]
          ) => pluginMutation("plugin-enable", "enable", request.selector),
          disablePlugin: (
            request: Parameters<ClaudeNativeAgentProviderSession["disablePlugin"]>[0]
          ) => pluginMutation("plugin-disable", "disable", request.selector),
          uninstallPlugin: (
            request: Parameters<ClaudeNativeAgentProviderSession["uninstallPlugin"]>[0]
          ) => pluginMutation("plugin-remove", "uninstall", request.selector),
          readConfiguration: () => kernel.readHomeJsonFile("settings.json", MAX_SETTINGS_BYTES),
        });
      })
    ),
});

function selectMarketplaceRoot(
  json: NativeProviderJsonValue,
  identity: string
): Effect.Effect<string, NativeAgentProviderFailure> {
  if (!Array.isArray(json)) {
    return Effect.fail(
      providerFailure(
        "marketplace-read",
        "ProtocolFailed",
        "Claude marketplace list was not an array"
      )
    );
  }
  const matches: string[] = [];
  for (const entry of json) {
    if (!isJsonRecord(entry) || typeof entry.name !== "string") {
      return Effect.fail(
        providerFailure("marketplace-read", "ProtocolFailed", "Claude marketplace entry is invalid")
      );
    }
    if (entry.name !== identity) continue;
    if (entry.source !== "directory" || typeof entry.path !== "string") {
      return Effect.fail(
        providerFailure(
          "marketplace-read",
          "ProtocolFailed",
          "Claude managed marketplace is not one directory source"
        )
      );
    }
    matches.push(entry.path);
  }
  return selectUniqueRoot("marketplace-read", matches, "Claude marketplace identity");
}

function selectInstalledPluginRoot(
  json: NativeProviderJsonValue,
  selector: string
): Effect.Effect<string, NativeAgentProviderFailure> {
  if (!Array.isArray(json)) {
    return Effect.fail(
      providerFailure(
        "plugin-read",
        "ProtocolFailed",
        "Claude installed plugin list was not an array"
      )
    );
  }
  const matches: string[] = [];
  for (const entry of json) {
    if (!isJsonRecord(entry) || typeof entry.id !== "string") {
      return Effect.fail(
        providerFailure("plugin-read", "ProtocolFailed", "Claude installed plugin entry is invalid")
      );
    }
    if (entry.id !== selector) continue;
    if (
      entry.scope !== "user" ||
      typeof entry.enabled !== "boolean" ||
      typeof entry.installPath !== "string"
    ) {
      return Effect.fail(
        providerFailure("plugin-read", "ProtocolFailed", "Claude installed plugin entry is invalid")
      );
    }
    matches.push(entry.installPath);
  }
  return selectUniqueRoot("plugin-read", matches, "Claude installed plugin selector");
}

function selectUniqueRoot(
  operation: "marketplace-read" | "plugin-read",
  matches: readonly string[],
  label: string
): Effect.Effect<string, NativeAgentProviderFailure> {
  if (matches.length === 0) {
    return Effect.fail(providerFailure(operation, "Missing", `${label} is absent`));
  }
  if (matches.length !== 1 || matches[0] === undefined) {
    return Effect.fail(providerFailure(operation, "ProtocolFailed", `${label} is ambiguous`));
  }
  return Effect.succeed(matches[0]);
}

function isJsonRecord(
  value: NativeProviderJsonValue
): value is Readonly<Record<string, NativeProviderJsonValue>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function providerFailure(
  operation: NativeAgentProviderFailure["operation"],
  reason: NativeAgentProviderFailure["reason"],
  detail: string
): NativeAgentProviderFailure {
  return Object.freeze({
    _tag: "NativeAgentProviderFailure",
    provider: "claude",
    operation,
    reason,
    detail,
  });
}

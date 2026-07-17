import { Effect } from "effect";

import type {
  CodexNativeAgentProviderSession,
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
  runCodexAppServerRequests,
} from "#native-agent-provider-effect-platform-node";

export const codexEffectPlatformNodeProvider: NativeAgentProviderResource<
  CodexNativeAgentProviderSession,
  EffectPlatformNodeRequirements
> = Object.freeze({
  acquire: (input: NativeProviderSessionInput) => acquireEffectPlatformNodeProvider("codex", input).pipe(
    Effect.map((kernel): CodexNativeAgentProviderSession => {
      const inspectAppServer: CodexNativeAgentProviderSession["inspectAppServer"] = () =>
        runCodexAppServerRequests(kernel, "app-server-inspect", [
          Object.freeze({
            method: "plugin/list",
            params: Object.freeze({ cwds: Object.freeze([]), marketplaceKinds: Object.freeze(["local"]) }),
          }),
          Object.freeze({
            method: "hooks/list",
            params: Object.freeze({ cwds: Object.freeze([kernel.home]) }),
          }),
        ]).pipe(
          Effect.flatMap((results) => {
            const plugins = results[0];
            const hooks = results[1];
            return plugins === undefined || hooks === undefined
              ? Effect.fail(providerFailure("app-server-inspect", "ProtocolFailed", "Codex app server response set was incomplete"))
              : Effect.succeed(Object.freeze({ plugins, hooks }));
          }),
        );

      const readConfiguration: CodexNativeAgentProviderSession["readConfiguration"] = () =>
        runCodexAppServerRequests(kernel, "config-read", [
          Object.freeze({
            method: "config/read",
            params: Object.freeze({ cwd: kernel.home, includeLayers: true }),
          }),
        ]).pipe(
          Effect.flatMap((results) => results[0] === undefined
            ? Effect.fail(providerFailure("config-read", "ProtocolFailed", "Codex app server returned no configuration"))
            : Effect.succeed(results[0])),
        );

      const setConfigurationValue = (
        keyPath: string,
        value: NativeProviderJsonValue,
      ): Effect.Effect<void, NativeAgentProviderFailure> =>
        runCodexAppServerRequests(kernel, "config-write", [
          Object.freeze({
            method: "config/value/write",
            params: Object.freeze({ keyPath, value, mergeStrategy: "upsert" }),
          }),
        ]).pipe(Effect.asVoid);

      const probe: CodexNativeAgentProviderSession["probe"] = () => Effect.gen(function* () {
        // One acquired session serializes the fresh-home app-server and help probes.
        yield* inspectAppServer();
        const pluginHelp = yield* kernel.run("probe", ["plugin", "--help"]);
        const marketplaceHelp = yield* kernel.run("probe", ["plugin", "marketplace", "--help"]);
        return Object.freeze({
          provider: "codex",
          executablePath: kernel.executablePath,
          home: kernel.home,
          pluginCommands: parseHelpCommands(pluginHelp.stdout),
          marketplaceCommands: parseHelpCommands(marketplaceHelp.stdout),
          appServerMethods: Object.freeze(["config/read", "config/value/write", "hooks/list", "plugin/list"]),
        }) satisfies NativeProviderCapabilityProbe;
      });

      return Object.freeze({
        provider: "codex",
        executablePath: kernel.executablePath,
        home: kernel.home,
        probe,
        listMarketplaces: () => kernel.run("marketplace-list", [
          "plugin",
          "marketplace",
          "list",
          "--json",
        ]).pipe(Effect.flatMap((result) => parseJsonObservation("codex", "marketplace-list", result))),
        addMarketplace: (request: Parameters<CodexNativeAgentProviderSession["addMarketplace"]>[0]) =>
          kernel.requireCanonicalDirectory("marketplace-add", request.sourcePath).pipe(
          Effect.flatMap((canonicalSource) => kernel.run("marketplace-add", [
            "plugin",
            "marketplace",
            "add",
            canonicalSource,
            "--json",
          ])),
        ),
        removeMarketplace: (request: Parameters<CodexNativeAgentProviderSession["removeMarketplace"]>[0]) =>
          requireMarketplaceIdentity("codex", "marketplace-remove", request.identity).pipe(
          Effect.flatMap((canonicalIdentity) => kernel.run("marketplace-remove", [
            "plugin",
            "marketplace",
            "remove",
            canonicalIdentity,
            "--json",
          ])),
        ),
        listPlugins: () => kernel.run("plugin-list", [
          "plugin",
          "list",
          "--available",
          "--json",
        ]).pipe(Effect.flatMap((result) => parseJsonObservation("codex", "plugin-list", result))),
        addPlugin: (request: Parameters<CodexNativeAgentProviderSession["addPlugin"]>[0]) =>
          requirePluginSelector("codex", "plugin-install", request.selector).pipe(
          Effect.flatMap((canonicalSelector) => kernel.run("plugin-install", ["plugin", "add", canonicalSelector, "--json"])),
        ),
        removePlugin: (request: Parameters<CodexNativeAgentProviderSession["removePlugin"]>[0]) =>
          requirePluginSelector("codex", "plugin-remove", request.selector).pipe(
          Effect.flatMap((canonicalSelector) => kernel.run("plugin-remove", ["plugin", "remove", canonicalSelector, "--json"])),
        ),
        inspectAppServer,
        readConfiguration,
        setMarketplaceSource: (request: Parameters<CodexNativeAgentProviderSession["setMarketplaceSource"]>[0]) => Effect.gen(function* () {
          const canonicalIdentity = yield* requireMarketplaceIdentity("codex", "config-write", request.identity);
          const canonicalSource = yield* kernel.requireCanonicalDirectory("config-write", request.sourcePath);
          yield* setConfigurationValue(`marketplaces.${canonicalIdentity}.source`, canonicalSource);
        }),
        setPluginEnabled: (request: Parameters<CodexNativeAgentProviderSession["setPluginEnabled"]>[0]) =>
          requirePluginSelector("codex", "config-write", request.selector).pipe(
          Effect.flatMap((canonicalSelector) => setConfigurationValue(`plugins.${canonicalSelector}.enabled`, request.enabled)),
        ),
        readPackage: kernel.readPackage,
      });
    }),
  ),
});

function providerFailure(
  operation: NativeAgentProviderFailure["operation"],
  reason: NativeAgentProviderFailure["reason"],
  detail: string,
): NativeAgentProviderFailure {
  return Object.freeze({
    _tag: "NativeAgentProviderFailure",
    provider: "codex",
    operation,
    reason,
    detail,
  });
}

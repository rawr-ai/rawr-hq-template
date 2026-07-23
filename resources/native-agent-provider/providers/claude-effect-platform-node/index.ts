import type {
  ClaudeNativeAgentProviderSession,
  NativeAgentProviderFailure,
  NativeAgentProviderResource,
  NativeMarketplaceSource,
  NativeProviderCapabilities,
  NativeProviderCapability,
  NativeProviderInventory,
  NativeProviderMarketplaceObservation,
  NativeProviderPluginFileObservation,
  NativeProviderPluginFiles,
  NativeProviderPluginObservation,
  NativeProviderSessionInput,
} from "@rawr/resource-native-agent-provider";
import { NativeProviderInventorySchema } from "@rawr/resource-native-agent-provider";
import { Effect } from "effect";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import {
  acquireEffectPlatformNodeProvider,
  decodeProviderJson,
  type EffectPlatformNodeProviderKernel,
  type EffectPlatformNodeRequirements,
  parseHelpCommands,
  requireGitMarketplaceSource,
  requireMarketplaceIdentityInput,
  requireMarketplaceSource,
  requirePluginFilesReadInput,
  requirePluginSelectorInput,
} from "#native-agent-provider-effect-platform-node";

const NullableStringSchema = Type.Union([Type.String(), Type.Null()]);
const ClaudeMarketplaceListSchema = Type.Array(
  Type.Object(
    {
      name: Type.String(),
      source: Type.Optional(NullableStringSchema),
      url: Type.Optional(NullableStringSchema),
      path: Type.Optional(NullableStringSchema),
      installLocation: Type.Optional(NullableStringSchema),
      revision: Type.Optional(NullableStringSchema),
      ref: Type.Optional(NullableStringSchema),
    },
    { additionalProperties: true }
  ),
  { maxItems: 1_024 }
);

const ClaudePluginListSchema = Type.Array(
  Type.Object(
    {
      id: Type.String(),
      version: Type.Optional(NullableStringSchema),
      enabled: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      installPath: Type.Optional(NullableStringSchema),
    },
    { additionalProperties: true }
  ),
  { maxItems: 4_096 }
);

type ClaudeMarketplaceList = Static<typeof ClaudeMarketplaceListSchema>;
type ClaudePluginList = Static<typeof ClaudePluginListSchema>;

export const claudeEffectPlatformNodeProvider: NativeAgentProviderResource<
  ClaudeNativeAgentProviderSession,
  EffectPlatformNodeRequirements
> = Object.freeze({
  acquire: (input: NativeProviderSessionInput) =>
    acquireEffectPlatformNodeProvider("claude", input).pipe(
      Effect.map((kernel): ClaudeNativeAgentProviderSession => {
        const probe: ClaudeNativeAgentProviderSession["probe"] = () =>
          kernel.serialized(
            "probe",
            Effect.gen(function* () {
              const version = yield* kernel.run("probe", ["--version"]);
              const pluginHelp = yield* kernel.run("probe", ["plugin", "--help"]);
              const marketplaceHelp = yield* kernel.run("probe", [
                "plugin",
                "marketplace",
                "--help",
              ]);
              return Object.freeze({
                provider: "claude",
                executablePath: kernel.executablePath,
                home: kernel.home,
                version: yield* requireVersion(version.stdout),
                capabilities: observedCapabilities(pluginHelp.stdout, marketplaceHelp.stdout),
              }) satisfies NativeProviderCapabilities;
            })
          );

        const readInventory = () => claudeInventory(kernel);
        const inventory: ClaudeNativeAgentProviderSession["inventory"] = () =>
          kernel.serialized("inventory", readInventory());

        return Object.freeze({
          provider: "claude",
          executablePath: kernel.executablePath,
          home: kernel.home,
          probe,
          inventory,
          readPluginFiles: (request) =>
            kernel.serialized(
              "plugin-files-read",
              requirePluginFilesReadInput("claude", "plugin-files-read", request).pipe(
                Effect.flatMap((validated) =>
                  readInventory().pipe(
                    Effect.flatMap((live) =>
                      selectPluginRoot(live.plugins, validated.selector).pipe(
                        Effect.flatMap((root) =>
                          Effect.forEach(
                            validated.files,
                            (file) =>
                              kernel.readPluginEntry("plugin-files-read", root, file).pipe(
                                Effect.catchAll((error) => {
                                  if (
                                    error.reason !== "Missing" &&
                                    error.reason !== "LimitExceeded"
                                  ) {
                                    return Effect.fail(error);
                                  }
                                  const missing: NativeProviderPluginFileObservation =
                                    Object.freeze({
                                      kind: error.reason === "Missing" ? "Missing" : "TooLarge",
                                      relativePath: file.relativePath,
                                    });
                                  return Effect.succeed(missing);
                                })
                              ),
                            { concurrency: 1 }
                          ).pipe(
                            Effect.map((files) => {
                              const observed: NativeProviderPluginFiles = Object.freeze({
                                selector: validated.selector,
                                files: Object.freeze(files),
                              });
                              return observed;
                            })
                          )
                        )
                      )
                    )
                  )
                )
              )
            ),
          addMarketplace: (source) =>
            kernel.serialized(
              "marketplace-add",
              requireMarketplaceSource("claude", "marketplace-add", source).pipe(
                Effect.flatMap((validated) => claudeMarketplaceAddArgs(kernel, validated)),
                Effect.flatMap((args) => kernel.mutation("marketplace-add", args))
              )
            ),
          removeMarketplace: (request) =>
            kernel.serialized(
              "marketplace-remove",
              requireMarketplaceIdentityInput("claude", "marketplace-remove", request).pipe(
                Effect.flatMap((identity) =>
                  kernel.mutation("marketplace-remove", [
                    "plugin",
                    "marketplace",
                    "remove",
                    identity,
                    "--scope",
                    "user",
                  ])
                )
              )
            ),
          installPlugin: (request) =>
            kernel.serialized(
              "plugin-install",
              requirePluginSelectorInput("claude", "plugin-install", request).pipe(
                Effect.flatMap((selector) =>
                  pluginMutation(kernel, "plugin-install", "install", selector)
                )
              )
            ),
          enablePlugin: (request) =>
            kernel.serialized(
              "plugin-enable",
              requirePluginSelectorInput("claude", "plugin-enable", request).pipe(
                Effect.flatMap((selector) =>
                  pluginMutation(kernel, "plugin-enable", "enable", selector)
                )
              )
            ),
          removePlugin: (request) =>
            kernel.serialized(
              "plugin-remove",
              requirePluginSelectorInput("claude", "plugin-remove", request).pipe(
                Effect.flatMap((selector) =>
                  pluginMutation(kernel, "plugin-remove", "uninstall", selector)
                )
              )
            ),
        });
      })
    ),
});

function claudeInventory(
  kernel: EffectPlatformNodeProviderKernel
): Effect.Effect<NativeProviderInventory, NativeAgentProviderFailure> {
  return Effect.gen(function* () {
    const marketplaceOutput = yield* kernel.run("inventory", [
      "plugin",
      "marketplace",
      "list",
      "--json",
    ]);
    const pluginOutput = yield* kernel.run("inventory", ["plugin", "list", "--json"]);
    const marketplaceRecord = yield* decodeProviderJson(
      "claude",
      "inventory",
      ClaudeMarketplaceListSchema,
      marketplaceOutput.stdout
    );
    const pluginRecord = yield* decodeProviderJson(
      "claude",
      "inventory",
      ClaudePluginListSchema,
      pluginOutput.stdout
    );
    const marketplaces = yield* Effect.forEach(marketplaceRecord, normalizeMarketplace, {
      concurrency: 1,
    });
    const plugins = yield* Effect.forEach(pluginRecord, normalizePlugin, { concurrency: 1 });
    yield* requireUniqueInventory(marketplaces, plugins);
    const normalized = Object.freeze({
      provider: "claude",
      marketplaces: [...marketplaces].sort(byIdentity),
      plugins: [...plugins].sort(bySelector),
    });
    return Value.Check(NativeProviderInventorySchema, normalized)
      ? normalized
      : yield* Effect.fail(
          providerFailure(
            "inventory",
            "ProtocolFailed",
            "Claude native inventory contains non-canonical facts"
          )
        );
  });
}

function normalizeMarketplace(
  entry: ClaudeMarketplaceList[number]
): Effect.Effect<NativeProviderMarketplaceObservation, NativeAgentProviderFailure> {
  if (entry.source === "git") {
    const repositoryUrl = entry.url;
    const revision = entry.ref ?? entry.revision;
    return repositoryUrl !== null &&
      repositoryUrl !== undefined &&
      revision !== null &&
      revision !== undefined
      ? Effect.succeed(
          Object.freeze({
            identity: entry.name,
            source: Object.freeze({ kind: "git" as const, repositoryUrl, revision }),
            installedRoot: entry.installLocation ?? null,
          })
        )
      : Effect.fail(
          providerFailure(
            "inventory",
            "ProtocolFailed",
            "Claude Git marketplace omitted its URL or ref"
          )
        );
  }
  if (entry.source === "directory") {
    return entry.path === null || entry.path === undefined
      ? Effect.fail(
          providerFailure(
            "inventory",
            "ProtocolFailed",
            "Claude local marketplace omitted its source path"
          )
        )
      : Effect.succeed(
          Object.freeze({
            identity: entry.name,
            source: Object.freeze({ kind: "local" as const, root: entry.path }),
            installedRoot: entry.installLocation ?? null,
          })
        );
  }
  return entry.source === null || entry.source === undefined
    ? Effect.succeed(
        Object.freeze({
          identity: entry.name,
          source: null,
          installedRoot: entry.installLocation ?? null,
        })
      )
    : Effect.fail(
        providerFailure(
          "inventory",
          "ProtocolFailed",
          "Claude marketplace source kind is unsupported"
        )
      );
}

function normalizePlugin(
  entry: ClaudePluginList[number]
): Effect.Effect<NativeProviderPluginObservation, NativeAgentProviderFailure> {
  const separator = entry.id.lastIndexOf("@");
  if (separator <= 0 || separator === entry.id.length - 1) {
    return Effect.fail(
      providerFailure("inventory", "ProtocolFailed", "Claude plugin id is not one selector")
    );
  }
  const name = entry.id.slice(0, separator);
  const marketplaceIdentity = entry.id.slice(separator + 1);
  return Effect.succeed(
    Object.freeze({
      selector: entry.id,
      marketplaceIdentity,
      name,
      installed: true,
      enabled: entry.enabled ?? null,
      version: entry.version ?? null,
      root: entry.installPath ?? null,
    })
  );
}

function requireUniqueInventory(
  marketplaces: readonly NativeProviderMarketplaceObservation[],
  plugins: readonly NativeProviderPluginObservation[]
): Effect.Effect<void, NativeAgentProviderFailure> {
  return new Set(marketplaces.map((entry) => entry.identity)).size === marketplaces.length &&
    new Set(plugins.map((entry) => entry.selector)).size === plugins.length
    ? Effect.void
    : Effect.fail(
        providerFailure(
          "inventory",
          "ProtocolFailed",
          "Claude native inventory contains duplicate identities"
        )
      );
}

function selectPluginRoot(
  plugins: readonly NativeProviderPluginObservation[],
  selector: string
): Effect.Effect<string, NativeAgentProviderFailure> {
  const matches = plugins.filter((entry) => entry.selector === selector && entry.installed);
  const selected = matches[0];
  if (matches.length !== 1 || selected === undefined) {
    return Effect.fail(
      providerFailure(
        "plugin-files-read",
        matches.length === 0 ? "Missing" : "ProtocolFailed",
        matches.length === 0
          ? "Claude installed plugin selector is absent"
          : "Claude installed plugin selector is ambiguous"
      )
    );
  }
  return selected.root === null
    ? Effect.fail(
        providerFailure(
          "plugin-files-read",
          "ProtocolFailed",
          "Claude installed plugin omitted its native package root"
        )
      )
    : Effect.succeed(selected.root);
}

function claudeMarketplaceAddArgs(
  kernel: EffectPlatformNodeProviderKernel,
  source: NativeMarketplaceSource
): Effect.Effect<readonly string[], NativeAgentProviderFailure> {
  if (source.kind === "local") {
    return kernel
      .requireLocalDirectory("marketplace-add", source.root)
      .pipe(
        Effect.map((root) =>
          Object.freeze(["plugin", "marketplace", "add", root, "--scope", "user"])
        )
      );
  }
  return requireGitMarketplaceSource(
    "claude",
    "marketplace-add",
    source.repositoryUrl,
    source.revision,
    source.sparsePaths
  ).pipe(
    Effect.map((git) =>
      Object.freeze([
        "plugin",
        "marketplace",
        "add",
        `${git.repositoryUrl}#${git.revision}`,
        "--scope",
        "user",
        ...(git.sparsePaths.length === 0 ? [] : ["--sparse", ...git.sparsePaths]),
      ])
    )
  );
}

function pluginMutation(
  kernel: EffectPlatformNodeProviderKernel,
  operation: "plugin-install" | "plugin-enable" | "plugin-remove",
  action: "install" | "enable" | "uninstall",
  selector: string
) {
  return kernel.mutation(operation, ["plugin", action, selector, "--scope", "user"]);
}

function observedCapabilities(
  pluginHelp: string,
  marketplaceHelp: string
): Extract<NativeProviderCapabilities, { provider: "claude" }>["capabilities"] {
  const plugin = new Set(parseHelpCommands(pluginHelp));
  const marketplace = new Set(parseHelpCommands(marketplaceHelp));
  const capabilities: Extract<
    NativeProviderCapabilities,
    { provider: "claude" }
  >["capabilities"][number][] = [];
  if (marketplace.has("list")) capabilities.push("marketplace-list");
  if (marketplace.has("add")) capabilities.push("marketplace-add");
  if (marketplace.has("remove")) capabilities.push("marketplace-remove");
  if (marketplace.has("update")) capabilities.push("marketplace-update");
  if (plugin.has("list")) capabilities.push("plugin-list");
  if (plugin.has("install")) capabilities.push("plugin-install");
  if (plugin.has("enable")) capabilities.push("plugin-enable");
  if (plugin.has("disable")) capabilities.push("plugin-disable");
  if (plugin.has("uninstall")) capabilities.push("plugin-remove");
  if (plugin.has("update")) capabilities.push("plugin-update");
  return capabilities;
}

function requireVersion(stdout: string): Effect.Effect<string, NativeAgentProviderFailure> {
  const version = stdout.trim();
  return version.length > 0 && version.length <= 4_096
    ? Effect.succeed(version)
    : Effect.fail(
        providerFailure("probe", "ProtocolFailed", "Claude version output is empty or oversized")
      );
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
    commandPhase: "command-returned",
    detail,
  });
}

function byIdentity(
  left: NativeProviderMarketplaceObservation,
  right: NativeProviderMarketplaceObservation
): number {
  return compareText(left.identity, right.identity);
}

function bySelector(
  left: NativeProviderPluginObservation,
  right: NativeProviderPluginObservation
): number {
  return compareText(left.selector, right.selector);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

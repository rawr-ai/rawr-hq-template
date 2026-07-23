import path from "node:path";

import type {
  CodexNativeAgentProviderSession,
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
const CodexMarketplaceSourceSchema = Type.Union([
  Type.Object(
    {
      sourceType: Type.Union([Type.Literal("git"), Type.Literal("local")]),
      source: Type.String(),
    },
    { additionalProperties: true }
  ),
  Type.Null(),
]);
const CodexMarketplaceListSchema = Type.Object(
  {
    marketplaces: Type.Array(
      Type.Object(
        {
          name: Type.String(),
          root: Type.String(),
          marketplaceSource: Type.Optional(CodexMarketplaceSourceSchema),
        },
        { additionalProperties: true }
      ),
      { maxItems: 1_024 }
    ),
  },
  { additionalProperties: true }
);

const CodexPluginListSchema = Type.Object(
  {
    installed: Type.Array(
      Type.Object(
        {
          pluginId: Type.String(),
          name: Type.String(),
          marketplaceName: Type.String(),
          version: Type.Optional(NullableStringSchema),
          installed: Type.Boolean(),
          enabled: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        },
        { additionalProperties: true }
      ),
      { maxItems: 4_096 }
    ),
  },
  { additionalProperties: true }
);

type CodexMarketplaceList = Static<typeof CodexMarketplaceListSchema>;
type CodexPluginList = Static<typeof CodexPluginListSchema>;

export const codexEffectPlatformNodeProvider: NativeAgentProviderResource<
  CodexNativeAgentProviderSession,
  EffectPlatformNodeRequirements
> = Object.freeze({
  acquire: (input: NativeProviderSessionInput) =>
    acquireEffectPlatformNodeProvider("codex", input).pipe(
      Effect.map((kernel): CodexNativeAgentProviderSession => {
        const probe: CodexNativeAgentProviderSession["probe"] = () =>
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
                provider: "codex",
                executablePath: kernel.executablePath,
                home: kernel.home,
                version: yield* requireVersion(version.stdout),
                capabilities: observedCapabilities(pluginHelp.stdout, marketplaceHelp.stdout),
              }) satisfies NativeProviderCapabilities;
            })
          );

        const readInventory = () => codexInventory(kernel);
        const inventory: CodexNativeAgentProviderSession["inventory"] = () =>
          kernel.serialized("inventory", readInventory());

        return Object.freeze({
          provider: "codex",
          executablePath: kernel.executablePath,
          home: kernel.home,
          probe,
          inventory,
          readPluginFiles: (request) =>
            kernel.serialized(
              "plugin-files-read",
              requirePluginFilesReadInput("codex", "plugin-files-read", request).pipe(
                Effect.flatMap((validated) =>
                  readInventory().pipe(
                    Effect.flatMap((live) =>
                      selectPluginRoot(kernel, live.plugins, validated.selector).pipe(
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
              requireMarketplaceSource("codex", "marketplace-add", source).pipe(
                Effect.flatMap((validated) => codexMarketplaceAddArgs(kernel, validated)),
                Effect.flatMap((args) => kernel.mutation("marketplace-add", args))
              )
            ),
          removeMarketplace: (request) =>
            kernel.serialized(
              "marketplace-remove",
              requireMarketplaceIdentityInput("codex", "marketplace-remove", request).pipe(
                Effect.flatMap((identity) =>
                  kernel.mutation("marketplace-remove", [
                    "plugin",
                    "marketplace",
                    "remove",
                    identity,
                    "--json",
                  ])
                )
              )
            ),
          installPlugin: (request) =>
            kernel.serialized(
              "plugin-install",
              requirePluginSelectorInput("codex", "plugin-install", request).pipe(
                Effect.flatMap((selector) =>
                  kernel.mutation("plugin-install", ["plugin", "add", selector, "--json"])
                )
              )
            ),
          removePlugin: (request) =>
            kernel.serialized(
              "plugin-remove",
              requirePluginSelectorInput("codex", "plugin-remove", request).pipe(
                Effect.flatMap((selector) =>
                  kernel.mutation("plugin-remove", ["plugin", "remove", selector, "--json"])
                )
              )
            ),
        });
      })
    ),
});

function codexInventory(
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
      "codex",
      "inventory",
      CodexMarketplaceListSchema,
      marketplaceOutput.stdout
    );
    const pluginRecord = yield* decodeProviderJson(
      "codex",
      "inventory",
      CodexPluginListSchema,
      pluginOutput.stdout
    );
    const marketplaces = yield* Effect.forEach(
      marketplaceRecord.marketplaces,
      normalizeMarketplace,
      { concurrency: 1 }
    );
    const plugins = yield* Effect.forEach(pluginRecord.installed, normalizePlugin, {
      concurrency: 1,
    });
    yield* requireUniqueInventory(marketplaces, plugins);
    const normalized = Object.freeze({
      provider: "codex",
      marketplaces: [...marketplaces].sort(byIdentity),
      plugins: [...plugins].sort(bySelector),
    });
    return Value.Check(NativeProviderInventorySchema, normalized)
      ? normalized
      : yield* Effect.fail(
          providerFailure(
            "inventory",
            "ProtocolFailed",
            "Codex native inventory contains non-canonical facts"
          )
        );
  });
}

function normalizeMarketplace(
  entry: CodexMarketplaceList["marketplaces"][number]
): Effect.Effect<NativeProviderMarketplaceObservation, NativeAgentProviderFailure> {
  const nativeSource = entry.marketplaceSource;
  if (nativeSource === null || nativeSource === undefined) {
    return Effect.succeed(
      Object.freeze({ identity: entry.name, source: null, installedRoot: entry.root })
    );
  }
  const source =
    nativeSource.sourceType === "git" && nativeSource.source.startsWith("https://")
      ? Object.freeze({
          kind: "git" as const,
          repositoryUrl: nativeSource.source,
          revision: null,
        })
      : nativeSource.sourceType === "local" && path.isAbsolute(nativeSource.source)
        ? Object.freeze({ kind: "local" as const, root: nativeSource.source })
        : undefined;
  return source === undefined
    ? Effect.fail(
        providerFailure(
          "inventory",
          "ProtocolFailed",
          "Codex marketplace source is incomplete or non-canonical"
        )
      )
    : Effect.succeed(Object.freeze({ identity: entry.name, source, installedRoot: entry.root }));
}

function normalizePlugin(
  entry: CodexPluginList["installed"][number]
): Effect.Effect<NativeProviderPluginObservation, NativeAgentProviderFailure> {
  const expectedSelector = `${entry.name}@${entry.marketplaceName}`;
  return entry.pluginId === expectedSelector
    ? Effect.succeed(
        Object.freeze({
          selector: entry.pluginId,
          marketplaceIdentity: entry.marketplaceName,
          name: entry.name,
          installed: entry.installed,
          enabled: entry.enabled ?? null,
          version: entry.version ?? null,
          root: null,
        })
      )
    : Effect.fail(
        providerFailure(
          "inventory",
          "ProtocolFailed",
          "Codex plugin identity fields do not describe one selector"
        )
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
          "Codex native inventory contains duplicate identities"
        )
      );
}

function selectPluginRoot(
  kernel: EffectPlatformNodeProviderKernel,
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
          ? "Codex installed plugin selector is absent"
          : "Codex installed plugin selector is ambiguous"
      )
    );
  }
  if (selected.version === null) {
    return Effect.fail(
      providerFailure(
        "plugin-files-read",
        "ProtocolFailed",
        "Codex installed plugin omitted its version"
      )
    );
  }
  return Effect.succeed(
    kernel.homePath(
      "plugins",
      "cache",
      selected.marketplaceIdentity,
      selected.name,
      selected.version
    )
  );
}

function codexMarketplaceAddArgs(
  kernel: EffectPlatformNodeProviderKernel,
  source: NativeMarketplaceSource
): Effect.Effect<readonly string[], NativeAgentProviderFailure> {
  if (source.kind === "local") {
    return kernel
      .requireLocalDirectory("marketplace-add", source.root)
      .pipe(Effect.map((root) => Object.freeze(["plugin", "marketplace", "add", root, "--json"])));
  }
  return requireGitMarketplaceSource(
    "codex",
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
        git.repositoryUrl,
        "--ref",
        git.revision,
        ...git.sparsePaths.flatMap((path) => ["--sparse", path]),
        "--json",
      ])
    )
  );
}

function observedCapabilities(
  pluginHelp: string,
  marketplaceHelp: string
): Extract<NativeProviderCapabilities, { provider: "codex" }>["capabilities"] {
  const plugin = new Set(parseHelpCommands(pluginHelp));
  const marketplace = new Set(parseHelpCommands(marketplaceHelp));
  const capabilities: Extract<
    NativeProviderCapabilities,
    { provider: "codex" }
  >["capabilities"][number][] = [];
  if (marketplace.has("list")) capabilities.push("marketplace-list");
  if (marketplace.has("add")) capabilities.push("marketplace-add");
  if (marketplace.has("remove")) capabilities.push("marketplace-remove");
  if (plugin.has("list")) capabilities.push("plugin-list");
  if (plugin.has("add")) capabilities.push("plugin-install");
  if (plugin.has("remove")) capabilities.push("plugin-remove");
  return capabilities;
}

function requireVersion(stdout: string): Effect.Effect<string, NativeAgentProviderFailure> {
  const version = stdout.trim();
  return version.length > 0 && version.length <= 4_096
    ? Effect.succeed(version)
    : Effect.fail(
        providerFailure("probe", "ProtocolFailed", "Codex version output is empty or oversized")
      );
}

function providerFailure(
  operation: NativeAgentProviderFailure["operation"],
  reason: NativeAgentProviderFailure["reason"],
  detail: string
): NativeAgentProviderFailure {
  return Object.freeze({
    _tag: "NativeAgentProviderFailure",
    provider: "codex",
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

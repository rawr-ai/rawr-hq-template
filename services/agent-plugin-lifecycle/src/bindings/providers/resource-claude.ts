import {
  parsePluginId,
  type ContentAuthority,
  type PluginId,
} from "../../service/shared/release";
import {
  marketplaceState,
} from "../../service/modules/providers/model/policy/marketplace";
import type {
  ProviderCapability,
} from "../../service/modules/providers/model/policy/projection";
import type { NativeStandaloneExposureObservation } from "../../service/modules/providers/model/policy/state-machine";
import type { ProviderMarketplaceSourceReader } from "../../service/modules/providers/ports/state";
import {
  CLAUDE_ADAPTER_PROTOCOL,
  createClaudeProviderAdapter,
  type ClaudeNativePlugin,
  type ClaudeProcessPort,
  type ClaudeProviderAdapter,
} from "./claude";
import {
  createNativeProviderObserver,
  type NativeProviderObserver,
} from "./native";
import {
  NATIVE_PACKAGE_READ_LIMITS,
  inspectNativePluginPackage,
  inspectNativePluginVisibility,
} from "./resource-package";
import type {
  ClaudeNativeResourceSession,
  NativeProviderResourcePort,
} from "./resource-port";
import {
  capabilitiesFromCommands,
  createSessionCache,
  desiredMarketplace,
  parseSourceIdentity,
  pluginSelector,
  readMarketplaceSource,
  requireArray,
  requireManagedRequest,
  requireRecord,
  requireString,
  sameMarketplaceObservation,
} from "./resource-shared";

export interface ResourceClaudeProviderAdapterOptions {
  readonly resource: NativeProviderResourcePort;
  readonly executablePath: string;
  readonly contentAuthority: ContentAuthority;
  readonly marketplaceSources: ProviderMarketplaceSourceReader;
}

export type ResourceClaudeProviderObserverOptions = Pick<
  ResourceClaudeProviderAdapterOptions,
  "executablePath" | "resource"
>;

export function createResourceClaudeProviderObserver(
  input: ResourceClaudeProviderObserverOptions,
): NativeProviderObserver {
  const { session, listPlugins } = createClaudeResourceAccess(input);
  return createNativeProviderObserver({
    provider: "claude",
    adapterProtocol: CLAUDE_ADAPTER_PROTOCOL,
    bridge: {
      probe: async (home) => {
        const observed = await (await session(home)).probe();
        return Object.freeze({
          adapterProtocol: CLAUDE_ADAPTER_PROTOCOL,
          available: claudeCapabilitiesFromCommands(observed.pluginCommands, observed.marketplaceCommands),
        });
      },
      inventoryExposures: async (home) => await inventoryClaudeExposures(
        await session(home),
        await listPlugins(home),
      ),
    },
  });
}

export function createResourceClaudeProviderAdapter(
  input: ResourceClaudeProviderAdapterOptions,
): ClaudeProviderAdapter {
  const { session, listPlugins } = createClaudeResourceAccess(input);

  const inventoryMarketplaceRegistration: ClaudeProcessPort["inventoryMarketplaceRegistration"] = async ({ home }) => {
    const provider = await session(home);
    const observation = await provider.listMarketplaces();
    const matches = requireArray(observation.json, "Claude marketplaces")
      .map(parseMarketplaceEntry)
      .filter((entry) => entry.name === input.contentAuthority);
    if (matches.length === 0) return Object.freeze({ kind: "absent" });
    if (matches.length !== 1) throw new Error("Claude managed marketplace identity is ambiguous");
    if (matches[0] === undefined) throw new Error("Claude managed marketplace disappeared during observation");
    const registration = await readMarketplaceSource(
      await provider.readMarketplace({ identity: input.contentAuthority, ...NATIVE_PACKAGE_READ_LIMITS }),
      "claude",
      CLAUDE_ADAPTER_PROTOCOL,
    );
    return Object.freeze({ kind: "present", state: marketplaceState(registration) });
  };

  const setMarketplaceRegistration: ClaudeProcessPort["setMarketplaceRegistration"] = async ({
    home,
    expected,
    registration,
    source,
  }) => {
    const provider = await session(home);
    const current = await inventoryMarketplaceRegistration({ home });
    if (!sameMarketplaceObservation(current, expected)) {
      throw new Error("Claude marketplace changed before exact registration mutation");
    }
    const desired = desiredMarketplace(registration);
    if (sameMarketplaceObservation(current, desired)) return;
    if (current.kind === "present") {
      await provider.removeMarketplace({ identity: input.contentAuthority });
    }
    if (registration !== null) {
      if (source === null
        || source.projectionDigest !== registration.projectionDigest
        || source.sourceDigest !== registration.sourceDigest) {
        throw new Error("Claude marketplace registration has no exact semantic source");
      }
      await provider.addMarketplace(source);
    }
    const post = await inventoryMarketplaceRegistration({ home });
    if (!sameMarketplaceObservation(post, desired)) {
      throw new Error("Claude marketplace registration did not reach its exact post-state");
    }
  };

  const inventoryNativePlugins: ClaudeProcessPort["inventoryNativePlugins"] = async ({ home }) => {
    const provider = await session(home);
    const observations: ClaudeNativePlugin[] = [];
    for (const plugin of (await listPlugins(home)).filter((entry) =>
      entry.marketplaceName === input.contentAuthority)) {
      const inspected = inspectNativePluginPackage(await provider.readPlugin({
        selector: plugin.selector,
        ...NATIVE_PACKAGE_READ_LIMITS,
      }), "claude");
      if (
        inspected.pluginId !== plugin.name
        || inspected.artifactAuthority.contentAuthority !== input.contentAuthority
      ) {
        throw new Error("Claude installed plugin does not match its managed marketplace identity");
      }
      observations.push(Object.freeze({
        pluginId: inspected.pluginId,
        nativeIdentity: inspected.nativeIdentity,
        artifactAuthority: inspected.artifactAuthority,
        providerSourceIdentity: inspected.providerSourceIdentity,
        marketplaceIdentity: inspected.providerSourceIdentity,
        memberFingerprint: inspected.memberFingerprint,
        enablement: plugin.enabled ? "enabled" : "disabled",
        visibleSkills: inspected.visibleSkills,
        visibleHooks: inspected.visibleHooks,
      }));
    }
    return Object.freeze(observations);
  };

  const inventoryStandaloneExposures: ClaudeProcessPort["inventoryStandaloneExposures"] = async ({ home }) => {
    const provider = await session(home);
    const plugins = await listPlugins(home);
    const exposures: NativeStandaloneExposureObservation[] = [];
    for (const plugin of plugins.filter((entry) => entry.marketplaceName !== input.contentAuthority)) {
      const visible = inspectNativePluginVisibility(await provider.readPlugin({
        selector: plugin.selector,
        ...NATIVE_PACKAGE_READ_LIMITS,
      }));
      exposures.push(Object.freeze({
        exposureIdentity: plugin.selector,
        nativeIdentity: `rawr:${plugin.name}`,
        providerSourceIdentity: parseSourceIdentity(plugin.marketplaceName, "claude"),
        enablement: plugin.enabled ? "enabled" : "disabled",
        visibleSkills: visible.visibleSkills,
        visibleHooks: visible.visibleHooks,
      }));
    }
    const installedSelectors = new Set(plugins.map((plugin) => plugin.selector));
    for (const exposure of parseConfiguredPluginExposures(await provider.readConfiguration())) {
      if (!installedSelectors.has(exposure.exposureIdentity)) exposures.push(exposure);
    }
    return Object.freeze(exposures);
  };

  const process: ClaudeProcessPort = {
    probe: async ({ home }) => {
      const observed = await (await session(home)).probe();
      return Object.freeze({
        adapterProtocol: CLAUDE_ADAPTER_PROTOCOL,
        available: claudeCapabilitiesFromCommands(observed.pluginCommands, observed.marketplaceCommands),
      });
    },
    inventoryMarketplaceRegistration,
    setMarketplaceRegistration,
    inventoryNativePlugins,
    inventoryStandaloneExposures,
    installNativePlugin: async (request) => {
      requireManagedRequest(
        request.providerSourceIdentity,
        request.marketplaceIdentity,
        request.artifactAuthority.contentAuthority,
        input.contentAuthority,
        "claude",
      );
      await (await session(request.home)).installPlugin({
        selector: pluginSelector(request.nativeIdentity, input.contentAuthority, "claude"),
      });
    },
    enableNativePlugin: async ({ home, nativeIdentity }) => {
      await (await session(home)).enablePlugin({
        selector: pluginSelector(nativeIdentity, input.contentAuthority, "claude"),
      });
    },
    uninstallNativePlugin: async ({ home, nativeIdentity, providerSourceIdentity }) => {
      if (providerSourceIdentity !== input.contentAuthority) {
        throw new Error("Claude uninstall source does not match the configured content owner");
      }
      await (await session(home)).uninstallPlugin({
        selector: pluginSelector(nativeIdentity, input.contentAuthority, "claude"),
      });
    },
  };

  return createClaudeProviderAdapter({
    process,
    marketplaceSources: input.marketplaceSources,
  });
}

function createClaudeResourceAccess(input: ResourceClaudeProviderObserverOptions): Readonly<{
  session: (home: string) => Promise<ClaudeNativeResourceSession>;
  listPlugins: (home: string) => Promise<readonly ClaudeListPlugin[]>;
}> {
  const acquire = createSessionCache(input.executablePath, input.resource.acquireClaude);
  const session = async (home: string): Promise<ClaudeNativeResourceSession> => {
    const acquired = await acquire(home);
    if (
      acquired.provider !== "claude"
      || acquired.home !== home
      || acquired.executablePath !== input.executablePath
    ) {
      throw new Error("Claude resource returned a session for different explicit authority");
    }
    return acquired;
  };
  const listPlugins = async (home: string): Promise<readonly ClaudeListPlugin[]> => {
    const observation = await (await session(home)).listPlugins();
    const record = requireRecord(observation.json, "Claude plugin list");
    return Object.freeze(requireArray(record.installed, "Claude installed plugins").map(parseListPlugin));
  };
  return Object.freeze({ session, listPlugins });
}

export function claudeCapabilitiesFromCommands(
  pluginCommands: readonly string[],
  marketplaceCommands: readonly string[],
): readonly ProviderCapability[] {
  return capabilitiesFromCommands("claude", pluginCommands, marketplaceCommands);
}

interface ClaudeListPlugin {
  readonly selector: string;
  readonly name: PluginId;
  readonly marketplaceName: string;
  readonly enabled: boolean;
}

function parseListPlugin(input: unknown): ClaudeListPlugin {
  const record = requireRecord(input, "Claude plugin entry");
  const selectorValue = requireString(record.id, "Claude plugin selector");
  const separator = selectorValue.lastIndexOf("@");
  if (separator <= 0 || separator === selectorValue.length - 1) {
    throw new Error("Claude plugin selector is invalid");
  }
  const name = parsePluginId(selectorValue.slice(0, separator), "plugin.name");
  const marketplaceName = selectorValue.slice(separator + 1);
  if (
    !name.ok
    || !/^[a-z0-9][a-z0-9_-]*$/u.test(marketplaceName)
    || typeof record.enabled !== "boolean"
    || record.scope !== "user"
  ) {
    throw new Error("Claude installed plugin entry is invalid");
  }
  return Object.freeze({
    selector: selectorValue,
    name: name.value,
    marketplaceName,
    enabled: record.enabled,
  });
}

function parseMarketplaceEntry(input: unknown): Readonly<{ name: string }> {
  const record = requireRecord(input, "Claude marketplace entry");
  if (typeof record.name !== "string") {
    throw new Error("Claude marketplace entry is invalid");
  }
  return Object.freeze({ name: record.name });
}

function parseConfiguredPluginExposures(
  input: unknown | null,
): readonly NativeStandaloneExposureObservation[] {
  if (input === null) return Object.freeze([]);
  const settings = requireRecord(input, "Claude settings");
  if (settings.enabledPlugins === undefined) return Object.freeze([]);
  const configured = requireRecord(settings.enabledPlugins, "Claude enabled plugin settings");
  return Object.freeze(Object.entries(configured).map(([configuredSelector, enabled]) => {
    const separator = configuredSelector.lastIndexOf("@");
    const pluginId = parsePluginId(configuredSelector.slice(0, separator), "settings.enabledPlugins.pluginId");
    if (
      separator <= 0
      || separator === configuredSelector.length - 1
      || !pluginId.ok
      || typeof enabled !== "boolean"
    ) {
      throw new Error("Claude configured plugin entry is invalid");
    }
    return Object.freeze({
      exposureIdentity: configuredSelector,
      nativeIdentity: `rawr:${pluginId.value}`,
      providerSourceIdentity: parseSourceIdentity(configuredSelector.slice(separator + 1), "claude"),
      enablement: enabled ? "enabled" as const : "disabled" as const,
      visibleSkills: Object.freeze([]),
      visibleHooks: Object.freeze([]),
    });
  }));
}

async function inventoryClaudeExposures(
  provider: ClaudeNativeResourceSession,
  plugins: readonly ClaudeListPlugin[],
): Promise<readonly NativeStandaloneExposureObservation[]> {
  const exposures = new Map<string, NativeStandaloneExposureObservation>();
  for (const plugin of plugins) {
    const visible = inspectNativePluginVisibility(await provider.readPlugin({
      selector: plugin.selector,
      ...NATIVE_PACKAGE_READ_LIMITS,
    }));
    exposures.set(plugin.selector, Object.freeze({
      exposureIdentity: plugin.selector,
      nativeIdentity: `rawr:${plugin.name}`,
      providerSourceIdentity: parseSourceIdentity(plugin.marketplaceName, "claude"),
      enablement: plugin.enabled ? "enabled" : "disabled",
      visibleSkills: visible.visibleSkills,
      visibleHooks: visible.visibleHooks,
    }));
  }
  for (const configured of parseConfiguredPluginExposures(await provider.readConfiguration())) {
    const installed = exposures.get(configured.exposureIdentity);
    if (installed !== undefined && (
      installed.nativeIdentity !== configured.nativeIdentity
      || installed.providerSourceIdentity !== configured.providerSourceIdentity
    )) {
      throw new Error(`Claude exposure identity changed across observations for ${configured.exposureIdentity}`);
    }
    exposures.set(configured.exposureIdentity, Object.freeze({
      ...configured,
      visibleSkills: installed?.visibleSkills ?? configured.visibleSkills,
      visibleHooks: installed?.visibleHooks ?? configured.visibleHooks,
    }));
  }
  return Object.freeze([...exposures.values()]);
}

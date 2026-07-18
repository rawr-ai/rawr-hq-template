import {
  parsePluginId,
  type ContentAuthority,
  type PluginId,
} from "../../service/shared/release";
import {
  marketplaceState,
  type ProviderMarketplaceObservation,
} from "../../service/modules/providers/model/policy/marketplace";
import type {
  ProviderCapability,
} from "../../service/modules/providers/model/policy/projection";
import type { NativeStandaloneExposureObservation } from "../../service/modules/providers/model/policy/state-machine";
import type { ProviderMarketplaceSourceReader } from "../../service/modules/providers/ports/state";
import {
  CODEX_ADAPTER_PROTOCOL,
  createCodexProviderAdapter,
  type CodexAppServerPort,
  type CodexConfiguredPlugin,
  type CodexMarketplacePlugin,
  type CodexProcessPort,
  type CodexProviderAdapter,
  type CodexSessionPort,
  type CodexVisiblePlugin,
} from "./codex";
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
  CodexNativeResourceSession,
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

export interface ResourceCodexProviderAdapterOptions {
  readonly resource: NativeProviderResourcePort;
  readonly executablePath: string;
  readonly contentAuthority: ContentAuthority;
  readonly marketplaceSources: ProviderMarketplaceSourceReader;
}

export type ResourceCodexProviderObserverOptions = Pick<
  ResourceCodexProviderAdapterOptions,
  "executablePath" | "resource"
>;

export function createResourceCodexProviderObserver(
  input: ResourceCodexProviderObserverOptions,
): NativeProviderObserver {
  const { session, listPlugins } = createCodexResourceAccess(input);
  return createNativeProviderObserver({
    provider: "codex",
    adapterProtocol: CODEX_ADAPTER_PROTOCOL,
    bridge: {
      probe: async (home) => {
        const observed = await (await session(home)).probe();
        return Object.freeze({
          adapterProtocol: CODEX_ADAPTER_PROTOCOL,
          available: codexCapabilitiesFromCommands(observed.pluginCommands, observed.marketplaceCommands),
        });
      },
      inventoryExposures: async (home) => await inventoryCodexExposures(
        await session(home),
        await listPlugins(home),
        home,
      ),
    },
  });
}

export function createResourceCodexProviderAdapter(
  input: ResourceCodexProviderAdapterOptions,
): CodexProviderAdapter {
  const { session, listPlugins } = createCodexResourceAccess(input);

  const inventoryMarketplaceRegistration: CodexProcessPort["inventoryMarketplaceRegistration"] = async ({ home }) => {
    const provider = await session(home);
    const observation = await provider.listMarketplaces();
    const record = requireRecord(observation.json, "Codex marketplace list");
    const matches = requireArray(record.marketplaces, "Codex marketplaces")
      .map(parseMarketplaceEntry)
      .filter((entry) => entry.name === input.contentAuthority);
    if (matches.length === 0) return Object.freeze({ kind: "absent" });
    if (matches.length !== 1) throw new Error("Codex managed marketplace identity is ambiguous");
    if (matches[0] === undefined) throw new Error("Codex managed marketplace disappeared during observation");
    const registration = await readMarketplaceSource(
      await provider.readMarketplace({ identity: input.contentAuthority, ...NATIVE_PACKAGE_READ_LIMITS }),
      "codex",
      CODEX_ADAPTER_PROTOCOL,
    );
    return Object.freeze({ kind: "present", state: marketplaceState(registration) });
  };

  const setMarketplaceRegistration: CodexProcessPort["setMarketplaceRegistration"] = async ({
    home,
    prior,
    registration,
    source,
  }) => {
    const provider = await session(home);
    const current = await inventoryMarketplaceRegistration({ home });
    if (!sameMarketplaceObservation(current, prior)) {
      throw new Error("Codex marketplace changed before exact registration mutation");
    }
    const desired = desiredMarketplace(registration);
    if (sameMarketplaceObservation(current, desired)) return;
    if (current.kind === "present" && registration === null) {
      await provider.removeMarketplace({ identity: input.contentAuthority });
    }
    if (registration !== null) {
      if (source === null
        || source.projectionDigest !== registration.projectionDigest
        || source.sourceDigest !== registration.sourceDigest) {
        throw new Error("Codex marketplace registration has no exact semantic source");
      }
      if (current.kind === "present") {
        await provider.setMarketplaceSource({ identity: input.contentAuthority, source });
      } else {
        await provider.addMarketplace(source);
      }
    }
    const post = await inventoryMarketplaceRegistration({ home });
    if (!sameMarketplaceObservation(post, desired)) {
      throw new Error("Codex marketplace registration did not reach its exact post-state");
    }
  };

  const inventoryMarketplace: CodexProcessPort["inventoryMarketplace"] = async ({ home }) => {
    const provider = await session(home);
    const observations: CodexMarketplacePlugin[] = [];
    for (const plugin of (await listPlugins(home)).filter((entry) =>
      entry.installed && entry.marketplaceName === input.contentAuthority)) {
      const inspected = inspectNativePluginPackage(await provider.readPlugin({
        selector: pluginSelectorFor(plugin),
        ...NATIVE_PACKAGE_READ_LIMITS,
      }), "codex");
      if (
        inspected.pluginId !== plugin.name
        || inspected.artifactAuthority.contentAuthority !== input.contentAuthority
      ) {
        throw new Error("Codex installed plugin does not match its managed marketplace identity");
      }
      observations.push(Object.freeze({
        pluginId: inspected.pluginId,
        nativeIdentity: inspected.nativeIdentity,
        artifactAuthority: inspected.artifactAuthority,
        providerSourceIdentity: inspected.providerSourceIdentity,
        marketplaceIdentity: inspected.providerSourceIdentity,
        memberFingerprint: inspected.memberFingerprint,
      }));
    }
    return Object.freeze(observations);
  };

  const process: CodexProcessPort = {
    probe: async ({ home }) => {
      const observed = await (await session(home)).probe();
      return Object.freeze({
        adapterProtocol: CODEX_ADAPTER_PROTOCOL,
        available: codexCapabilitiesFromCommands(observed.pluginCommands, observed.marketplaceCommands),
      });
    },
    inventoryMarketplaceRegistration,
    setMarketplaceRegistration,
    inventoryMarketplace,
    installMarketplacePlugin: async (request) => {
      requireManagedRequest(
        request.providerSourceIdentity,
        request.marketplaceIdentity,
        request.artifactAuthority.contentAuthority,
        input.contentAuthority,
        "codex",
      );
      await (await session(request.home)).addPlugin({
        selector: pluginSelector(request.nativeIdentity, input.contentAuthority, "codex"),
      });
    },
    enableMarketplacePlugin: async ({ home, nativeIdentity }) => {
      await (await session(home)).addPlugin({
        selector: pluginSelector(nativeIdentity, input.contentAuthority, "codex"),
      });
    },
    disableMarketplacePlugin: async ({ home, nativeIdentity }) => {
      await (await session(home)).setPluginEnabled({
        selector: pluginSelector(nativeIdentity, input.contentAuthority, "codex"),
        enabled: false,
      });
    },
    uninstallMarketplacePlugin: async ({ home, nativeIdentity, providerSourceIdentity, marketplaceIdentity }) => {
      requireManagedRequest(
        providerSourceIdentity,
        marketplaceIdentity,
        providerSourceIdentity,
        input.contentAuthority,
        "codex",
      );
      await (await session(home)).removePlugin({
        selector: pluginSelector(nativeIdentity, input.contentAuthority, "codex"),
      });
    },
  };

  const appServer: CodexAppServerPort = {
    inspectVisiblePlugins: async ({ home }) => {
      const provider = await session(home);
      const observation = await provider.inspectAppServer();
      const plugins = parseAppServerPlugins(observation.plugins).filter((entry) => entry.installed);
      const hooksByPlugin = parseAppServerHooks(observation.hooks, home, plugins);
      const visible: CodexVisiblePlugin[] = [];
      for (const plugin of plugins) {
        const packageVisibility = inspectNativePluginVisibility(await provider.readPlugin({
          selector: pluginSelectorFor(plugin),
          ...NATIVE_PACKAGE_READ_LIMITS,
        }));
        visible.push(Object.freeze({
          nativeIdentity: `rawr:${plugin.name}`,
          providerSourceIdentity: parseSourceIdentity(plugin.marketplaceName, "codex"),
          visibleSkills: packageVisibility.visibleSkills,
          visibleHooks: hooksByPlugin.get(pluginSelectorFor(plugin)) ?? Object.freeze([]),
        }));
      }
      return Object.freeze(visible);
    },
  };

  const configured: CodexSessionPort = {
    inspectConfiguredPlugins: async ({ home }) => parseAppServerPluginConfiguration(
      await (await session(home)).readConfiguration(),
    ),
  };

  return createCodexProviderAdapter({
    process,
    appServer,
    session: configured,
    marketplaceSources: input.marketplaceSources,
  });
}

function createCodexResourceAccess(input: ResourceCodexProviderObserverOptions): Readonly<{
  session: (home: string) => Promise<CodexNativeResourceSession>;
  listPlugins: (home: string) => Promise<readonly CodexListPlugin[]>;
}> {
  const acquire = createSessionCache(input.executablePath, input.resource.acquireCodex);
  const session = async (home: string): Promise<CodexNativeResourceSession> => {
    const acquired = await acquire(home);
    if (
      acquired.provider !== "codex"
      || acquired.home !== home
      || acquired.executablePath !== input.executablePath
    ) {
      throw new Error("Codex resource returned a session for different explicit authority");
    }
    return acquired;
  };
  const listPlugins = async (home: string): Promise<readonly CodexListPlugin[]> => {
    const observation = await (await session(home)).listPlugins();
    const record = requireRecord(observation.json, "Codex plugin list");
    return Object.freeze([
      ...requireArray(record.installed, "Codex installed plugins"),
      ...requireArray(record.available, "Codex available plugins"),
    ].map(parseListPlugin));
  };
  return Object.freeze({ session, listPlugins });
}

export function codexCapabilitiesFromCommands(
  pluginCommands: readonly string[],
  marketplaceCommands: readonly string[],
): readonly ProviderCapability[] {
  return capabilitiesFromCommands("codex", pluginCommands, marketplaceCommands);
}

interface CodexListPlugin {
  readonly name: PluginId;
  readonly marketplaceName: string;
  readonly version: string;
  readonly installed: boolean;
  readonly enabled: boolean;
}

function parseListPlugin(input: unknown): CodexListPlugin {
  const record = requireRecord(input, "Codex plugin entry");
  const name = parsePluginId(record.name, "plugin.name");
  if (
    !name.ok
    || typeof record.marketplaceName !== "string"
    || !/^[a-z0-9][a-z0-9_-]*$/u.test(record.marketplaceName)
    || typeof record.version !== "string"
    || !/^[0-9A-Za-z][0-9A-Za-z.+-]*$/u.test(record.version)
    || typeof record.installed !== "boolean"
    || typeof record.enabled !== "boolean"
  ) {
    throw new Error("Codex plugin entry is invalid");
  }
  return Object.freeze({
    name: name.value,
    marketplaceName: record.marketplaceName,
    version: record.version,
    installed: record.installed,
    enabled: record.enabled,
  });
}

function parseMarketplaceEntry(input: unknown): Readonly<{ name: string }> {
  const record = requireRecord(input, "Codex marketplace entry");
  if (typeof record.name !== "string") {
    throw new Error("Codex marketplace entry is invalid");
  }
  return Object.freeze({ name: record.name });
}

function parseAppServerPlugins(input: unknown): readonly CodexListPlugin[] {
  const record = requireRecord(input, "Codex app-server plugin response");
  const plugins: CodexListPlugin[] = [];
  for (const marketplaceInput of requireArray(record.marketplaces, "Codex app-server marketplaces")) {
    const marketplace = requireRecord(marketplaceInput, "Codex app-server marketplace");
    const marketplaceName = requireString(marketplace.name, "Codex app-server marketplace name");
    for (const pluginInput of requireArray(marketplace.plugins, "Codex app-server plugins")) {
      const plugin = requireRecord(pluginInput, "Codex app-server plugin");
      const name = parsePluginId(plugin.name, "appServer.plugin.name");
      if (!name.ok || typeof plugin.installed !== "boolean" || typeof plugin.enabled !== "boolean") {
        throw new Error("Codex app-server plugin is invalid");
      }
      const version = plugin.localVersion ?? plugin.version;
      if (typeof version !== "string") throw new Error("Codex app-server installed plugin has no version");
      plugins.push(Object.freeze({
        name: name.value,
        marketplaceName,
        version,
        installed: plugin.installed,
        enabled: plugin.enabled,
      }));
    }
  }
  return Object.freeze(plugins);
}

function parseAppServerHooks(
  input: unknown,
  home: string,
  plugins: readonly CodexListPlugin[],
): ReadonlyMap<string, readonly string[]> {
  const response = requireRecord(input, "Codex app-server hook response");
  const data = requireArray(response.data, "Codex app-server hook inventories");
  if (data.length !== 1) throw new Error("Codex app-server returned an ambiguous hook inventory");
  const inventory = requireRecord(data[0], "Codex app-server hook inventory");
  if (requireString(inventory.cwd, "Codex app-server hook inventory cwd") !== home) {
    throw new Error("Codex app-server hook inventory belongs to a different provider home");
  }
  const errors = inventory.errors === undefined
    ? Object.freeze([])
    : requireArray(inventory.errors, "Codex app-server hook inventory errors");
  if (errors.length > 0) throw new Error("Codex app-server hook inventory is incomplete");

  const hooksByPlugin = new Map<string, Set<string>>();
  for (const plugin of plugins) {
    const selector = pluginSelectorFor(plugin);
    if (hooksByPlugin.has(selector)) {
      throw new Error("Codex app-server plugin identity is ambiguous for hook attribution");
    }
    hooksByPlugin.set(selector, new Set());
  }
  for (const inputHook of requireArray(inventory.hooks, "Codex app-server hooks")) {
    const hook = requireRecord(inputHook, "Codex app-server hook");
    const source = requireString(hook.source, "Codex app-server hook source");
    if (source !== "plugin") continue;
    const selector = requireString(hook.pluginId, "Codex app-server hook plugin identity");
    const attributed = hooksByPlugin.get(selector);
    if (attributed === undefined) {
      throw new Error("Codex app-server hook cannot be attributed to an installed plugin");
    }
    if (typeof hook.enabled !== "boolean") {
      throw new Error("Codex app-server hook enablement is invalid");
    }
    if (hook.enabled) {
      attributed.add(hookClaimFromEventName(requireString(
        hook.eventName,
        "Codex app-server hook event name",
      )));
    }
  }
  return new Map([...hooksByPlugin].map(([selector, names]) => [
    selector,
    Object.freeze([...names].sort(compareText)),
  ]));
}

function hookClaimFromEventName(value: string): string {
  if (!/^[a-z][A-Za-z0-9]*$/u.test(value)) {
    throw new Error("Codex app-server hook event name is not canonical camel case");
  }
  return value.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
}

function parseAppServerPluginConfiguration(input: unknown): readonly CodexConfiguredPlugin[] {
  const response = requireRecord(input, "Codex config response");
  const config = requireRecord(response.config, "Codex effective config");
  if (config.plugins === undefined) return Object.freeze([]);
  const plugins = requireRecord(config.plugins, "Codex configured plugins");
  return Object.freeze(Object.entries(plugins).map(([selector, value]) => {
    const separator = selector.lastIndexOf("@");
    const pluginId = parsePluginId(selector.slice(0, separator), "config.plugins.pluginId");
    const entry = requireRecord(value, `Codex configured plugin ${selector}`);
    if (
      separator <= 0
      || separator === selector.length - 1
      || !pluginId.ok
      || typeof entry.enabled !== "boolean"
    ) {
      throw new Error("Codex configured plugin entry is invalid");
    }
    return Object.freeze({
      nativeIdentity: `rawr:${pluginId.value}`,
      providerSourceIdentity: parseSourceIdentity(selector.slice(separator + 1), "codex"),
      enablement: entry.enabled ? "enabled" as const : "disabled" as const,
    });
  }));
}

async function inventoryCodexExposures(
  provider: CodexNativeResourceSession,
  listed: readonly CodexListPlugin[],
  home: string,
): Promise<readonly NativeStandaloneExposureObservation[]> {
  const [appServer, configuredInput] = await Promise.all([
    provider.inspectAppServer(),
    provider.readConfiguration(),
  ]);
  const appPlugins = parseAppServerPlugins(appServer.plugins).filter((plugin) => plugin.installed);
  const hooksBySelector = parseAppServerHooks(appServer.hooks, home, appPlugins);
  const exposures = new Map<string, NativeStandaloneExposureObservation>();

  for (const plugin of listed.filter((entry) => entry.installed)) {
    recordCodexExposure(exposures, {
      exposureIdentity: pluginSelectorFor(plugin),
      nativeIdentity: `rawr:${plugin.name}`,
      providerSourceIdentity: parseSourceIdentity(plugin.marketplaceName, "codex"),
      enablement: plugin.enabled ? "enabled" : "disabled",
      visibleSkills: Object.freeze([]),
      visibleHooks: Object.freeze([]),
    });
  }
  for (const plugin of appPlugins) {
    const selector = pluginSelectorFor(plugin);
    recordCodexExposure(exposures, {
      exposureIdentity: selector,
      nativeIdentity: `rawr:${plugin.name}`,
      providerSourceIdentity: parseSourceIdentity(plugin.marketplaceName, "codex"),
      enablement: plugin.enabled ? "enabled" : "disabled",
      visibleSkills: Object.freeze([]),
      visibleHooks: hooksBySelector.get(selector) ?? Object.freeze([]),
    });
  }
  for (const configured of parseAppServerPluginConfiguration(configuredInput)) {
    recordCodexExposure(exposures, {
      exposureIdentity: selectorFromConfiguredPlugin(configured),
      nativeIdentity: configured.nativeIdentity,
      providerSourceIdentity: configured.providerSourceIdentity,
      enablement: configured.enablement,
      visibleSkills: Object.freeze([]),
      visibleHooks: Object.freeze([]),
    });
  }
  return Object.freeze([...exposures.values()]);
}

function recordCodexExposure(
  exposures: Map<string, NativeStandaloneExposureObservation>,
  candidate: NativeStandaloneExposureObservation,
): void {
  const prior = exposures.get(candidate.exposureIdentity);
  if (prior !== undefined && (
    prior.nativeIdentity !== candidate.nativeIdentity
    || prior.providerSourceIdentity !== candidate.providerSourceIdentity
  )) {
    throw new Error(`Codex exposure identity changed across observations for ${candidate.exposureIdentity}`);
  }
  exposures.set(candidate.exposureIdentity, Object.freeze({
    ...candidate,
    visibleSkills: mergeNames(prior?.visibleSkills ?? Object.freeze([]), candidate.visibleSkills),
    visibleHooks: mergeNames(prior?.visibleHooks ?? Object.freeze([]), candidate.visibleHooks),
  }));
}

function selectorFromConfiguredPlugin(plugin: CodexConfiguredPlugin): string {
  if (!plugin.nativeIdentity.startsWith("rawr:")) {
    throw new Error("Codex configured plugin has no canonical native identity");
  }
  return `${plugin.nativeIdentity.slice("rawr:".length)}@${plugin.providerSourceIdentity}`;
}

function mergeNames(left: readonly string[], right: readonly string[]): readonly string[] {
  return Object.freeze([...new Set([...left, ...right])].sort(compareText));
}

function pluginSelectorFor(plugin: CodexListPlugin): string {
  return `${plugin.name}@${plugin.marketplaceName}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

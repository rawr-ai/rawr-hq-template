import path from "node:path";

import {
  parseContentAuthority,
  parsePluginId,
  type ContentAuthority,
  type PluginId,
} from "@rawr/agent-plugin-release";

import {
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "../domain/marketplace";
import type { ProviderCapability, ProviderSourceIdentity } from "../domain/projection";
import type { ProviderMarketplaceSourceReader } from "../ports/state";
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
import type { StableProjectionSourceReader } from "./native";
import { createNodeCodexAppServerClient } from "./node-codex-app-server";
import { readNodeMarketplaceSource } from "./node-marketplace-source";
import {
  inspectNodeNativePluginPackage,
  inspectNodePluginVisibility,
} from "./node-plugin-package";
import {
  createNodeProviderCommandRunner,
  parseProviderJson,
  parseProviderHelpCommands,
  requireContainedProviderPath,
} from "./node-process";

export function createNodeCodexProviderAdapter(input: Readonly<{
  executablePath: string;
  marketplaceSourceRoot: string;
  contentAuthority: ContentAuthority;
  marketplaceSources: ProviderMarketplaceSourceReader;
  projectionSources: StableProjectionSourceReader;
}>): CodexProviderAdapter {
  const ports = createNodeCodexPorts(input);
  return createCodexProviderAdapter({
    ...ports,
    marketplaceSources: input.marketplaceSources,
    projectionSources: input.projectionSources,
  });
}

export function createNodeCodexPorts(input: Readonly<{
  executablePath: string;
  marketplaceSourceRoot: string;
  contentAuthority: ContentAuthority;
}>): Readonly<{
  process: CodexProcessPort;
  appServer: CodexAppServerPort;
  session: CodexSessionPort;
}> {
  const runner = createNodeProviderCommandRunner({
    executablePath: input.executablePath,
    provider: "codex",
  });
  const appServer = createNodeCodexAppServerClient(input.executablePath);

  const listPlugins = async (home: string): Promise<readonly CodexListPlugin[]> => {
    const result = await runner.run(home, ["plugin", "list", "--available", "--json"]);
    const record = requireRecord(parseProviderJson(result.stdout, "Codex plugin list"), "Codex plugin list");
    const installed = requireArray(record.installed, "Codex installed plugins");
    const available = requireArray(record.available, "Codex available plugins");
    return Object.freeze([...installed, ...available].map(parseListPlugin));
  };

  const inventoryMarketplaceRegistration: CodexProcessPort["inventoryMarketplaceRegistration"] = async ({ home }) => {
    const result = await runner.run(home, ["plugin", "marketplace", "list", "--json"]);
    const record = requireRecord(parseProviderJson(result.stdout, "Codex marketplace list"), "Codex marketplace list");
    const matches = requireArray(record.marketplaces, "Codex marketplaces")
      .map(parseMarketplaceEntry)
      .filter((entry) => entry.name === input.contentAuthority);
    if (matches.length === 0) return Object.freeze({ kind: "absent" });
    if (matches.length !== 1) throw new Error("Codex managed marketplace identity is ambiguous");
    const registration = await readNodeMarketplaceSource({
      allowedRoot: input.marketplaceSourceRoot,
      sourcePath: matches[0]!.root,
      provider: "codex",
      adapterProtocol: CODEX_ADAPTER_PROTOCOL,
    });
    return Object.freeze({ kind: "present", state: marketplaceState(registration) });
  };

  const setMarketplaceRegistration: CodexProcessPort["setMarketplaceRegistration"] = async ({
    home,
    prior,
    registration,
    sourcePath,
  }) => {
    const current = await inventoryMarketplaceRegistration({ home });
    if (!sameMarketplaceObservation(current, prior)) {
      throw new Error("Codex marketplace changed before exact registration mutation");
    }
    const desired = registration === null
      ? Object.freeze({ kind: "absent" as const })
      : Object.freeze({ kind: "present" as const, state: marketplaceState(registration) });
    if (sameMarketplaceObservation(current, desired)) return;
    if (current.kind === "present" && registration === null) {
      await runner.run(home, [
        "plugin",
        "marketplace",
        "remove",
        input.contentAuthority,
        "--json",
      ]);
    }
    if (registration !== null) {
      if (sourcePath === null) throw new Error("Codex marketplace registration has no stable source");
      const verified = await readNodeMarketplaceSource({
        allowedRoot: input.marketplaceSourceRoot,
        sourcePath,
        provider: "codex",
        adapterProtocol: CODEX_ADAPTER_PROTOCOL,
      });
      if (!sameRegistration(verified, registration)) {
        throw new Error("Codex marketplace source changed before registration");
      }
      if (current.kind === "present") {
        await appServer.setMarketplaceSource(home, input.contentAuthority, sourcePath);
      } else {
        await runner.run(home, ["plugin", "marketplace", "add", sourcePath, "--json"]);
      }
    }
    const post = await inventoryMarketplaceRegistration({ home });
    if (!sameMarketplaceObservation(post, desired)) {
      throw new Error("Codex marketplace registration did not reach its exact post-state");
    }
  };

  const inventoryMarketplace: CodexProcessPort["inventoryMarketplace"] = async ({ home }) => {
    const plugins = await listPlugins(home);
    const managed = plugins.filter((plugin) =>
      plugin.installed && plugin.marketplaceName === input.contentAuthority);
    const observations: CodexMarketplacePlugin[] = [];
    for (const plugin of managed) {
      const packageRoot = await installedPackageRoot(home, plugin);
      const inspected = await inspectNodeNativePluginPackage(packageRoot, "codex");
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

  const addPlugin = async (home: string, nativeIdentity: string): Promise<void> => {
    const pluginId = pluginIdFromNativeIdentity(nativeIdentity);
    await runner.run(home, [
      "plugin",
      "add",
      `${pluginId}@${input.contentAuthority}`,
      "--json",
    ]);
  };

  const process: CodexProcessPort = {
    probe: async ({ home }) => {
      const [pluginHelp, marketplaceHelp] = await Promise.all([
        runner.run(home, ["plugin", "--help"]),
        runner.run(home, ["plugin", "marketplace", "--help"]),
        appServer.inspect(home),
      ]);
      return Object.freeze({
        adapterProtocol: CODEX_ADAPTER_PROTOCOL,
        available: codexCapabilitiesFromHelp(pluginHelp.stdout, marketplaceHelp.stdout),
      });
    },
    inventoryMarketplaceRegistration,
    setMarketplaceRegistration,
    inventoryMarketplace,
    installMarketplacePlugin: async (request) => {
      requireManagedRequest(request.providerSourceIdentity, request.marketplaceIdentity, request.artifactAuthority.contentAuthority, input.contentAuthority);
      await addPlugin(request.home, request.nativeIdentity);
    },
    enableMarketplacePlugin: async ({ home, nativeIdentity }) => await addPlugin(home, nativeIdentity),
    disableMarketplacePlugin: async ({ home, nativeIdentity }) => {
      const pluginId = pluginIdFromNativeIdentity(nativeIdentity);
      await appServer.setPluginEnabled(home, `${pluginId}@${input.contentAuthority}`, false);
    },
    uninstallMarketplacePlugin: async ({ home, nativeIdentity, providerSourceIdentity, marketplaceIdentity }) => {
      requireManagedRequest(providerSourceIdentity, marketplaceIdentity, providerSourceIdentity, input.contentAuthority);
      const pluginId = pluginIdFromNativeIdentity(nativeIdentity);
      await runner.run(home, [
        "plugin",
        "remove",
        `${pluginId}@${input.contentAuthority}`,
        "--json",
      ]);
    },
  };

  const codexAppServer: CodexAppServerPort = {
    inspectVisiblePlugins: async ({ home }) => {
      const observation = await appServer.inspect(home);
      const plugins = parseAppServerPlugins(observation.plugins);
      const visible: CodexVisiblePlugin[] = [];
      for (const plugin of plugins.filter((entry) => entry.installed)) {
        const packageRoot = await installedPackageRoot(home, plugin);
        const packageVisibility = await inspectNodePluginVisibility(packageRoot);
        visible.push(Object.freeze({
          nativeIdentity: `rawr:${plugin.name}`,
          providerSourceIdentity: parseSourceIdentity(plugin.marketplaceName),
          visibleSkills: packageVisibility.visibleSkills,
          visibleHooks: packageVisibility.visibleHooks,
        }));
      }
      return Object.freeze(visible);
    },
  };

  const session: CodexSessionPort = {
    inspectConfiguredPlugins: async ({ home }) => parseAppServerPluginConfiguration(
      await appServer.inspectPluginConfiguration(home),
    ),
  };

  return Object.freeze({
    process: Object.freeze(process),
    appServer: Object.freeze(codexAppServer),
    session: Object.freeze(session),
  });
}

export function codexCapabilitiesFromHelp(
  pluginHelp: string,
  marketplaceHelp: string,
): readonly ProviderCapability[] {
  const plugin = parseProviderHelpCommands(pluginHelp);
  const marketplace = parseProviderHelpCommands(marketplaceHelp);
  const available = new Set<ProviderCapability>();
  if (plugin.has("list")) {
    available.add("visible-hook-inventory");
    available.add("visible-plugin-inventory");
    available.add("visible-skill-inventory");
  }
  if (plugin.has("add") && marketplace.has("add") && marketplace.has("list")) {
    available.add("native-plugin-install");
  }
  if (plugin.has("add") && plugin.has("list")) available.add("native-plugin-enable");
  if (plugin.has("remove") && marketplace.has("remove") && marketplace.has("list")) {
    available.add("managed-retire");
  }
  return Object.freeze([...available].sort());
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

function parseMarketplaceEntry(input: unknown): Readonly<{ name: string; root: string }> {
  const record = requireRecord(input, "Codex marketplace entry");
  if (typeof record.name !== "string" || typeof record.root !== "string" || !path.isAbsolute(record.root)) {
    throw new Error("Codex marketplace entry is invalid");
  }
  return Object.freeze({ name: record.name, root: path.normalize(record.root) });
}

function parseAppServerPlugins(input: unknown): readonly CodexListPlugin[] {
  const record = requireRecord(input, "Codex app-server plugin response");
  const marketplaces = requireArray(record.marketplaces, "Codex app-server marketplaces");
  const plugins: CodexListPlugin[] = [];
  for (const marketplaceInput of marketplaces) {
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
      providerSourceIdentity: parseSourceIdentity(selector.slice(separator + 1)),
      enablement: entry.enabled ? "enabled" as const : "disabled" as const,
    });
  }));
}

async function installedPackageRoot(home: string, plugin: CodexListPlugin): Promise<string> {
  const candidate = path.join(
    home,
    "plugins",
    "cache",
    plugin.marketplaceName,
    plugin.name,
    plugin.version,
  );
  return await requireContainedProviderPath(home, candidate, "Codex installed plugin cache");
}

function pluginIdFromNativeIdentity(nativeIdentity: string): PluginId {
  if (!nativeIdentity.startsWith("rawr:")) throw new Error("Codex native identity is invalid");
  const parsed = parsePluginId(nativeIdentity.slice("rawr:".length), "nativeIdentity");
  if (!parsed.ok) throw new Error("Codex native identity has no canonical plugin ID");
  return parsed.value;
}

function parseSourceIdentity(value: string): ProviderSourceIdentity {
  const parsed = parseContentAuthority(value, "marketplaceName");
  if (!parsed.ok) throw new Error("Codex marketplace name is not a canonical source identity");
  return parsed.value;
}

function requireManagedRequest(
  source: ProviderSourceIdentity,
  marketplace: string,
  authority: string,
  expected: ContentAuthority,
): void {
  if (source !== expected || marketplace !== expected || authority !== expected) {
    throw new Error("Codex mutation authority does not match the configured content owner");
  }
}

function sameMarketplaceObservation(
  left: ProviderMarketplaceObservation,
  right: ProviderMarketplaceObservation,
): boolean {
  return left.kind === "absent"
    ? right.kind === "absent"
    : right.kind === "present" && sameMarketplaceState(left.state, right.state);
}

function sameRegistration(
  left: ProviderMarketplaceRegistration,
  right: ProviderMarketplaceRegistration,
): boolean {
  return sameMarketplaceState(left, right)
    && JSON.stringify(left.members) === JSON.stringify(right.members);
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a string`);
  return value;
}

import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import {
  parseContentAuthority,
  parsePluginId,
  type ContentAuthority,
  type PluginId,
} from "@rawr/agent-plugin-lifecycle/release";

import {
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { ProviderCapability, ProviderSourceIdentity } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { NativeStandaloneExposureObservation } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { ProviderMarketplaceSourceReader } from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  CLAUDE_ADAPTER_PROTOCOL,
  createClaudeProviderAdapter,
  type ClaudeNativePlugin,
  type ClaudeProcessPort,
  type ClaudeProviderAdapter,
} from "./claude";
import type { StableProjectionSourceReader } from "./native";
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

export function createNodeClaudeProviderAdapter(input: Readonly<{
  executablePath: string;
  marketplaceSourceRoot: string;
  contentAuthority: ContentAuthority;
  marketplaceSources: ProviderMarketplaceSourceReader;
  projectionSources: StableProjectionSourceReader;
}>): ClaudeProviderAdapter {
  return createClaudeProviderAdapter({
    process: createNodeClaudeProcessPort(input),
    marketplaceSources: input.marketplaceSources,
    projectionSources: input.projectionSources,
  });
}

export function createNodeClaudeProcessPort(input: Readonly<{
  executablePath: string;
  marketplaceSourceRoot: string;
  contentAuthority: ContentAuthority;
}>): ClaudeProcessPort {
  const runner = createNodeProviderCommandRunner({
    executablePath: input.executablePath,
    provider: "claude",
  });

  const listPlugins = async (home: string): Promise<readonly ClaudeListPlugin[]> => {
    const result = await runner.run(home, ["plugin", "list", "--available", "--json"]);
    const record = requireRecord(parseProviderJson(result.stdout, "Claude plugin list"), "Claude plugin list");
    return Object.freeze(requireArray(record.installed, "Claude installed plugins").map(parseListPlugin));
  };

  const inventoryMarketplaceRegistration: ClaudeProcessPort["inventoryMarketplaceRegistration"] = async ({ home }) => {
    const result = await runner.run(home, ["plugin", "marketplace", "list", "--json"]);
    const matches = requireArray(parseProviderJson(result.stdout, "Claude marketplace list"), "Claude marketplaces")
      .map(parseMarketplaceEntry)
      .filter((entry) => entry.name === input.contentAuthority);
    if (matches.length === 0) return Object.freeze({ kind: "absent" });
    if (matches.length !== 1) throw new Error("Claude managed marketplace identity is ambiguous");
    const registration = await readNodeMarketplaceSource({
      allowedRoot: input.marketplaceSourceRoot,
      sourcePath: matches[0]!.path,
      provider: "claude",
      adapterProtocol: CLAUDE_ADAPTER_PROTOCOL,
    });
    return Object.freeze({ kind: "present", state: marketplaceState(registration) });
  };

  const setMarketplaceRegistration: ClaudeProcessPort["setMarketplaceRegistration"] = async ({
    home,
    prior,
    registration,
    sourcePath,
  }) => {
    const current = await inventoryMarketplaceRegistration({ home });
    if (!sameMarketplaceObservation(current, prior)) {
      throw new Error("Claude marketplace changed before exact registration mutation");
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
        "--scope",
        "user",
      ]);
    }
    if (registration !== null) {
      if (sourcePath === null) throw new Error("Claude marketplace registration has no stable source");
      const verified = await readNodeMarketplaceSource({
        allowedRoot: input.marketplaceSourceRoot,
        sourcePath,
        provider: "claude",
        adapterProtocol: CLAUDE_ADAPTER_PROTOCOL,
      });
      if (!sameRegistration(verified, registration)) {
        throw new Error("Claude marketplace source changed before registration");
      }
      await runner.run(home, [
        "plugin",
        "marketplace",
        "add",
        sourcePath,
        "--scope",
        "user",
      ]);
    }
    const post = await inventoryMarketplaceRegistration({ home });
    if (!sameMarketplaceObservation(post, desired)) {
      throw new Error("Claude marketplace registration did not reach its exact post-state");
    }
  };

  const process: ClaudeProcessPort = {
    probe: async ({ home }) => {
      const [pluginHelp, marketplaceHelp] = await Promise.all([
        runner.run(home, ["plugin", "--help"]),
        runner.run(home, ["plugin", "marketplace", "--help"]),
      ]);
      return Object.freeze({
        adapterProtocol: CLAUDE_ADAPTER_PROTOCOL,
        available: claudeCapabilitiesFromHelp(pluginHelp.stdout, marketplaceHelp.stdout),
      });
    },
    inventoryMarketplaceRegistration,
    setMarketplaceRegistration,
    inventoryNativePlugins: async ({ home }) => {
      const observations: ClaudeNativePlugin[] = [];
      for (const plugin of (await listPlugins(home)).filter((entry) =>
        entry.marketplaceName === input.contentAuthority)) {
        const installPath = await requireContainedProviderPath(home, plugin.installPath, "Claude installed plugin cache");
        const inspected = await inspectNodeNativePluginPackage(installPath, "claude");
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
          cacheIdentity: installPath,
          memberFingerprint: inspected.memberFingerprint,
          enablement: plugin.enabled ? "enabled" : "disabled",
          visibleSkills: inspected.visibleSkills,
          visibleHooks: inspected.visibleHooks,
        }));
      }
      return Object.freeze(observations);
    },
    inventoryStandaloneExposures: async ({ home }) => {
      const plugins = await listPlugins(home);
      const exposures: NativeStandaloneExposureObservation[] = [];
      for (const plugin of plugins.filter((entry) =>
        entry.marketplaceName !== input.contentAuthority)) {
        const installPath = await requireContainedProviderPath(home, plugin.installPath, "Claude standalone plugin cache");
        const visible = await inspectNodePluginVisibility(installPath);
        exposures.push(Object.freeze({
          exposureIdentity: plugin.selector,
          nativeIdentity: `rawr:${plugin.name}`,
          providerSourceIdentity: parseSourceIdentity(plugin.marketplaceName),
          enablement: plugin.enabled ? "enabled" : "disabled",
          visibleSkills: visible.visibleSkills,
          visibleHooks: visible.visibleHooks,
        }));
      }
      const installedSelectors = new Set(plugins.map((plugin) => plugin.selector));
      for (const exposure of await readClaudeConfiguredPluginExposures(home)) {
        if (!installedSelectors.has(exposure.exposureIdentity)) exposures.push(exposure);
      }
      return Object.freeze(exposures);
    },
    installNativePlugin: async (request) => {
      requireManagedRequest(request.providerSourceIdentity, request.marketplaceIdentity, request.artifactAuthority.contentAuthority, input.contentAuthority);
      await runner.run(request.home, ["plugin", "install", selector(request.nativeIdentity, input.contentAuthority), "--scope", "user"]);
    },
    enableNativePlugin: async ({ home, nativeIdentity }) => {
      await runner.run(home, ["plugin", "enable", selector(nativeIdentity, input.contentAuthority), "--scope", "user"]);
    },
    disableNativePlugin: async ({ home, nativeIdentity }) => {
      await runner.run(home, ["plugin", "disable", selector(nativeIdentity, input.contentAuthority), "--scope", "user"]);
    },
    uninstallNativePlugin: async ({ home, nativeIdentity, providerSourceIdentity, cacheIdentity }) => {
      if (providerSourceIdentity !== input.contentAuthority) {
        throw new Error("Claude uninstall source does not match the configured content owner");
      }
      await requireContainedProviderPath(home, cacheIdentity, "Claude uninstall cache identity");
      await runner.run(home, ["plugin", "uninstall", selector(nativeIdentity, input.contentAuthority), "--scope", "user"]);
    },
  };
  return Object.freeze(process);
}

export function claudeCapabilitiesFromHelp(
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
  if (plugin.has("install") && marketplace.has("add") && marketplace.has("list")) {
    available.add("native-plugin-install");
  }
  if (plugin.has("enable") && plugin.has("list")) available.add("native-plugin-enable");
  if (plugin.has("uninstall") && marketplace.has("remove") && marketplace.has("list")) {
    available.add("managed-retire");
  }
  return Object.freeze([...available].sort());
}

async function readClaudeConfiguredPluginExposures(
  home: string,
): Promise<readonly NativeStandaloneExposureObservation[]> {
  if (await realpath(home) !== home) throw new Error("Claude configuration home is not canonical");
  const settingsPath = path.join(home, "settings.json");
  let status;
  try {
    status = await lstat(settingsPath, { bigint: true });
  } catch (error) {
    if (hasCode(error, "ENOENT")) return Object.freeze([]);
    throw error;
  }
  if (!status.isFile() || status.isSymbolicLink() || status.nlink !== 1n) {
    throw new Error("Claude settings must be one non-linked regular file");
  }
  const handle = await open(settingsPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  let decoded: unknown;
  try {
    decoded = JSON.parse(await handle.readFile({ encoding: "utf8" })) as unknown;
  } finally {
    await handle.close();
  }
  const settings = requireRecord(decoded, "Claude settings");
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
      providerSourceIdentity: parseSourceIdentity(configuredSelector.slice(separator + 1)),
      enablement: enabled ? "enabled" as const : "disabled" as const,
      visibleSkills: Object.freeze([]),
      visibleHooks: Object.freeze([]),
    });
  }));
}

interface ClaudeListPlugin {
  readonly selector: string;
  readonly name: PluginId;
  readonly marketplaceName: string;
  readonly enabled: boolean;
  readonly installPath: string;
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
    || typeof record.installPath !== "string"
    || !path.isAbsolute(record.installPath)
    || record.scope !== "user"
  ) {
    throw new Error("Claude installed plugin entry is invalid");
  }
  return Object.freeze({
    selector: selectorValue,
    name: name.value,
    marketplaceName,
    enabled: record.enabled,
    installPath: path.normalize(record.installPath),
  });
}

function parseMarketplaceEntry(input: unknown): Readonly<{ name: string; path: string }> {
  const record = requireRecord(input, "Claude marketplace entry");
  if (
    typeof record.name !== "string"
    || typeof record.path !== "string"
    || !path.isAbsolute(record.path)
    || record.source !== "directory"
  ) {
    throw new Error("Claude marketplace entry is invalid");
  }
  return Object.freeze({ name: record.name, path: path.normalize(record.path) });
}

function selector(nativeIdentity: string, authority: ContentAuthority): string {
  if (!nativeIdentity.startsWith("rawr:")) throw new Error("Claude native identity is invalid");
  const pluginId = parsePluginId(nativeIdentity.slice("rawr:".length), "nativeIdentity");
  if (!pluginId.ok) throw new Error("Claude native identity has no canonical plugin ID");
  return `${pluginId.value}@${authority}`;
}

function parseSourceIdentity(value: string): ProviderSourceIdentity {
  const parsed = parseContentAuthority(value, "marketplaceName");
  if (!parsed.ok) throw new Error("Claude marketplace name is not a canonical source identity");
  return parsed.value;
}

function requireManagedRequest(
  source: ProviderSourceIdentity,
  marketplace: string,
  authority: string,
  expected: ContentAuthority,
): void {
  if (source !== expected || marketplace !== expected || authority !== expected) {
    throw new Error("Claude mutation authority does not match the configured content owner");
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

function hasCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === code;
}

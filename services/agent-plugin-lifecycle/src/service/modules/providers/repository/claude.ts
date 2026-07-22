import type { ProviderTargetDigest } from "../model/dto/provider-target";
import type {
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
} from "../model/policy/marketplace";
import {
  type AdapterProtocol,
  type ProviderArtifactAuthority,
  type ProviderCapability,
  type ProviderMemberFingerprint,
  type ProviderSourceIdentity,
  parseAdapterProtocol,
} from "../model/policy/projection";
import type {
  NativeConfiguredExposureObservation,
  NativeStandaloneExposureObservation,
} from "../model/policy/state-machine";
import type {
  ProviderMarketplaceSource,
  ProviderMarketplaceSourceReader,
} from "../model/repositories/state";
import {
  createNativeProviderAdapter,
  type NativePluginProcessObservation,
  type NativeProviderAdapter,
  type NativeProviderBridge,
  type NativeProviderInventoryBridge,
} from "./native";

export const CLAUDE_ADAPTER_PROTOCOL = requireProtocol("rawr-provider-adapter/claude@v1");

export interface ClaudeNativePlugin {
  readonly pluginId: NativePluginProcessObservation["pluginId"];
  readonly nativeIdentity: string;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly marketplaceIdentity: string;
  readonly memberFingerprint: ProviderMemberFingerprint;
  readonly enablement: "disabled" | "enabled";
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export interface ClaudeProcessPort {
  probe(input: Readonly<{ home: string }>): Promise<
    Readonly<{
      adapterProtocol: AdapterProtocol;
      available: readonly ProviderCapability[];
    }>
  >;
  inventoryMarketplaceRegistration(
    input: Readonly<{
      home: string;
    }>
  ): Promise<ProviderMarketplaceObservation>;
  setMarketplaceRegistration(
    input: Readonly<{
      home: string;
      expected: ProviderMarketplaceObservation;
      registration: ProviderMarketplaceRegistration | null;
      source: ProviderMarketplaceSource | null;
      targetDigest: ProviderTargetDigest;
    }>
  ): Promise<void>;
  inventoryNativePlugins(input: Readonly<{ home: string }>): Promise<readonly ClaudeNativePlugin[]>;
  inventoryStandaloneExposures(
    input: Readonly<{ home: string }>
  ): Promise<readonly NativeStandaloneExposureObservation[]>;
  installNativePlugin(
    input: Readonly<{
      home: string;
      nativeIdentity: string;
      artifactAuthority: ProviderArtifactAuthority;
      providerSourceIdentity: ProviderSourceIdentity;
      marketplaceIdentity: string;
      memberFingerprint: ProviderMemberFingerprint;
      targetDigest: ProviderTargetDigest;
    }>
  ): Promise<void>;
  enableNativePlugin(
    input: Readonly<{
      home: string;
      nativeIdentity: string;
    }>
  ): Promise<void>;
  uninstallNativePlugin(
    input: Readonly<{
      home: string;
      nativeIdentity: string;
      providerSourceIdentity: ProviderSourceIdentity;
      memberFingerprint: ProviderMemberFingerprint;
      targetDigest: ProviderTargetDigest;
    }>
  ): Promise<void>;
  retireConfiguredPlugin(
    input: Readonly<{
      home: string;
      expected: NativeConfiguredExposureObservation;
    }>
  ): Promise<void>;
}

export interface ClaudeProviderAdapter extends NativeProviderAdapter {}

export function createClaudeNativeInventoryBridge(
  input: Readonly<{
    process: Pick<
      ClaudeProcessPort,
      "inventoryMarketplaceRegistration" | "inventoryNativePlugins" | "inventoryStandaloneExposures"
    >;
  }>
): NativeProviderInventoryBridge {
  return Object.freeze({
    async inventory(home) {
      const [plugins, standaloneExposures] = await Promise.all([
        input.process.inventoryNativePlugins({ home }),
        input.process.inventoryStandaloneExposures({ home }),
      ]);
      const members = plugins.map((plugin): NativePluginProcessObservation => {
        return Object.freeze({
          pluginId: plugin.pluginId,
          nativeIdentity: plugin.nativeIdentity,
          artifactAuthority: plugin.artifactAuthority,
          providerSourceIdentity: plugin.providerSourceIdentity,
          marketplaceIdentity: plugin.marketplaceIdentity,
          memberFingerprint: plugin.memberFingerprint,
          enablement: plugin.enablement,
          visibleSkills: Object.freeze([...plugin.visibleSkills]),
          visibleHooks: Object.freeze([...plugin.visibleHooks]),
        });
      });
      return Object.freeze({
        marketplace: await input.process.inventoryMarketplaceRegistration({ home }),
        members: Object.freeze(members),
        standaloneExposures: Object.freeze([...standaloneExposures]),
      });
    },
  });
}

export function createClaudeProviderAdapter(
  input: Readonly<{
    process: ClaudeProcessPort;
    marketplaceSources: ProviderMarketplaceSourceReader;
  }>
): ClaudeProviderAdapter {
  const inventoryBridge = createClaudeNativeInventoryBridge(input);
  const bridge: NativeProviderBridge = {
    probe: async (home) => await input.process.probe({ home }),
    inventory: inventoryBridge.inventory,
    setMarketplace: async ({ target, expected, registration, source }) =>
      await input.process.setMarketplaceRegistration({
        home: target.home,
        expected,
        registration,
        source: verifiedMarketplaceSource(source, registration),
        targetDigest: target.targetDigest,
      }),
    install: async ({ target, member }) =>
      await input.process.installNativePlugin({
        home: target.home,
        nativeIdentity: member.nativeIdentity,
        artifactAuthority: member.artifactAuthority,
        providerSourceIdentity: member.providerSourceIdentity,
        marketplaceIdentity: member.providerSourceIdentity,
        memberFingerprint: member.memberFingerprint,
        targetDigest: target.targetDigest,
      }),
    enable: async ({ target, member }) =>
      await input.process.enableNativePlugin({
        home: target.home,
        nativeIdentity: member.nativeIdentity,
      }),
    uninstall: async ({ target, expected }) => {
      const plugins = await input.process.inventoryNativePlugins({ home: target.home });
      const exact = plugins.find(
        (candidate) => candidate.nativeIdentity === expected.nativeIdentity
      );
      if (
        exact === undefined ||
        exact.pluginId !== expected.pluginId ||
        exact.providerSourceIdentity !== expected.providerSourceIdentity ||
        exact.marketplaceIdentity !== expected.providerSourceIdentity ||
        exact.memberFingerprint !== expected.memberFingerprint
      ) {
        throw new Error("Claude uninstall target changed after the adapter precondition read");
      }
      await input.process.uninstallNativePlugin({
        home: target.home,
        nativeIdentity: expected.nativeIdentity,
        providerSourceIdentity: expected.providerSourceIdentity,
        memberFingerprint: expected.memberFingerprint,
        targetDigest: target.targetDigest,
      });
    },
    retireConfiguredExposure: async ({ target, expected }) =>
      await input.process.retireConfiguredPlugin({ home: target.home, expected }),
  };
  return createNativeProviderAdapter({
    provider: "claude",
    adapterProtocol: CLAUDE_ADAPTER_PROTOCOL,
    bridge,
    marketplaceSources: input.marketplaceSources,
  });
}

function verifiedMarketplaceSource(
  source: ProviderMarketplaceSource | null,
  registration: ProviderMarketplaceRegistration | null
): ProviderMarketplaceSource | null {
  if (registration === null) {
    if (source !== null) throw new Error("Claude marketplace removal cannot carry a source");
    return null;
  }
  if (
    source === null ||
    source.projectionDigest !== registration.projectionDigest ||
    source.sourceDigest !== registration.sourceDigest
  ) {
    throw new Error("Claude marketplace source does not bind the requested registration");
  }
  return source;
}

function requireProtocol(value: string): AdapterProtocol {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error(`Invalid Claude adapter protocol: ${value}`);
  return parsed.value;
}

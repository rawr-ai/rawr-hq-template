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
  type NativeCapabilityProbe,
  type NativePluginProcessObservation,
  type NativeProviderAdapter,
  type NativeProviderBridge,
  type NativeProviderInventoryBridge,
} from "./native";

export const CODEX_ADAPTER_PROTOCOL = requireProtocol("rawr-provider-adapter/codex@v1");

export interface CodexMarketplacePlugin {
  readonly pluginId: NativePluginProcessObservation["pluginId"];
  readonly nativeIdentity: string;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly marketplaceIdentity: string;
  readonly memberFingerprint: ProviderMemberFingerprint;
}

export interface CodexVisiblePlugin {
  readonly nativeIdentity: string;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export interface CodexConfiguredPlugin {
  readonly nativeIdentity: string;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly enablement: "disabled" | "enabled";
}

export interface CodexProcessPort {
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
  inventoryMarketplace(
    input: Readonly<{ home: string }>
  ): Promise<readonly CodexMarketplacePlugin[]>;
  installMarketplacePlugin(
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
  enableMarketplacePlugin(
    input: Readonly<{
      home: string;
      nativeIdentity: string;
    }>
  ): Promise<void>;
  uninstallMarketplacePlugin(
    input: Readonly<{
      home: string;
      nativeIdentity: string;
      providerSourceIdentity: ProviderSourceIdentity;
      marketplaceIdentity: string;
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

export interface CodexAppServerPort {
  inspectVisiblePlugins(input: Readonly<{ home: string }>): Promise<readonly CodexVisiblePlugin[]>;
}

export interface CodexSessionPort {
  inspectConfiguredPlugins(
    input: Readonly<{ home: string }>
  ): Promise<readonly CodexConfiguredPlugin[]>;
}

export interface CodexProviderAdapter extends NativeProviderAdapter {}

export function createCodexNativeInventoryBridge(
  input: Readonly<{
    process: Pick<CodexProcessPort, "inventoryMarketplace" | "inventoryMarketplaceRegistration">;
    appServer: CodexAppServerPort;
    session: CodexSessionPort;
  }>
): NativeProviderInventoryBridge {
  return Object.freeze({
    async inventory(home) {
      const [plugins, visible] = await Promise.all([
        input.process.inventoryMarketplace({ home }),
        input.appServer.inspectVisiblePlugins({ home }),
      ]);
      const configured = await input.session.inspectConfiguredPlugins({ home });
      const visibleBySelector = uniqueBySelector(visible, "Codex app-server visibility");
      const configuredBySelector = uniqueBySelector(configured, "Codex plugin configuration");
      const members = plugins.map((plugin): NativePluginProcessObservation => {
        const selector = selectorKey(plugin);
        const observation = visibleBySelector.get(selector);
        if (observation === undefined) {
          throw new Error(`Codex app server omitted native plugin ${providerSelector(plugin)}`);
        }
        const configuredObservation = configuredBySelector.get(selector);
        return Object.freeze({
          ...plugin,
          enablement: configuredObservation?.enablement ?? "disabled",
          visibleSkills: Object.freeze([...observation.visibleSkills]),
          visibleHooks: Object.freeze([...observation.visibleHooks]),
        });
      });
      const managedSelectors = new Set(plugins.map(selectorKey));
      const standalone = new Map<string, NativeStandaloneExposureObservation>();
      for (const observation of visible) {
        const selector = selectorKey(observation);
        if (managedSelectors.has(selector)) continue;
        standalone.set(
          selector,
          Object.freeze({
            exposureKind: "installed",
            exposureIdentity: providerSelector(observation),
            nativeIdentity: observation.nativeIdentity,
            providerSourceIdentity: observation.providerSourceIdentity,
            enablement: configuredBySelector.get(selector)?.enablement ?? "disabled",
            visibleSkills: Object.freeze([...observation.visibleSkills]),
            visibleHooks: Object.freeze([...observation.visibleHooks]),
          })
        );
      }
      for (const observation of configured) {
        const selector = selectorKey(observation);
        if (managedSelectors.has(selector)) continue;
        const existing = standalone.get(selector);
        if (existing !== undefined) continue;
        standalone.set(
          selector,
          Object.freeze({
            exposureKind: "configured-only",
            exposureIdentity: providerSelector(observation),
            nativeIdentity: observation.nativeIdentity,
            providerSourceIdentity: observation.providerSourceIdentity,
            enablement: observation.enablement,
            visibleSkills: Object.freeze([]),
            visibleHooks: Object.freeze([]),
          })
        );
      }
      return Object.freeze({
        marketplace: await input.process.inventoryMarketplaceRegistration({ home }),
        members: Object.freeze(members),
        standaloneExposures: Object.freeze([...standalone.values()]),
      });
    },
  });
}

export function createCodexProviderAdapter(
  input: Readonly<{
    process: CodexProcessPort;
    appServer: CodexAppServerPort;
    session: CodexSessionPort;
    marketplaceSources: ProviderMarketplaceSourceReader;
  }>
): CodexProviderAdapter {
  const inventoryBridge = createCodexNativeInventoryBridge(input);
  const bridge: NativeProviderBridge = {
    probe: async (home): Promise<NativeCapabilityProbe> => await input.process.probe({ home }),
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
      await input.process.installMarketplacePlugin({
        home: target.home,
        nativeIdentity: member.nativeIdentity,
        artifactAuthority: member.artifactAuthority,
        providerSourceIdentity: member.providerSourceIdentity,
        marketplaceIdentity: member.providerSourceIdentity,
        memberFingerprint: member.memberFingerprint,
        targetDigest: target.targetDigest,
      }),
    enable: async ({ target, member }) =>
      await input.process.enableMarketplacePlugin({
        home: target.home,
        nativeIdentity: member.nativeIdentity,
      }),
    uninstall: async ({ target, expected }) =>
      await input.process.uninstallMarketplacePlugin({
        home: target.home,
        nativeIdentity: expected.nativeIdentity,
        providerSourceIdentity: expected.providerSourceIdentity,
        marketplaceIdentity: expected.providerSourceIdentity,
        memberFingerprint: expected.memberFingerprint,
        targetDigest: target.targetDigest,
      }),
    retireConfiguredExposure: async ({ target, expected }) =>
      await input.process.retireConfiguredPlugin({ home: target.home, expected }),
  };
  return createNativeProviderAdapter({
    provider: "codex",
    adapterProtocol: CODEX_ADAPTER_PROTOCOL,
    bridge,
    marketplaceSources: input.marketplaceSources,
  });
}

function verifiedMarketplaceSource(
  source: ProviderMarketplaceSource | null,
  registration: ProviderMarketplaceRegistration | null
): ProviderMarketplaceSource | null {
  if (registration === null) {
    if (source !== null) throw new Error("Codex marketplace removal cannot carry a source");
    return null;
  }
  if (
    source === null ||
    source.projectionDigest !== registration.projectionDigest ||
    source.sourceDigest !== registration.sourceDigest
  ) {
    throw new Error("Codex marketplace source does not bind the requested registration");
  }
  return source;
}

function uniqueBySelector<
  T extends Readonly<{
    nativeIdentity: string;
    providerSourceIdentity: ProviderSourceIdentity;
  }>,
>(entries: readonly T[], label: string): ReadonlyMap<string, T> {
  const result = new Map<string, T>();
  for (const entry of entries) {
    const selector = selectorKey(entry);
    if (result.has(selector)) throw new Error(`${label} contains a duplicate provider selector`);
    result.set(selector, entry);
  }
  return result;
}

function selectorKey(
  input: Readonly<{
    nativeIdentity: string;
    providerSourceIdentity: ProviderSourceIdentity;
  }>
): string {
  return `${input.nativeIdentity}\0${input.providerSourceIdentity}`;
}

function providerSelector(
  input: Readonly<{
    nativeIdentity: string;
    providerSourceIdentity: ProviderSourceIdentity;
  }>
): string {
  const pluginIdentity = input.nativeIdentity.startsWith("rawr:")
    ? input.nativeIdentity.slice("rawr:".length)
    : input.nativeIdentity;
  return `${pluginIdentity}@${input.providerSourceIdentity}`;
}

function requireProtocol(value: string): AdapterProtocol {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error(`Invalid Codex adapter protocol: ${value}`);
  return parsed.value;
}

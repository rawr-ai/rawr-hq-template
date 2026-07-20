import {
  parseAdapterProtocol,
  type AdapterProtocol,
  type ProviderArtifactAuthority,
  type ProviderCapability,
  type ProviderMemberFingerprint,
  type ProviderSourceIdentity,
} from "../../service/modules/providers/model/policy/projection";
import type {
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
} from "../../service/modules/providers/model/policy/marketplace";
import type { NativeStandaloneExposureObservation } from "../../service/modules/providers/model/policy/state-machine";
import type { ProviderTargetDigest } from "../../service/modules/providers/model/dto/provider-target";
import type {
  ProviderMarketplaceSource,
  ProviderMarketplaceSourceReader,
} from "../../service/modules/providers/ports/state";
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
  probe(input: Readonly<{ home: string }>): Promise<Readonly<{
    adapterProtocol: AdapterProtocol;
    available: readonly ProviderCapability[];
  }>>;
  inventoryMarketplaceRegistration(input: Readonly<{
    home: string;
  }>): Promise<ProviderMarketplaceObservation>;
  setMarketplaceRegistration(input: Readonly<{
    home: string;
    expected: ProviderMarketplaceObservation;
    registration: ProviderMarketplaceRegistration | null;
    source: ProviderMarketplaceSource | null;
    targetDigest: ProviderTargetDigest;
  }>): Promise<void>;
  inventoryMarketplace(input: Readonly<{ home: string }>): Promise<readonly CodexMarketplacePlugin[]>;
  installMarketplacePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
    artifactAuthority: ProviderArtifactAuthority;
    providerSourceIdentity: ProviderSourceIdentity;
    marketplaceIdentity: string;
    memberFingerprint: ProviderMemberFingerprint;
    targetDigest: ProviderTargetDigest;
  }>): Promise<void>;
  enableMarketplacePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
  }>): Promise<void>;
  uninstallMarketplacePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
    providerSourceIdentity: ProviderSourceIdentity;
    marketplaceIdentity: string;
    memberFingerprint: ProviderMemberFingerprint;
    targetDigest: ProviderTargetDigest;
  }>): Promise<void>;
}

export interface CodexAppServerPort {
  inspectVisiblePlugins(input: Readonly<{ home: string }>): Promise<readonly CodexVisiblePlugin[]>;
}

export interface CodexSessionPort {
  inspectConfiguredPlugins(input: Readonly<{ home: string }>): Promise<readonly CodexConfiguredPlugin[]>;
}

export interface CodexProviderAdapter extends NativeProviderAdapter {}

export function createCodexNativeInventoryBridge(input: Readonly<{
  process: Pick<CodexProcessPort,
    "inventoryMarketplace" | "inventoryMarketplaceRegistration">;
  appServer: CodexAppServerPort;
  session: CodexSessionPort;
}>): NativeProviderInventoryBridge {
  return Object.freeze({
    async inventory(home) {
      const [plugins, visible] = await Promise.all([
        input.process.inventoryMarketplace({ home }),
        input.appServer.inspectVisiblePlugins({ home }),
      ]);
      const configured = await input.session.inspectConfiguredPlugins({ home });
      const visibleByIdentity = uniqueByIdentity(visible, "Codex app-server visibility");
      const configuredByIdentity = uniqueByIdentity(configured, "Codex plugin configuration");
      const members = plugins.map((plugin): NativePluginProcessObservation => {
        const observation = visibleByIdentity.get(plugin.nativeIdentity);
        if (observation === undefined) {
          throw new Error(`Codex app server omitted native plugin ${plugin.nativeIdentity}`);
        }
        const configuredObservation = configuredByIdentity.get(plugin.nativeIdentity);
        if (observation.providerSourceIdentity !== plugin.providerSourceIdentity
          || (configuredObservation !== undefined && configuredObservation.providerSourceIdentity !== plugin.providerSourceIdentity)) {
          throw new Error(`Codex source identity changed across native observations for ${plugin.nativeIdentity}`);
        }
        return Object.freeze({
          ...plugin,
          enablement: configuredObservation?.enablement ?? "disabled",
          visibleSkills: Object.freeze([...observation.visibleSkills]),
          visibleHooks: Object.freeze([...observation.visibleHooks]),
        });
      });
      const pluginIdentities = new Set(plugins.map((plugin) => plugin.nativeIdentity));
      const standalone = new Map<string, NativeStandaloneExposureObservation>();
      for (const observation of visible) {
        if (pluginIdentities.has(observation.nativeIdentity)) continue;
        standalone.set(observation.nativeIdentity, Object.freeze({
          exposureIdentity: observation.nativeIdentity,
          nativeIdentity: observation.nativeIdentity,
          providerSourceIdentity: observation.providerSourceIdentity,
          enablement: configuredByIdentity.get(observation.nativeIdentity)?.enablement ?? "disabled",
          visibleSkills: Object.freeze([...observation.visibleSkills]),
          visibleHooks: Object.freeze([...observation.visibleHooks]),
        }));
      }
      for (const observation of configured) {
        if (pluginIdentities.has(observation.nativeIdentity)) continue;
        const existing = standalone.get(observation.nativeIdentity);
        if (existing !== undefined) {
          if (existing.providerSourceIdentity !== observation.providerSourceIdentity) {
            throw new Error(`Codex standalone source identity changed across observations for ${observation.nativeIdentity}`);
          }
          continue;
        }
        standalone.set(observation.nativeIdentity, Object.freeze({
          exposureIdentity: observation.nativeIdentity,
          nativeIdentity: observation.nativeIdentity,
          providerSourceIdentity: observation.providerSourceIdentity,
          enablement: observation.enablement,
          visibleSkills: Object.freeze([]),
          visibleHooks: Object.freeze([]),
        }));
      }
      return Object.freeze({
        marketplace: await input.process.inventoryMarketplaceRegistration({ home }),
        members: Object.freeze(members),
        standaloneExposures: Object.freeze([...standalone.values()]),
      });
    },
  });
}

export function createCodexProviderAdapter(input: Readonly<{
  process: CodexProcessPort;
  appServer: CodexAppServerPort;
  session: CodexSessionPort;
  marketplaceSources: ProviderMarketplaceSourceReader;
}>): CodexProviderAdapter {
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
    install: async ({ target, member }) => await input.process.installMarketplacePlugin({
      home: target.home,
      nativeIdentity: member.nativeIdentity,
      artifactAuthority: member.artifactAuthority,
      providerSourceIdentity: member.providerSourceIdentity,
      marketplaceIdentity: member.providerSourceIdentity,
      memberFingerprint: member.memberFingerprint,
      targetDigest: target.targetDigest,
    }),
    enable: async ({ target, member }) => await input.process.enableMarketplacePlugin({
      home: target.home,
      nativeIdentity: member.nativeIdentity,
    }),
    uninstall: async ({ target, expected }) => await input.process.uninstallMarketplacePlugin({
      home: target.home,
      nativeIdentity: expected.nativeIdentity,
      providerSourceIdentity: expected.providerSourceIdentity,
      marketplaceIdentity: expected.providerSourceIdentity,
      memberFingerprint: expected.memberFingerprint,
      targetDigest: target.targetDigest,
    }),
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
  registration: ProviderMarketplaceRegistration | null,
): ProviderMarketplaceSource | null {
  if (registration === null) {
    if (source !== null) throw new Error("Codex marketplace removal cannot carry a source");
    return null;
  }
  if (
    source === null
    || source.projectionDigest !== registration.projectionDigest
    || source.sourceDigest !== registration.sourceDigest
  ) {
    throw new Error("Codex marketplace source does not bind the requested registration");
  }
  return source;
}

function uniqueByIdentity<T extends Readonly<{ nativeIdentity: string }>>(
  entries: readonly T[],
  label: string,
): ReadonlyMap<string, T> {
  const result = new Map<string, T>();
  for (const entry of entries) {
    if (result.has(entry.nativeIdentity)) throw new Error(`${label} contains a duplicate native identity`);
    result.set(entry.nativeIdentity, entry);
  }
  return result;
}

function requireProtocol(value: string): AdapterProtocol {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error(`Invalid Codex adapter protocol: ${value}`);
  return parsed.value;
}

import {
  parseAdapterProtocol,
  type AdapterProtocol,
  type ProviderArtifactAuthority,
  type ProviderCapability,
  type ProviderMemberFingerprint,
  type ProviderSourceIdentity,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  marketplaceState,
  sameMarketplaceState,
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import { failure, issue, success, type DeploymentResult } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type {
  NativeMemberObservation,
  NativeStandaloneExposureObservation,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { ProviderTarget, ProviderTargetDigest } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { NativeMemberRestorationPort } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type {
  ProviderMarketplaceSource,
  ProviderMarketplaceSourceReader,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  createNativeProviderAdapter,
  type NativeCapabilityProbe,
  type NativePluginProcessObservation,
  type NativeProviderAdapter,
  type NativeProviderBridge,
  type StableProjectionSource,
  type StableProjectionSourceReader,
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
    prior: ProviderMarketplaceObservation;
    registration: ProviderMarketplaceRegistration | null;
    sourcePath: string | null;
    targetDigest: ProviderTargetDigest;
  }>): Promise<void>;
  inventoryMarketplace(input: Readonly<{ home: string }>): Promise<readonly CodexMarketplacePlugin[]>;
  installMarketplacePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
    artifactAuthority: ProviderArtifactAuthority;
    providerSourceIdentity: ProviderSourceIdentity;
    marketplaceIdentity: string;
    sourcePath: string;
    memberFingerprint: ProviderMemberFingerprint;
    targetDigest: ProviderTargetDigest;
  }>): Promise<void>;
  enableMarketplacePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
  }>): Promise<void>;
  disableMarketplacePlugin(input: Readonly<{
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

export interface CodexProviderAdapter extends NativeProviderAdapter, NativeMemberRestorationPort {}

export function createCodexProviderAdapter(input: Readonly<{
  process: CodexProcessPort;
  appServer: CodexAppServerPort;
  session: CodexSessionPort;
  marketplaceSources: ProviderMarketplaceSourceReader;
  projectionSources: StableProjectionSourceReader;
}>): CodexProviderAdapter {
  const bridge: NativeProviderBridge = {
    probe: async (home): Promise<NativeCapabilityProbe> => await input.process.probe({ home }),
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
    setMarketplace: async ({ target, prior, registration, source }) =>
      await input.process.setMarketplaceRegistration({
        home: target.home,
        prior,
        registration,
        sourcePath: verifiedMarketplaceSourcePath(source, registration),
        targetDigest: target.targetDigest,
      }),
    install: async ({ target, member, source }) => await input.process.installMarketplacePlugin({
      home: target.home,
      nativeIdentity: member.nativeIdentity,
      artifactAuthority: member.artifactAuthority,
      providerSourceIdentity: member.providerSourceIdentity,
      marketplaceIdentity: member.providerSourceIdentity,
      sourcePath: verifiedSourcePath(source, member.memberFingerprint),
      memberFingerprint: member.memberFingerprint,
      targetDigest: target.targetDigest,
    }),
    enable: async ({ target, member }) => await input.process.enableMarketplacePlugin({
      home: target.home,
      nativeIdentity: member.nativeIdentity,
    }),
    uninstall: async ({ target, prior }) => await input.process.uninstallMarketplacePlugin({
      home: target.home,
      nativeIdentity: prior.nativeIdentity,
      providerSourceIdentity: prior.providerSourceIdentity,
      marketplaceIdentity: prior.providerSourceIdentity,
      memberFingerprint: prior.memberFingerprint,
      targetDigest: target.targetDigest,
    }),
  };
  const adapter = createNativeProviderAdapter({
    provider: "codex",
    adapterProtocol: CODEX_ADAPTER_PROTOCOL,
    bridge,
    marketplaceSources: input.marketplaceSources,
    projectionSources: input.projectionSources,
  });
  return Object.freeze({
    ...adapter,
    ...createCodexRestorationPort(input.process, adapter),
  });
}

function verifiedMarketplaceSourcePath(
  source: ProviderMarketplaceSource | null,
  registration: ProviderMarketplaceRegistration | null,
): string | null {
  if (registration === null) {
    if (source !== null) throw new Error("Codex marketplace removal cannot carry a source");
    return null;
  }
  if (
    source === null
    || !source.path.startsWith("/")
    || source.projectionDigest !== registration.projectionDigest
    || source.sourceDigest !== registration.sourceDigest
  ) {
    throw new Error("Codex marketplace source does not bind the requested registration");
  }
  return source.path;
}

function createCodexRestorationPort(
  process: CodexProcessPort,
  adapter: NativeProviderAdapter,
): NativeMemberRestorationPort {
  const readMarketplace: NativeMemberRestorationPort["readMarketplace"] = async (target) => {
    const inventory = await adapter.readInventory(target);
    return inventory.ok ? success(inventory.value.marketplace) : inventory;
  };

  const setMarketplaceExact: NativeMemberRestorationPort["setMarketplaceExact"] = async ({
    target,
    expected,
    registration,
    source,
  }) => {
    try {
      const current = await readMarketplace(target);
      if (!current.ok) return current;
      if (!sameMarketplaceObservation(current.value, expected)) {
        throw new Error("Codex marketplace inverse precondition changed");
      }
      await process.setMarketplaceRegistration({
        home: target.home,
        prior: expected,
        registration,
        sourcePath: verifiedMarketplaceSourcePath(source, registration),
        targetDigest: target.targetDigest,
      });
      const verified = await readMarketplace(target);
      if (!verified.ok) return verified;
      const desired: ProviderMarketplaceObservation = registration === null
        ? Object.freeze({ kind: "absent" })
        : Object.freeze({ kind: "present", state: marketplaceState(registration) });
      if (!sameMarketplaceObservation(verified.value, desired)) {
        throw new Error("Codex marketplace inverse did not reach the exact registration");
      }
      return success(null);
    } catch (error) {
      return failure([issue(
        "MUTATION_FAILED",
        "owner.restore.codex.marketplace",
        error instanceof Error ? error.message : String(error),
      )]);
    }
  };

  const readMember = async (
    target: ProviderTarget,
    nativeIdentity: string,
  ): Promise<DeploymentResult<NativeMemberObservation | null>> => {
    const inventory = await adapter.readInventory(target);
    if (!inventory.ok) return inventory;
    const matches = inventory.value.members.filter((member) => member.nativeIdentity === nativeIdentity);
    return matches.length <= 1
      ? success(matches[0] ?? null)
      : failure([issue("VISIBILITY_FAILED", "target.inventory", "Codex native identity is ambiguous")]);
  };

  const restoreExact: NativeMemberRestorationPort["restoreExact"] = async ({
    target,
    expected,
    prior,
    priorSource,
  }) => {
    try {
      const nativeIdentity = inverseIdentity(expected, prior);
      const plugins = await process.inventoryMarketplace({ home: target.home });
      const matches = plugins.filter((plugin) => plugin.nativeIdentity === nativeIdentity);
      const exact = matches[0];
      if (expected === null
        ? matches.length !== 0
        : matches.length !== 1 || exact === undefined || !sameCodexPlugin(exact, expected)) {
        throw new Error("Codex inverse precondition no longer matches the exact expected native member");
      }
      if (prior === null) {
        if (expected === null) throw new Error("Codex inverse cannot restore absence from absence");
        await process.uninstallMarketplacePlugin({
          home: target.home,
          nativeIdentity,
          providerSourceIdentity: expected.providerSourceIdentity,
          marketplaceIdentity: expected.providerSourceIdentity,
          memberFingerprint: expected.memberFingerprint,
          targetDigest: target.targetDigest,
        });
        return success(null);
      }

      const sourcePath = verifiedInverseSourcePath(priorSource, prior.memberFingerprint);
      if (expected === null) {
        await process.installMarketplacePlugin({
          home: target.home,
          nativeIdentity,
          artifactAuthority: prior.artifactAuthority,
          providerSourceIdentity: prior.providerSourceIdentity,
          marketplaceIdentity: prior.providerSourceIdentity,
          sourcePath,
          memberFingerprint: prior.memberFingerprint,
          targetDigest: target.targetDigest,
        });
      }
      if (prior.enablement === "enabled") {
        await process.enableMarketplacePlugin({ home: target.home, nativeIdentity });
      } else {
        await process.disableMarketplacePlugin({ home: target.home, nativeIdentity });
      }
      return success(null);
    } catch (error) {
      return failure([issue(
        "MUTATION_FAILED",
        "owner.restore.codex",
        error instanceof Error ? error.message : String(error),
      )]);
    }
  };
  return Object.freeze({ readMarketplace, setMarketplaceExact, readMember, restoreExact });
}

function sameMarketplaceObservation(
  left: ProviderMarketplaceObservation,
  right: ProviderMarketplaceObservation,
): boolean {
  return left.kind === "absent"
    ? right.kind === "absent"
    : right.kind === "present" && sameMarketplaceState(left.state, right.state);
}

function sameCodexPlugin(plugin: CodexMarketplacePlugin, expected: NativeMemberObservation): boolean {
  return plugin.pluginId === expected.pluginId
    && plugin.nativeIdentity === expected.nativeIdentity
    && plugin.marketplaceIdentity === expected.providerSourceIdentity
    && plugin.providerSourceIdentity === expected.providerSourceIdentity
    && sameAuthority(plugin.artifactAuthority, expected.artifactAuthority)
    && plugin.memberFingerprint === expected.memberFingerprint;
}

function sameArtifactVersion(left: NativeMemberObservation, right: NativeMemberObservation): boolean {
  return left.memberFingerprint === right.memberFingerprint
    && left.providerSourceIdentity === right.providerSourceIdentity
    && sameAuthority(left.artifactAuthority, right.artifactAuthority);
}

function sameAuthority(left: ProviderArtifactAuthority, right: ProviderArtifactAuthority): boolean {
  return left.protocol === right.protocol
    && left.contentAuthority === right.contentAuthority
    && left.sourceCommit === right.sourceCommit;
}

function inverseIdentity(
  expected: NativeMemberObservation | null,
  prior: NativeMemberObservation | null,
): string {
  const identity = expected?.nativeIdentity ?? prior?.nativeIdentity;
  if (identity === undefined || (expected !== null && prior !== null && expected.nativeIdentity !== prior.nativeIdentity)) {
    throw new Error("Codex inverse must bind exactly one native identity");
  }
  return identity;
}

function verifiedInverseSourcePath(
  source: Parameters<NativeMemberRestorationPort["restoreExact"]>[0]["priorSource"],
  expected: ProviderMemberFingerprint,
): string {
  if (source === null || source.memberFingerprint !== expected || !source.path.startsWith("/")) {
    throw new Error("Codex inverse source is not the exact stable prior projection member");
  }
  return source.path;
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

function verifiedSourcePath(source: StableProjectionSource, expected: ProviderMemberFingerprint): string {
  if (source.memberFingerprint !== expected || !source.path.startsWith("/")) {
    throw new Error("Codex install source is not an exact stable projection materialization");
  }
  return source.path;
}

function requireProtocol(value: string): AdapterProtocol {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error(`Invalid Codex adapter protocol: ${value}`);
  return parsed.value;
}

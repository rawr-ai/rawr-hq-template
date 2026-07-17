import {
  parseAdapterProtocol,
  type AdapterProtocol,
  type ProviderArtifactAuthority,
  type ProviderCapability,
  type ProviderMemberFingerprint,
  type ProviderSourceIdentity,
} from "../domain/projection";
import {
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "../domain/marketplace";
import { failure, issue, success, type DeploymentResult } from "../domain/result";
import type { NativeMemberObservation, NativeStandaloneExposureObservation } from "../domain/state";
import type { ProviderTarget, ProviderTargetDigest } from "../domain/target";
import type { NativeMemberRestorationPort } from "../ports/provider";
import type {
  ProviderMarketplaceSource,
  ProviderMarketplaceSourceReader,
} from "../ports/state";
import {
  createNativeProviderAdapter,
  type NativePluginProcessObservation,
  type NativeProviderAdapter,
  type NativeProviderBridge,
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
    source: ProviderMarketplaceSource | null;
    targetDigest: ProviderTargetDigest;
  }>): Promise<void>;
  inventoryNativePlugins(input: Readonly<{ home: string }>): Promise<readonly ClaudeNativePlugin[]>;
  inventoryStandaloneExposures(input: Readonly<{ home: string }>): Promise<readonly NativeStandaloneExposureObservation[]>;
  installNativePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
    artifactAuthority: ProviderArtifactAuthority;
    providerSourceIdentity: ProviderSourceIdentity;
    marketplaceIdentity: string;
    memberFingerprint: ProviderMemberFingerprint;
    targetDigest: ProviderTargetDigest;
  }>): Promise<void>;
  enableNativePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
  }>): Promise<void>;
  disableNativePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
  }>): Promise<void>;
  uninstallNativePlugin(input: Readonly<{
    home: string;
    nativeIdentity: string;
    providerSourceIdentity: ProviderSourceIdentity;
    memberFingerprint: ProviderMemberFingerprint;
    targetDigest: ProviderTargetDigest;
  }>): Promise<void>;
}

export interface ClaudeProviderAdapter extends NativeProviderAdapter, NativeMemberRestorationPort {}

export function createClaudeProviderAdapter(input: Readonly<{
  process: ClaudeProcessPort;
  marketplaceSources: ProviderMarketplaceSourceReader;
}>): ClaudeProviderAdapter {
  const bridge: NativeProviderBridge = {
    probe: async (home) => await input.process.probe({ home }),
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
    setMarketplace: async ({ target, prior, registration, source }) =>
      await input.process.setMarketplaceRegistration({
        home: target.home,
        prior,
        registration,
        source: verifiedMarketplaceSource(source, registration),
        targetDigest: target.targetDigest,
      }),
    install: async ({ target, member }) => await input.process.installNativePlugin({
      home: target.home,
      nativeIdentity: member.nativeIdentity,
      artifactAuthority: member.artifactAuthority,
      providerSourceIdentity: member.providerSourceIdentity,
      marketplaceIdentity: member.providerSourceIdentity,
      memberFingerprint: member.memberFingerprint,
      targetDigest: target.targetDigest,
    }),
    enable: async ({ target, member }) => await input.process.enableNativePlugin({
      home: target.home,
      nativeIdentity: member.nativeIdentity,
    }),
    uninstall: async ({ target, prior }) => {
      const plugins = await input.process.inventoryNativePlugins({ home: target.home });
      const exact = plugins.find((candidate) => candidate.nativeIdentity === prior.nativeIdentity);
      if (exact === undefined
        || exact.pluginId !== prior.pluginId
        || exact.providerSourceIdentity !== prior.providerSourceIdentity
        || exact.marketplaceIdentity !== prior.providerSourceIdentity
        || exact.memberFingerprint !== prior.memberFingerprint) {
        throw new Error("Claude uninstall target changed after the adapter precondition read");
      }
      await input.process.uninstallNativePlugin({
        home: target.home,
        nativeIdentity: prior.nativeIdentity,
        providerSourceIdentity: prior.providerSourceIdentity,
        memberFingerprint: prior.memberFingerprint,
        targetDigest: target.targetDigest,
      });
    },
  };
  const adapter = createNativeProviderAdapter({
    provider: "claude",
    adapterProtocol: CLAUDE_ADAPTER_PROTOCOL,
    bridge,
    marketplaceSources: input.marketplaceSources,
  });
  return Object.freeze({
    ...adapter,
    ...createClaudeRestorationPort(input.process, adapter),
  });
}

function verifiedMarketplaceSource(
  source: ProviderMarketplaceSource | null,
  registration: ProviderMarketplaceRegistration | null,
): ProviderMarketplaceSource | null {
  if (registration === null) {
    if (source !== null) throw new Error("Claude marketplace removal cannot carry a source");
    return null;
  }
  if (
    source === null
    || source.projectionDigest !== registration.projectionDigest
    || source.sourceDigest !== registration.sourceDigest
  ) {
    throw new Error("Claude marketplace source does not bind the requested registration");
  }
  return source;
}

function createClaudeRestorationPort(
  process: ClaudeProcessPort,
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
        throw new Error("Claude marketplace inverse precondition changed");
      }
      await process.setMarketplaceRegistration({
        home: target.home,
        prior: expected,
        registration,
        source: verifiedMarketplaceSource(source, registration),
        targetDigest: target.targetDigest,
      });
      const verified = await readMarketplace(target);
      if (!verified.ok) return verified;
      const desired: ProviderMarketplaceObservation = registration === null
        ? Object.freeze({ kind: "absent" })
        : Object.freeze({ kind: "present", state: marketplaceState(registration) });
      if (!sameMarketplaceObservation(verified.value, desired)) {
        throw new Error("Claude marketplace inverse did not reach the exact registration");
      }
      return success(null);
    } catch (error) {
      return failure([issue(
        "MUTATION_FAILED",
        "owner.restore.claude.marketplace",
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
      : failure([issue("VISIBILITY_FAILED", "target.inventory", "Claude native identity is ambiguous")]);
  };

  const restoreExact: NativeMemberRestorationPort["restoreExact"] = async ({
    target,
    expected,
    prior,
  }) => {
    try {
      const nativeIdentity = inverseIdentity(expected, prior);
      const plugins = await process.inventoryNativePlugins({ home: target.home });
      const matches = plugins.filter((plugin) => plugin.nativeIdentity === nativeIdentity);
      const exact = matches[0];
      if (expected === null
        ? matches.length !== 0
        : matches.length !== 1 || exact === undefined || !sameClaudePlugin(exact, expected)) {
        throw new Error("Claude inverse precondition no longer matches the exact expected native member");
      }
      if (prior === null) {
        if (expected === null || exact === undefined) throw new Error("Claude inverse uninstall identity is unavailable");
        await process.uninstallNativePlugin({
          home: target.home,
          nativeIdentity,
          providerSourceIdentity: expected.providerSourceIdentity,
          memberFingerprint: expected.memberFingerprint,
          targetDigest: target.targetDigest,
        });
        return success(null);
      }

      if (expected === null) {
        await process.installNativePlugin({
          home: target.home,
          nativeIdentity,
          artifactAuthority: prior.artifactAuthority,
          providerSourceIdentity: prior.providerSourceIdentity,
          marketplaceIdentity: prior.providerSourceIdentity,
          memberFingerprint: prior.memberFingerprint,
          targetDigest: target.targetDigest,
        });
      }
      if (prior.enablement === "enabled") {
        await process.enableNativePlugin({ home: target.home, nativeIdentity });
      } else {
        await process.disableNativePlugin({ home: target.home, nativeIdentity });
      }
      return success(null);
    } catch (error) {
      return failure([issue(
        "MUTATION_FAILED",
        "owner.restore.claude",
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

function sameClaudePlugin(plugin: ClaudeNativePlugin, expected: NativeMemberObservation): boolean {
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
    throw new Error("Claude inverse must bind exactly one native identity");
  }
  return identity;
}

function requireProtocol(value: string): AdapterProtocol {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error(`Invalid Claude adapter protocol: ${value}`);
  return parsed.value;
}

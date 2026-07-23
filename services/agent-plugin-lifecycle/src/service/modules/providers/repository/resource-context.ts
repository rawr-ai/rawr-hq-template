import type {
  NativeProviderExecutablePaths,
  NativeProviderResourcePort,
} from "../../../model/dependencies/providers";
import type { ContentAuthority } from "../../../shared/release";
import type { CanonicalNativeMutationAction } from "../model/dto/canonical-convergence";
import type { ProviderId, ProviderTarget } from "../model/dto/provider-target";
import { failure, issue, success } from "../model/errors/deployment-result";
import { NativeProviderPreMutationRefusal } from "../model/errors/native-resource";
import type { AgentProviderProjection } from "../model/policy/projection";
import type { CanonicalNativeRuntime } from "../model/repositories/canonical-native";
import type { ProviderMarketplaceLocationResolver } from "../model/repositories/marketplace-location";
import type {
  NativeProviderMutationAction,
  ProviderTargetMutator,
  ProviderTargetReader,
} from "../model/repositories/provider";
import type { ProviderMarketplaceSourceReader } from "../model/repositories/state";
import type { CanonicalNativeObserver } from "./canonical-native-observer";
import { CLAUDE_ADAPTER_PROTOCOL, type ClaudeProviderAdapter } from "./claude";
import { CODEX_ADAPTER_PROTOCOL, type CodexProviderAdapter } from "./codex";
import type { NativeProviderAdapter, NativeProviderObserver } from "./native";
import {
  createResourceClaudeCanonicalObserver,
  createResourceClaudeProviderAdapter,
  createResourceClaudeProviderObserver,
} from "./resource-claude";
import {
  createResourceCodexCanonicalObserver,
  createResourceCodexProviderAdapter,
  createResourceCodexProviderObserver,
} from "./resource-codex";

export function createResourceNativeProviderAdapterResolver(
  executables: NativeProviderExecutablePaths,
  resource: NativeProviderResourcePort,
  marketplaceSources: ProviderMarketplaceSourceReader,
  marketplaceLocations: ProviderMarketplaceLocationResolver
): (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter {
  const adapters = new Map<string, NativeProviderAdapter>();
  return (provider, contentAuthority) => {
    const key = `${provider}\0${contentAuthority}`;
    const existing = adapters.get(key);
    if (existing !== undefined) return existing;
    const common = Object.freeze({
      executablePath: requireExecutable(executables, provider),
      contentAuthority,
      marketplaceSources,
      marketplaceLocations,
      resource,
    });
    const created: CodexProviderAdapter | ClaudeProviderAdapter =
      provider === "codex"
        ? createResourceCodexProviderAdapter(common)
        : createResourceClaudeProviderAdapter(common);
    adapters.set(key, created);
    return created;
  };
}

export function createResourceNativeProviderObserverResolver(
  executables: NativeProviderExecutablePaths,
  resource: NativeProviderResourcePort
): (provider: ProviderId) => NativeProviderObserver {
  const observers = new Map<ProviderId, NativeProviderObserver>();
  return (provider) => {
    const existing = observers.get(provider);
    if (existing !== undefined) return existing;
    const common = Object.freeze({
      resource,
      executablePath: requireExecutable(executables, provider),
    });
    const created =
      provider === "codex"
        ? createResourceCodexProviderObserver(common)
        : createResourceClaudeProviderObserver(common);
    observers.set(provider, created);
    return created;
  };
}

export function createResourceCanonicalNativeObserverResolver(
  executables: NativeProviderExecutablePaths,
  resource: NativeProviderResourcePort
): (provider: ProviderId, contentAuthority: ContentAuthority) => CanonicalNativeObserver {
  const observers = new Map<string, CanonicalNativeObserver>();
  return (provider, contentAuthority) => {
    const key = `${provider}\0${contentAuthority}`;
    const existing = observers.get(key);
    if (existing !== undefined) return existing;
    const common = Object.freeze({
      resource,
      executablePath: requireExecutable(executables, provider),
      contentAuthority,
    });
    const created =
      provider === "codex"
        ? createResourceCodexCanonicalObserver(common)
        : createResourceClaudeCanonicalObserver(common);
    observers.set(key, created);
    return created;
  };
}

export function createResourceProviderTargetReader(
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
  observer: (provider: ProviderId) => NativeProviderObserver
): ProviderTargetReader {
  const reader: ProviderTargetReader = {
    projectionAdapterProtocol(target) {
      return target.provider === "codex"
        ? success(CODEX_ADAPTER_PROTOCOL)
        : target.provider === "claude"
          ? success(CLAUDE_ADAPTER_PROTOCOL)
          : failure([
              issue("UNSUPPORTED_PROVIDER", "target.provider", "Unsupported native provider"),
            ]);
    },
    async inspectCapabilities(target, contentAuthority) {
      return await inspectionAdapter(
        adapter,
        observer,
        target,
        contentAuthority
      ).inspectCapabilities(target);
    },
    async readInventory(target, contentAuthority) {
      return await inspectionAdapter(adapter, observer, target, contentAuthority).readInventory(
        target
      );
    },
    async verifyProjection(target, projection: AgentProviderProjection) {
      return await adapter(
        target.provider,
        projection.artifactAuthority.contentAuthority
      ).verifyProjection(target, projection);
    },
  };
  return Object.freeze(reader);
}

export function createResourceProviderTargetMutator(
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter
): ProviderTargetMutator {
  const mutator: ProviderTargetMutator = {
    async apply(action) {
      return await adapter(action.target.provider, mutationAuthority(action)).apply(action);
    },
  };
  return Object.freeze(mutator);
}

export function createResourceCanonicalNativeRuntime(
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
  observer: (provider: ProviderId, contentAuthority: ContentAuthority) => CanonicalNativeObserver
): CanonicalNativeRuntime {
  const runtime: CanonicalNativeRuntime = {
    async inspectCapabilities(target, contentAuthority) {
      return await adapter(target.provider, contentAuthority).inspectCapabilities(target);
    },
    async observe(target, contentAuthority) {
      return await observer(target.provider, contentAuthority).observe(target, contentAuthority);
    },
    async apply(action) {
      return await adapter(
        action.target.provider,
        canonicalMutationAuthority(action)
      ).applyCanonical(action);
    },
  };
  return Object.freeze(runtime);
}

function inspectionAdapter(
  factory: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
  observer: (provider: ProviderId) => NativeProviderObserver,
  target: ProviderTarget,
  contentAuthority: ContentAuthority | undefined
): NativeProviderObserver {
  return contentAuthority === undefined
    ? observer(target.provider)
    : factory(target.provider, contentAuthority);
}

function mutationAuthority(action: NativeProviderMutationAction): ContentAuthority {
  if (action.kind === "SetMarketplace") {
    const authority =
      action.registration?.marketplaceIdentity ??
      (action.expected.kind === "present" ? action.expected.state.marketplaceIdentity : undefined);
    if (authority === undefined) {
      throw new NativeProviderPreMutationRefusal(
        "Marketplace mutation has no admitted content authority"
      );
    }
    return authority;
  }
  return action.member.artifactAuthority.contentAuthority;
}

function canonicalMutationAuthority(action: CanonicalNativeMutationAction): ContentAuthority {
  return action.kind === "RetireConfiguredExposure"
    ? action.exposure.providerSourceIdentity
    : mutationAuthority(action);
}

function requireExecutable(
  executables: NativeProviderExecutablePaths,
  provider: ProviderId
): string {
  const executablePath = executables[provider];
  if (executablePath !== undefined) return executablePath;
  throw new NativeProviderPreMutationRefusal(
    `${provider} requires an explicit provider executable binding`
  );
}

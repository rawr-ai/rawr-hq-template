import {
  parseContentAuthority,
  parsePluginId,
  type ContentAuthority,
  type PluginId,
} from "../../../../shared/release";
import {
  marketplaceState,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
} from "../domain/marketplace";
import type {
  AdapterProtocol,
  ProviderCapability,
  ProviderSourceIdentity,
} from "../domain/projection";
import type { ProviderId } from "../domain/target";
import { inspectMarketplaceSource } from "./resource-marketplace";
import type {
  NativeResourceSessionInput,
  NativeResourcePackageObservation,
} from "./resource-port";

export function createSessionCache<Session>(
  executablePath: string,
  acquire: (input: NativeResourceSessionInput) => Promise<Session>,
): (home: string) => Promise<Session> {
  const sessions = new Map<string, Promise<Session>>();
  return (home) => {
    const existing = sessions.get(home);
    if (existing !== undefined) return existing;
    const created = acquire(Object.freeze({ executablePath, home }));
    sessions.set(home, created);
    void created.catch(() => {
      if (sessions.get(home) === created) sessions.delete(home);
    });
    return created;
  };
}

export async function readMarketplaceSource(
  observation: NativeResourcePackageObservation,
  provider: ProviderId,
  adapterProtocol: AdapterProtocol,
): Promise<ProviderMarketplaceRegistration> {
  return inspectMarketplaceSource({
    observation,
    provider,
    adapterProtocol,
  });
}

export function capabilitiesFromCommands(
  provider: ProviderId,
  pluginCommands: readonly string[],
  marketplaceCommands: readonly string[],
): readonly ProviderCapability[] {
  const plugin = new Set(pluginCommands);
  const marketplace = new Set(marketplaceCommands);
  const available = new Set<ProviderCapability>();
  if (plugin.has("list")) {
    available.add("visible-hook-inventory");
    available.add("visible-plugin-inventory");
    available.add("visible-skill-inventory");
  }
  const install = provider === "codex" ? plugin.has("add") : plugin.has("install");
  const enable = provider === "codex" ? plugin.has("add") : plugin.has("enable");
  const retire = provider === "codex" ? plugin.has("remove") : plugin.has("uninstall");
  if (install && marketplace.has("add") && marketplace.has("list")) {
    available.add("native-plugin-install");
  }
  if (enable && plugin.has("list")) available.add("native-plugin-enable");
  if (retire && marketplace.has("remove") && marketplace.has("list")) {
    available.add("managed-retire");
  }
  return Object.freeze([...available].sort(compareText));
}

export function pluginIdFromNativeIdentity(nativeIdentity: string, provider: ProviderId): PluginId {
  if (!nativeIdentity.startsWith("rawr:")) throw new Error(`${provider} native identity is invalid`);
  const parsed = parsePluginId(nativeIdentity.slice("rawr:".length), "nativeIdentity");
  if (!parsed.ok) throw new Error(`${provider} native identity has no canonical plugin ID`);
  return parsed.value;
}

export function pluginSelector(
  nativeIdentity: string,
  authority: ContentAuthority,
  provider: ProviderId,
): string {
  return `${pluginIdFromNativeIdentity(nativeIdentity, provider)}@${authority}`;
}

export function parseSourceIdentity(value: string, provider: ProviderId): ProviderSourceIdentity {
  const parsed = parseContentAuthority(value, "marketplaceName");
  if (!parsed.ok) throw new Error(`${provider} marketplace name is not a canonical source identity`);
  return parsed.value;
}

export function requireManagedRequest(
  source: ProviderSourceIdentity,
  marketplace: string,
  authority: string,
  expected: ContentAuthority,
  provider: ProviderId,
): void {
  if (source !== expected || marketplace !== expected || authority !== expected) {
    throw new Error(`${provider} mutation authority does not match the configured content owner`);
  }
}

export function sameMarketplaceObservation(
  left: ProviderMarketplaceObservation,
  right: ProviderMarketplaceObservation,
): boolean {
  return left.kind === "absent"
    ? right.kind === "absent"
    : right.kind === "present" && sameMarketplaceState(left.state, right.state);
}

export function desiredMarketplace(
  registration: ProviderMarketplaceRegistration | null,
): ProviderMarketplaceObservation {
  return registration === null
    ? Object.freeze({ kind: "absent" })
    : Object.freeze({ kind: "present", state: marketplaceState(registration) });
}

export function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

export function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a string`);
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

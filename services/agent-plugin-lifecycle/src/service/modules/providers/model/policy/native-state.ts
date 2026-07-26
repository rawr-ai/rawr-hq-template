import type {
  NativeMarketplaceSource,
  NativeProviderMarketplaceObservation,
} from "@rawr/resource-native-agent-provider";
import { MAX_NATIVE_PROVIDER_PLUGIN_FILES } from "@rawr/resource-native-agent-provider";

import type { ProviderId } from "../dto/provider-lifecycle";
import type { SelectedContentFile, SelectedContentMember } from "../dto/selected-content";

/** Maximum payload files admitted for one native Provider verification pass. */
export const MAX_PROVIDER_VERIFICATION_FILES = MAX_NATIVE_PROVIDER_PLUGIN_FILES;

/** Formats one provider-native plugin selector from selected ownership facts. */
export function providerPluginSelector(member: SelectedContentMember, identity: string): string {
  return `${member.pluginId}@${identity}`;
}

/** Determines whether an observed marketplace is the exact selected source. */
export function marketplaceSourceMatches(
  observed: NativeProviderMarketplaceObservation,
  desired: NativeMarketplaceSource
): boolean {
  const source = observed.source;
  if (source === null || source.kind !== desired.kind) return false;
  if (source.kind === "local" && desired.kind === "local") return source.root === desired.root;
  if (source.kind !== "git" || desired.kind !== "git") return false;
  return (
    source.repositoryUrl === desired.repositoryUrl &&
    (source.revision === null || source.revision === desired.revision)
  );
}

/** Determines whether an observed marketplace belongs to the selected source family. */
export function marketplaceSourceIsRelated(
  observed: NativeProviderMarketplaceObservation,
  desired: NativeMarketplaceSource
): boolean {
  const source = observed.source;
  if (source === null || source.kind !== desired.kind) return false;
  if (source.kind === "git" && desired.kind === "git") {
    return source.repositoryUrl === desired.repositoryUrl;
  }
  return source.kind === "local" && desired.kind === "local" && source.root === desired.root;
}

/** Selects the bounded payload manifest required for native file verification. */
export function verificationFiles(
  member: SelectedContentMember,
  provider: ProviderId
): readonly SelectedContentFile[] | null {
  const manifestPath =
    provider === "codex" ? ".codex-plugin/plugin.json" : ".claude-plugin/plugin.json";
  if (!member.manifest.some((file) => file.path === manifestPath)) return null;
  if (member.manifest.length > MAX_PROVIDER_VERIFICATION_FILES) return null;
  return Object.freeze(
    [...member.manifest].sort((left, right) => compareText(left.path, right.path))
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

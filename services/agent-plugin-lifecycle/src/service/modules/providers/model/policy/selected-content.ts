import type {
  NativeMarketplaceSource,
  NativeProviderMarketplaceObservation,
} from "@rawr/resource-native-agent-provider";
import { MAX_NATIVE_PROVIDER_PLUGIN_FILES } from "@rawr/resource-native-agent-provider";
import { Value } from "typebox/value";

import type {
  SelectedContent,
  SelectedContentFile,
  SelectedContentMember,
} from "../../../../model/dependencies/providers";
import { SelectedContentSchema } from "../../../../model/dto/provider-dependencies";
import type {
  ProviderId,
  ProviderIssue,
  ProviderIssueCode,
  SelectedContentObservation,
} from "../dto/provider-lifecycle";

export const MAX_PROVIDER_VERIFICATION_FILES = MAX_NATIVE_PROVIDER_PLUGIN_FILES;

export function providerIssue(
  code: ProviderIssueCode,
  detail: string,
  pluginId?: ProviderIssue["pluginId"]
): ProviderIssue {
  const issue = {
    code,
    detail: boundedDetail(detail),
    ...(pluginId === undefined ? {} : { pluginId }),
  };
  return Object.freeze(issue);
}

export function validateSelectedContent(content: SelectedContent): readonly ProviderIssue[] {
  const issues: ProviderIssue[] = [];
  if (!Value.Check(SelectedContentSchema, content)) {
    return Object.freeze([
      providerIssue(
        "DesiredContentInvalid",
        "Selected content does not match its TypeBox contract."
      ),
    ]);
  }
  const ownedNames = new Map<string, string>();
  for (const member of content.members) {
    collectOwnedName(ownedNames, member.pluginId, member.pluginId, issues);
    for (const alias of member.aliases)
      collectOwnedName(ownedNames, alias, member.pluginId, issues);
  }
  return Object.freeze(issues);
}

export function selectedContentObservation(content: SelectedContent): SelectedContentObservation {
  const [firstPluginId, ...remainingPluginIds] = content.members.map((member) => member.pluginId);
  if (firstPluginId === undefined) {
    throw new Error("Selected content must contain at least one member");
  }
  const pluginIds: SelectedContentObservation["pluginIds"] = Object.freeze([
    firstPluginId,
    ...remainingPluginIds,
  ]);
  return Object.freeze({
    repositoryIdentity: content.repositoryIdentity,
    sourceCommit: content.sourceCommit,
    sourceTree: content.sourceTree,
    releaseInputDigest: content.releaseInputDigest,
    releaseSetDigest: content.releaseSetDigest,
    pluginIds,
  });
}

export function sameSelectedContent(left: SelectedContent, right: SelectedContent): boolean {
  return (
    left.selectionKind === right.selectionKind &&
    left.contentAuthority === right.contentAuthority &&
    left.repositoryIdentity === right.repositoryIdentity &&
    left.sourceCommit === right.sourceCommit &&
    left.sourceTree === right.sourceTree &&
    left.releaseInputDigest === right.releaseInputDigest &&
    left.releaseSetDigest === right.releaseSetDigest &&
    sameMarketplaceSource(left.marketplace.source, right.marketplace.source) &&
    left.marketplace.identity === right.marketplace.identity &&
    sameMembers(left.members, right.members)
  );
}

export function providerPluginSelector(member: SelectedContentMember, identity: string): string {
  return `${member.pluginId}@${identity}`;
}

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

function collectOwnedName(
  owners: Map<string, string>,
  name: string,
  pluginId: SelectedContentMember["pluginId"],
  issues: ProviderIssue[]
): void {
  const existing = owners.get(name);
  if (existing !== undefined && existing !== pluginId) {
    issues.push(
      providerIssue(
        "DesiredContentInvalid",
        `Plugin ownership name ${name} is declared by both ${existing} and ${pluginId}.`,
        pluginId
      )
    );
    return;
  }
  owners.set(name, pluginId);
}

function sameMarketplaceSource(
  left: NativeMarketplaceSource,
  right: NativeMarketplaceSource
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "local" && right.kind === "local") return left.root === right.root;
  if (left.kind !== "git" || right.kind !== "git") return false;
  return (
    left.repositoryUrl === right.repositoryUrl &&
    left.revision === right.revision &&
    sameTextArray(left.sparsePaths, right.sparsePaths)
  );
}

function sameMembers(
  left: readonly SelectedContentMember[],
  right: readonly SelectedContentMember[]
): boolean {
  return (
    left.length === right.length &&
    left.every((member, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        member.pluginId === other.pluginId &&
        member.payloadDigest === other.payloadDigest &&
        member.releaseDigest === other.releaseDigest &&
        sameTextArray(member.aliases, other.aliases) &&
        member.manifest.length === other.manifest.length &&
        member.manifest.every((file, fileIndex) => {
          const otherFile = other.manifest[fileIndex];
          return (
            otherFile !== undefined &&
            file.path === otherFile.path &&
            file.mode === otherFile.mode &&
            file.byteLength === otherFile.byteLength &&
            file.contentDigest === otherFile.contentDigest
          );
        })
      );
    })
  );
}

function sameTextArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function boundedDetail(detail: string): string {
  if (detail.length <= 4_096) return detail;
  return `${detail.slice(0, 4_080)}...[truncated]`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

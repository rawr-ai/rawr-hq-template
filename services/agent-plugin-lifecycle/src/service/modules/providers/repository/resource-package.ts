import {
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  contentDigest,
  parseArtifactRef,
  parseContentAuthority,
  parseGitCommitId,
  parsePluginId,
  parseReleaseRelativePath,
  type ContentDigest,
  type NormalizedFileMode,
  type PluginId,
  type ReleaseArtifactRef,
  type ReleaseRelativePath,
} from "../../../shared/release";
import {
  canonicalBytes,
  canonicalDigest,
  equalBytes,
  type CanonicalValue,
} from "../model/helpers/canonical";
import { hookEventSlugsFromManifests } from "../model/helpers/hook-manifest";
import {
  PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
  artifactAuthorityValue,
  type ProviderArtifactAuthority,
  type ProviderMemberFingerprint,
  type ProviderSourceIdentity,
} from "../model/policy/projection";
import type { ProviderId } from "../model/dto/provider-target";
import type {
  NativeResourcePackageEntry,
  NativeResourcePackageObservation,
  NativeResourcePackageReadLimits,
} from "../../../model/dependencies/providers";

export const NATIVE_PACKAGE_READ_LIMITS: NativeResourcePackageReadLimits = Object.freeze({
  maxEntries: 200_000,
  maxBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
});

export interface NativePluginPackageObservation {
  readonly pluginId: PluginId;
  readonly nativeIdentity: string;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly memberFingerprint: ProviderMemberFingerprint;
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export interface NativePluginVisibilityObservation {
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export function inspectNativePluginVisibility(
  observation: NativeResourcePackageObservation
): NativePluginVisibilityObservation {
  const files = validatePackageFiles(observation);
  return Object.freeze({
    visibleSkills: visibleNames(files, /^skills\/([^/]+)\/SKILL\.md$/u),
    visibleHooks: hookEventSlugsFromManifests(files),
  });
}

export function inspectNativePluginPackage(
  observation: NativeResourcePackageObservation,
  provider: ProviderId
): NativePluginPackageObservation {
  const files = validatePackageFiles(observation);
  const manifestPath =
    provider === "codex" ? ".codex-plugin/plugin.json" : ".claude-plugin/plugin.json";
  const manifestFile = files.find((file) => file.path === manifestPath);
  if (manifestFile === undefined) throw new Error("Native plugin package has no provider manifest");
  const manifest = parseManifest(manifestFile.bytes);
  const skills = visibleNames(files, /^skills\/([^/]+)\/SKILL\.md$/u);
  const hooks = hookEventSlugsFromManifests(files);
  const memberFingerprint = canonicalDigest("pm1_", {
    pluginId: manifest.pluginId,
    releaseRef: {
      kind: manifest.releaseRef.kind,
      releaseDigest: manifest.releaseRef.releaseDigest,
      artifactDigest: manifest.releaseRef.artifactDigest,
    },
    artifactAuthority: artifactAuthorityValue(manifest.artifactAuthority),
    providerSourceIdentity: manifest.providerSourceIdentity,
    nativeIdentity: manifest.nativeIdentity,
    files: files.map((file) => ({
      path: file.path,
      mode: file.mode,
      contentDigest: file.contentDigest,
    })),
    visible: { pluginIdentity: manifest.nativeIdentity, skills, hooks },
  }) as ProviderMemberFingerprint;
  return Object.freeze({
    pluginId: manifest.pluginId,
    nativeIdentity: manifest.nativeIdentity,
    artifactAuthority: manifest.artifactAuthority,
    providerSourceIdentity: manifest.providerSourceIdentity,
    memberFingerprint,
    visibleSkills: skills,
    visibleHooks: hooks,
  });
}

type NativePackageFile = Readonly<{
  path: ReleaseRelativePath;
  mode: NormalizedFileMode;
  contentDigest: ContentDigest;
  bytes: Uint8Array;
}>;

function validatePackageFiles(
  observation: NativeResourcePackageObservation
): readonly NativePackageFile[] {
  const paths = new Set<string>();
  const files = [...observation.entries]
    .sort((left, right) => compareText(left.path, right.path))
    .map((entry) => validatePackageFile(entry));
  for (const file of files) {
    if (paths.has(file.path)) throw new Error("Native plugin package contains a duplicate path");
    paths.add(file.path);
  }
  return Object.freeze(files);
}

function validatePackageFile(entry: NativeResourcePackageEntry): NativePackageFile {
  const parsedPath = parseReleaseRelativePath(entry.path, "nativePackage.path");
  if (!parsedPath.ok || (entry.mode !== 0o644 && entry.mode !== 0o755)) {
    throw new Error(`Native plugin package file has an unsupported shape: ${entry.path}`);
  }
  return Object.freeze({
    path: parsedPath.value,
    mode: entry.mode,
    contentDigest: contentDigest(entry.bytes),
    bytes: new Uint8Array(entry.bytes),
  });
}

function parseManifest(bytes: Uint8Array): Readonly<{
  pluginId: PluginId;
  releaseRef: ReleaseArtifactRef;
  artifactAuthority: ProviderArtifactAuthority;
  providerSourceIdentity: ProviderSourceIdentity;
  nativeIdentity: string;
}> {
  const input = decodeJson(bytes, "Native plugin manifest");
  if (!isRecord(input) || !equalBytes(bytes, canonicalBytes(input as CanonicalValue))) {
    throw new Error("Native plugin manifest must be canonical JSON");
  }
  requireKeys(input, ["description", "name", "rawr", "skills", "version"]);
  const rawr = requireRecord(input.rawr, "native plugin rawr metadata");
  requireKeys(rawr, [
    "artifactAuthority",
    "artifactDigest",
    "nativeIdentity",
    "providerSourceIdentity",
    "releaseDigest",
  ]);
  const authorityInput = requireRecord(rawr.artifactAuthority, "native plugin artifact authority");
  requireKeys(authorityInput, ["contentAuthority", "protocol", "sourceCommit"]);
  if (authorityInput.protocol !== PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL) {
    throw new Error("Native plugin artifact authority protocol is invalid");
  }
  const pluginId = requireParsed(parsePluginId(input.name, "manifest.name"));
  const contentAuthority = requireParsed(
    parseContentAuthority(
      authorityInput.contentAuthority,
      "manifest.rawr.artifactAuthority.contentAuthority"
    )
  );
  const sourceCommit = requireParsed(
    parseGitCommitId(authorityInput.sourceCommit, "manifest.rawr.artifactAuthority.sourceCommit")
  );
  const releaseRef = requireParsed(
    parseArtifactRef({
      kind: "release",
      releaseDigest: rawr.releaseDigest,
      artifactDigest: rawr.artifactDigest,
    })
  );
  if (releaseRef.kind !== "release")
    throw new Error("Native plugin manifest must bind a release artifact");
  if (
    rawr.providerSourceIdentity !== contentAuthority ||
    rawr.nativeIdentity !== `rawr:${pluginId}` ||
    input.version !== `0.0.0-rawr.${sourceCommit.slice(0, 12)}`
  ) {
    throw new Error("Native plugin manifest identity does not match its artifact authority");
  }
  return Object.freeze({
    pluginId,
    releaseRef,
    artifactAuthority: Object.freeze({
      protocol: PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
      contentAuthority,
      sourceCommit,
    }),
    providerSourceIdentity: contentAuthority,
    nativeIdentity: rawr.nativeIdentity,
  });
}

function visibleNames(
  files: readonly Pick<NativePackageFile, "path">[],
  pattern: RegExp
): readonly string[] {
  const names = new Set<string>();
  for (const file of files) {
    const match = pattern.exec(file.path);
    if (match?.[1] !== undefined) names.add(match[1]);
  }
  return Object.freeze([...names].sort(compareText));
}

function decodeJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} is not canonical UTF-8 JSON`);
  }
}

function requireParsed<T>(result: Readonly<{ ok: true; value: T } | { ok: false }>): T {
  if (!result.ok) throw new Error("Native plugin manifest contains an invalid canonical value");
  return result.value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireKeys(record: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(record).sort(compareText);
  const sorted = [...expected].sort(compareText);
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    throw new Error("Native plugin manifest has an unexpected shape");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

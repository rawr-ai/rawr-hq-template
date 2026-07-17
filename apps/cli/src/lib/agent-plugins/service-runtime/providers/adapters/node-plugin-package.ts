import { constants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import path from "node:path";

import {
  contentDigest,
  parseArtifactRef,
  parseContentAuthority,
  parseGitCommitId,
  parsePluginId,
  type ContentDigest,
  type NormalizedFileMode,
  type PluginId,
  type ReleaseArtifactRef,
} from "@rawr/agent-plugin-lifecycle/release";

import { canonicalBytes, canonicalDigest, equalBytes, type CanonicalValue } from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
  artifactAuthorityValue,
  type ProviderArtifactAuthority,
  type ProviderMemberFingerprint,
  type ProviderSourceIdentity,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { ProviderId } from "@rawr/agent-plugin-lifecycle/ports/providers";

export interface NodeNativePluginPackage {
  readonly pluginId: PluginId;
  readonly nativeIdentity: string;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly memberFingerprint: ProviderMemberFingerprint;
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export interface NodePluginVisibility {
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export async function inspectNodePluginVisibility(
  packageRoot: string,
): Promise<NodePluginVisibility> {
  const files = await readPackageFiles(packageRoot);
  return Object.freeze({
    visibleSkills: visibleNames(files, /^skills\/([^/]+)\/SKILL\.md$/u),
    visibleHooks: visibleNames(files, /^(?:hooks|\.claude-plugin\/hooks|\.codex-plugin\/hooks)\/([^/]+)/u),
  });
}

export async function inspectNodeNativePluginPackage(
  packageRoot: string,
  provider: ProviderId,
): Promise<NodeNativePluginPackage> {
  const files = await readPackageFiles(packageRoot);
  const manifestPath = provider === "codex"
    ? ".codex-plugin/plugin.json"
    : ".claude-plugin/plugin.json";
  const manifestFile = files.find((file) => file.path === manifestPath);
  if (manifestFile === undefined) throw new Error("Native plugin package has no provider manifest");
  const manifest = parseManifest(manifestFile.bytes);
  const skills = visibleNames(files, /^skills\/([^/]+)\/SKILL\.md$/u);
  const hooks = visibleNames(files, /^(?:hooks|\.claude-plugin\/hooks|\.codex-plugin\/hooks)\/([^/]+)/u);
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
  path: string;
  mode: NormalizedFileMode;
  contentDigest: ContentDigest;
  bytes: Uint8Array;
}>;

async function readPackageFiles(packageRoot: string): Promise<readonly NativePackageFile[]> {
  const rootStatus = await lstat(packageRoot);
  if (!rootStatus.isDirectory() || rootStatus.isSymbolicLink()) {
    throw new Error("Native plugin package root must be a non-symlink directory");
  }
  const paths: string[] = [];
  await walk(packageRoot, "", paths);
  paths.sort((left, right) => left.localeCompare(right, "en"));
  const files: NativePackageFile[] = [];
  for (const relativePath of paths) {
    const filePath = path.join(packageRoot, ...relativePath.split("/"));
    const status = await lstat(filePath, { bigint: true });
    const mode = Number(status.mode & 0o777n);
    if (!status.isFile() || status.isSymbolicLink() || (mode !== 0o644 && mode !== 0o755)) {
      throw new Error(`Native plugin package file has an unsupported shape: ${relativePath}`);
    }
    const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const bytes = new Uint8Array(await handle.readFile());
      files.push(Object.freeze({
        path: relativePath,
        mode,
        contentDigest: contentDigest(bytes),
        bytes,
      } as NativePackageFile));
    } finally {
      await handle.close();
    }
  }
  return Object.freeze(files);
}

async function walk(root: string, relativeRoot: string, files: string[]): Promise<void> {
  const entries = await readdir(path.join(root, relativeRoot), { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = relativeRoot === "" ? entry.name : `${relativeRoot}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error("Native plugin package cannot contain symlinks");
    if (entry.isDirectory()) {
      await walk(root, relativePath, files);
      continue;
    }
    if (!entry.isFile()) throw new Error("Native plugin package contains an unsupported entry");
    files.push(relativePath);
  }
}

function parseManifest(bytes: Uint8Array): Readonly<{
  pluginId: PluginId;
  releaseRef: ReleaseArtifactRef;
  artifactAuthority: ProviderArtifactAuthority;
  providerSourceIdentity: ProviderSourceIdentity;
  nativeIdentity: string;
}> {
  const input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  if (!isRecord(input) || !equalBytes(bytes, canonicalBytes(input as CanonicalValue))) {
    throw new Error("Native plugin manifest must be canonical JSON");
  }
  requireKeys(input, ["description", "name", "rawr", "skills", "version"]);
  const rawr = requireRecord(input.rawr, "native plugin rawr metadata");
  requireKeys(rawr, ["artifactAuthority", "artifactDigest", "nativeIdentity", "providerSourceIdentity", "releaseDigest"]);
  const authorityInput = requireRecord(rawr.artifactAuthority, "native plugin artifact authority");
  requireKeys(authorityInput, ["contentAuthority", "protocol", "sourceCommit"]);
  if (authorityInput.protocol !== PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL) {
    throw new Error("Native plugin artifact authority protocol is invalid");
  }
  const pluginId = requireParsed(parsePluginId(input.name, "manifest.name"));
  const contentAuthority = requireParsed(parseContentAuthority(
    authorityInput.contentAuthority,
    "manifest.rawr.artifactAuthority.contentAuthority",
  ));
  const sourceCommit = requireParsed(parseGitCommitId(
    authorityInput.sourceCommit,
    "manifest.rawr.artifactAuthority.sourceCommit",
  ));
  const releaseRef = requireParsed(parseArtifactRef({
    kind: "release",
    releaseDigest: rawr.releaseDigest,
    artifactDigest: rawr.artifactDigest,
  }));
  if (releaseRef.kind !== "release") throw new Error("Native plugin manifest must bind a release artifact");
  if (
    rawr.providerSourceIdentity !== contentAuthority
    || rawr.nativeIdentity !== `rawr:${pluginId}`
    || input.version !== `0.0.0-rawr.${sourceCommit.slice(0, 12)}`
  ) {
    throw new Error("Native plugin manifest identity does not match its artifact authority");
  }
  const artifactAuthority = Object.freeze({
    protocol: PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
    contentAuthority,
    sourceCommit,
  });
  return Object.freeze({
    pluginId,
    releaseRef,
    artifactAuthority,
    providerSourceIdentity: contentAuthority,
    nativeIdentity: rawr.nativeIdentity,
  });
}

function visibleNames(files: readonly Pick<NativePackageFile, "path">[], pattern: RegExp): readonly string[] {
  const names = new Set<string>();
  for (const file of files) {
    const match = pattern.exec(file.path);
    if (match?.[1] !== undefined) names.add(match[1]);
  }
  return Object.freeze([...names].sort((left, right) => left.localeCompare(right, "en")));
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
  const actual = Object.keys(record).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    throw new Error("Native plugin manifest has an unexpected shape");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

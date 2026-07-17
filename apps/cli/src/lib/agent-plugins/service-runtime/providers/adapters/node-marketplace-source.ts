import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import {
  parseContentAuthority,
  parsePluginId,
} from "@rawr/agent-plugin-lifecycle/release";

import { canonicalBytes, equalBytes, type CanonicalValue } from "@rawr/agent-plugin-lifecycle/ports/providers";
import { createProviderMarketplaceRegistration, type ProviderMarketplaceRegistration } from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  parseAdapterProtocol,
  parseProjectionDigest,
  type AdapterProtocol,
  type ProviderMemberFingerprint,
  type ProviderSourceIdentity,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { ProviderId } from "@rawr/agent-plugin-lifecycle/ports/providers";

export async function readNodeMarketplaceSource(input: Readonly<{
  allowedRoot: string;
  sourcePath: string;
  provider: ProviderId;
  adapterProtocol: AdapterProtocol;
}>): Promise<ProviderMarketplaceRegistration> {
  const sourcePath = await requireContainedDirectory(input.allowedRoot, input.sourcePath);
  const metadataPath = path.join(sourcePath, ".rawr", "marketplace.json");
  const handle = await open(metadataPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await handle.readFile());
  } finally {
    await handle.close();
  }
  const decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  if (!isRecord(decoded) || !equalBytes(canonicalBytes(decoded as CanonicalValue), bytes)) {
    throw new Error("Provider marketplace source metadata is not canonical JSON");
  }
  requireKeys(decoded, [
    "marketplaceIdentity",
    "members",
    "projectionDigest",
    "protocol",
    "provider",
    "sourceDigest",
  ]);
  if (decoded.protocol !== "agent-provider-marketplace-source@v1" || decoded.provider !== input.provider) {
    throw new Error("Provider marketplace source protocol or provider is invalid");
  }
  const identity = requireParsed(parseContentAuthority(decoded.marketplaceIdentity, "marketplaceIdentity"));
  const members = parseMembers(decoded.members, identity);
  const registration = createProviderMarketplaceRegistration({
    provider: input.provider,
    adapterProtocol: input.adapterProtocol,
    marketplaceIdentity: identity,
    members,
  });
  if (
    decoded.projectionDigest !== registration.projectionDigest
    || decoded.sourceDigest !== registration.sourceDigest
    || path.basename(sourcePath) !== registration.projectionDigest
  ) {
    throw new Error("Provider marketplace source digest metadata is invalid");
  }
  return registration;
}

export function requireNodeAdapterProtocol(value: string): AdapterProtocol {
  return requireParsed(parseAdapterProtocol(value));
}

async function requireContainedDirectory(allowedRoot: string, sourcePath: string): Promise<string> {
  if (!path.isAbsolute(allowedRoot) || !path.isAbsolute(sourcePath)) {
    throw new Error("Provider marketplace source paths must be absolute");
  }
  const [root, source] = await Promise.all([realpath(allowedRoot), realpath(sourcePath)]);
  const status = await lstat(source);
  const relative = path.relative(root, source);
  if (
    !status.isDirectory()
    || status.isSymbolicLink()
    || relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error("Provider marketplace source escaped the controller marketplace root");
  }
  return source;
}

function parseMembers(
  value: unknown,
  marketplaceIdentity: ProviderSourceIdentity,
): ProviderMarketplaceRegistration["members"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Provider marketplace source must contain managed members");
  }
  return Object.freeze(value.map((entry) => {
    const member = requireRecord(entry, "marketplace member");
    requireKeys(member, [
      "memberFingerprint",
      "nativeIdentity",
      "pluginId",
      "providerSourceIdentity",
      "sourceProjectionDigest",
    ]);
    const pluginId = requireParsed(parsePluginId(member.pluginId, "marketplace.member.pluginId"));
    const sourceIdentity = requireParsed(parseContentAuthority(
      member.providerSourceIdentity,
      "marketplace.member.providerSourceIdentity",
    ));
    const sourceProjectionDigest = requireParsed(parseProjectionDigest(
      member.sourceProjectionDigest,
      "marketplace.member.sourceProjectionDigest",
    ));
    if (
      sourceIdentity !== marketplaceIdentity
      || member.nativeIdentity !== `rawr:${pluginId}`
      || typeof member.memberFingerprint !== "string"
      || !/^pm1_[0-9a-f]{64}$/u.test(member.memberFingerprint)
    ) {
      throw new Error("Provider marketplace member identity is invalid");
    }
    return Object.freeze({
      pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: sourceIdentity,
      sourceProjectionDigest,
      memberFingerprint: member.memberFingerprint as ProviderMemberFingerprint,
    });
  }));
}

function requireParsed<T>(result: Readonly<{ ok: true; value: T } | { ok: false }>): T {
  if (!result.ok) throw new Error("Provider marketplace source contains an invalid canonical value");
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
    throw new Error("Provider marketplace source metadata has an unexpected shape");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

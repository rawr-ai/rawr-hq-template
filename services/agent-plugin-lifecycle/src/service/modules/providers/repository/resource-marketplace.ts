import type { NativeResourcePackageObservation } from "../../../model/dependencies/providers";
import { parseContentAuthority, parsePluginId } from "../../../shared/release";
import type { ProviderId } from "../model/dto/provider-target";
import { type CanonicalValue, canonicalBytes, equalBytes } from "../model/helpers/canonical";
import {
  createProviderMarketplaceRegistration,
  type ProviderMarketplaceRegistration,
} from "../model/policy/marketplace";
import {
  type AdapterProtocol,
  type ProviderMemberFingerprint,
  type ProviderSourceIdentity,
  parseProjectionDigest,
} from "../model/policy/projection";

const MARKETPLACE_METADATA_PATH = ".rawr/marketplace.json";

export function inspectMarketplaceSource(
  input: Readonly<{
    observation: NativeResourcePackageObservation;
    provider: ProviderId;
    adapterProtocol: AdapterProtocol;
  }>
): ProviderMarketplaceRegistration {
  const matches = input.observation.entries.filter(
    (entry) => entry.path === MARKETPLACE_METADATA_PATH
  );
  if (matches.length !== 1)
    throw new Error("Provider marketplace source has no unique metadata file");
  const metadata = matches[0];
  if (metadata === undefined || metadata.mode !== 0o644) {
    throw new Error("Provider marketplace source metadata has an unsupported mode");
  }
  const decoded = decodeJson(metadata.bytes);
  if (
    !isRecord(decoded) ||
    !equalBytes(canonicalBytes(decoded as CanonicalValue), metadata.bytes)
  ) {
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
  if (
    decoded.protocol !== "agent-provider-marketplace-source@v1" ||
    decoded.provider !== input.provider
  ) {
    throw new Error("Provider marketplace source protocol or provider is invalid");
  }
  const identity = requireParsed(
    parseContentAuthority(decoded.marketplaceIdentity, "marketplaceIdentity")
  );
  const registration = createProviderMarketplaceRegistration({
    provider: input.provider,
    adapterProtocol: input.adapterProtocol,
    marketplaceIdentity: identity,
    members: parseMembers(decoded.members, identity),
  });
  if (
    decoded.projectionDigest !== registration.projectionDigest ||
    decoded.sourceDigest !== registration.sourceDigest
  ) {
    throw new Error("Provider marketplace source digest metadata is invalid");
  }
  return registration;
}

function parseMembers(
  value: unknown,
  marketplaceIdentity: ProviderSourceIdentity
): ProviderMarketplaceRegistration["members"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Provider marketplace source must contain managed members");
  }
  return Object.freeze(
    value.map((entry) => {
      const member = requireRecord(entry, "marketplace member");
      requireKeys(member, [
        "memberFingerprint",
        "nativeIdentity",
        "pluginId",
        "providerSourceIdentity",
        "sourceProjectionDigest",
      ]);
      const pluginId = requireParsed(parsePluginId(member.pluginId, "marketplace.member.pluginId"));
      const sourceIdentity = requireParsed(
        parseContentAuthority(
          member.providerSourceIdentity,
          "marketplace.member.providerSourceIdentity"
        )
      );
      const sourceProjectionDigest = requireParsed(
        parseProjectionDigest(
          member.sourceProjectionDigest,
          "marketplace.member.sourceProjectionDigest"
        )
      );
      if (
        sourceIdentity !== marketplaceIdentity ||
        member.nativeIdentity !== `rawr:${pluginId}` ||
        typeof member.memberFingerprint !== "string" ||
        !/^pm1_[0-9a-f]{64}$/u.test(member.memberFingerprint)
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
    })
  );
}

function decodeJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("Provider marketplace source metadata is not canonical UTF-8 JSON");
  }
}

function requireParsed<T>(result: Readonly<{ ok: true; value: T } | { ok: false }>): T {
  if (!result.ok)
    throw new Error("Provider marketplace source contains an invalid canonical value");
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
    throw new Error("Provider marketplace source metadata has an unexpected shape");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

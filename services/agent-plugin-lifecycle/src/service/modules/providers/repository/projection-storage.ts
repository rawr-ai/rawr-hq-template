import {
  createProviderMarketplaceRegistration,
  type ProviderMarketplaceRegistration,
} from "../model/policy/marketplace";
import type {
  AgentProviderProjection,
  ProviderMemberFingerprint,
  ProviderProjectionMember,
} from "../model/policy/projection";
import { failure, issue, success, type DeploymentResult } from "../model/errors/deployment-result";
import type { ProviderId, ProviderTarget } from "../model/dto/provider-target";
import type {
  ImmutableProviderTreeCollection,
  ImmutableProviderTreeFile,
  ImmutableProviderTreeKey,
  FlatProjectionRecordCollection,
  ProjectionRecordKey,
} from "../model/repositories/projection-storage";
import type {
  ProviderMarketplaceMaterializer,
  ProviderMarketplaceSource,
  ProviderMarketplaceSourceReader,
  ProviderProjectionMaterializer,
  MarketplaceMaterializationObservation,
  ProjectionMaterializationObservation,
} from "../model/repositories/state";
import {
  decodeProjectionManifest,
  decodeProjectionMemberRecord,
  marketplaceTreeFiles,
  memberTreeFiles,
  projectionManifestRecordBytes,
  projectionMemberRecordBytes,
  sameTree,
  validateMemberTree,
  validateProjectionPayload,
} from "./projection-storage-codec";

export interface PathlessProjectionStorage {
  readonly projectionMaterializer: ProviderProjectionMaterializer;
  readonly marketplaceMaterializer: ProviderMarketplaceMaterializer;
  readonly marketplaceSources: ProviderMarketplaceSourceReader;
}

/**
 * Interprets generic immutable collections as lifecycle projection storage.
 * The collections never learn projection codecs or publication order, and the
 * service never learns a filesystem or artifact address.
 */
export function createPathlessProjectionStorage(input: Readonly<{
  records: FlatProjectionRecordCollection;
  trees: ImmutableProviderTreeCollection;
}>): PathlessProjectionStorage {
  const inspectMember = async (
    projectionDigest: AgentProviderProjection["projectionDigest"],
    member: Pick<ProviderProjectionMember, "memberFingerprint">,
  ): Promise<DeploymentResult<readonly ImmutableProviderTreeFile[]>> => {
    const manifest = await input.records.read(manifestKey(projectionDigest));
    if (!manifest.ok) return manifest;
    if (manifest.value.kind === "absent") {
      return projectionFailure("projection.manifest", "Projection manifest is absent");
    }
    let decodedManifest;
    try {
      decodedManifest = decodeProjectionManifest(manifest.value.bytes, projectionDigest);
    } catch (error) {
      return projectionError("projection.manifest", error);
    }
    if (!decodedManifest.memberFingerprints.includes(member.memberFingerprint)) {
      return projectionFailure(
        "projection.manifest.members",
        "Projection manifest does not contain the requested member fingerprint",
      );
    }
    return await inspectMemberByFingerprint(member.memberFingerprint);
  };

  const inspectMemberByFingerprint = async (
    memberFingerprint: ProviderMemberFingerprint,
  ): Promise<DeploymentResult<readonly ImmutableProviderTreeFile[]>> => {
    const record = await input.records.read(memberKey(memberFingerprint));
    if (!record.ok) return record;
    if (record.value.kind === "absent") {
      return projectionFailure("projection.member.record", "Projection member record is absent");
    }
    const tree = await input.trees.read(memberTreeKey(memberFingerprint));
    if (!tree.ok) return tree;
    if (tree.value.kind === "absent") {
      return projectionFailure("projection.member.tree", "Projection member tree is absent");
    }
    try {
      const decoded = decodeProjectionMemberRecord(record.value.bytes, memberFingerprint);
      validateMemberTree(decoded, tree.value.files);
      return success(tree.value.files);
    } catch (error) {
      return projectionError("projection.member", error);
    }
  };

  const projectionMaterializer: ProviderProjectionMaterializer = Object.freeze({
    async materialize(
      projection: AgentProviderProjection,
    ): Promise<DeploymentResult<ProjectionMaterializationObservation>> {
      try {
        validateProjectionPayload(projection);
      } catch (error) {
        return projectionError("projection", error);
      }
      const key = manifestKey(projection.projectionDigest);
      const manifestBytes = projectionManifestRecordBytes(projection);
      const existing = await input.records.read(key);
      if (!existing.ok) return existing;
      if (existing.value.kind === "present") {
        if (!sameBytes(existing.value.bytes, manifestBytes)) {
          return projectionFailure("projection.manifest", "Projection manifest conflicts with immutable authority");
        }
        const verified = await verifyProjectionMembers(projection, input.records, input.trees);
        return verified.ok
          ? success(Object.freeze({ kind: "existing", projectionDigest: projection.projectionDigest }))
          : verified;
      }

      let published = false;
      for (const member of projection.members) {
        const treePublication = await publishTreeExact(
          input.trees,
          memberTreeKey(member.memberFingerprint),
          memberTreeFiles(member),
        );
        if (!treePublication.ok) return treePublication;
        if (treePublication.value === "published") published = true;
        const recordPublication = await publishRecordExact(
          input.records,
          memberKey(member.memberFingerprint),
          projectionMemberRecordBytes(member),
        );
        if (!recordPublication.ok) return recordPublication;
        if (recordPublication.value === "published") published = true;
      }
      const verified = await verifyProjectionMembers(projection, input.records, input.trees);
      if (!verified.ok) return verified;

      // The manifest is the only completion marker. Member/tree publication may
      // be retried safely, but it is never authoritative before this write.
      const manifestPublication = await publishRecordExact(input.records, key, manifestBytes);
      if (!manifestPublication.ok) return manifestPublication;
      if (manifestPublication.value === "published") published = true;
      return success(Object.freeze({
        kind: published ? "published" : "existing",
        projectionDigest: projection.projectionDigest,
      }));
    },
  });

  const prepareMarketplace = async (
    registration: ProviderMarketplaceRegistration,
  ): Promise<DeploymentResult<Readonly<{
    key: ImmutableProviderTreeKey;
    files: readonly ImmutableProviderTreeFile[];
  }>>> => {
    const canonical = canonicalRegistration(registration);
    if (!canonical.ok) return canonical;
    const normalized = canonical.value;
    const trees = new Map<ProviderMemberFingerprint, readonly ImmutableProviderTreeFile[]>();
    for (const member of normalized.members) {
      const source = await inspectMember(member.sourceProjectionDigest, member);
      if (!source.ok) return source;
      const record = await input.records.read(memberKey(member.memberFingerprint));
      if (!record.ok) return record;
      if (record.value.kind === "absent") {
        return projectionFailure("marketplace.member.record", "Marketplace member record is absent");
      }
      try {
        const decoded = decodeProjectionMemberRecord(record.value.bytes, member.memberFingerprint);
        validateMarketplaceMember(decoded.member, member);
      } catch (error) {
        return projectionError("marketplace.member", error);
      }
      trees.set(member.memberFingerprint, source.value);
    }
    let expected: readonly ImmutableProviderTreeFile[];
    try {
      expected = marketplaceTreeFiles(normalized, trees);
    } catch (error) {
      return projectionError("marketplace.tree", error);
    }
    return success(Object.freeze({ key: marketplaceTreeKey(normalized), files: expected }));
  };

  const materializeMarketplace = async (
    registration: ProviderMarketplaceRegistration,
  ): Promise<DeploymentResult<MarketplaceMaterializationObservation>> => {
    const prepared = await prepareMarketplace(registration);
    if (!prepared.ok) return prepared;
    const publication = await publishTreeExact(input.trees, prepared.value.key, prepared.value.files);
    if (!publication.ok) return publication;
    return success(Object.freeze({
      kind: publication.value,
      projectionDigest: registration.projectionDigest,
      sourceDigest: registration.sourceDigest,
    }));
  };

  const marketplaceMaterializer: ProviderMarketplaceMaterializer = Object.freeze({
    async materialize(
      provider: ProviderId,
      registration: ProviderMarketplaceRegistration,
    ): Promise<DeploymentResult<MarketplaceMaterializationObservation>> {
      if (provider !== registration.provider) {
        return projectionFailure("marketplace.provider", "Marketplace registration belongs to another provider");
      }
      return await materializeMarketplace(registration);
    },
  });

  const marketplaceSources: ProviderMarketplaceSourceReader = Object.freeze({
    async read(
      target: ProviderTarget,
      registration: ProviderMarketplaceRegistration,
    ): Promise<DeploymentResult<ProviderMarketplaceSource>> {
      if (target.provider !== registration.provider) {
        return projectionFailure("marketplace.provider", "Marketplace source belongs to another provider");
      }
      const prepared = await prepareMarketplace(registration);
      if (!prepared.ok) return prepared;
      const observed = await input.trees.read(prepared.value.key);
      if (!observed.ok) return observed;
      if (observed.value.kind === "absent" || !sameTree(observed.value.files, prepared.value.files)) {
        return projectionFailure(
          "marketplace.tree",
          "Marketplace source is absent or conflicts with immutable authority",
        );
      }
      return success(marketplaceSource(registration));
    },
  });

  return Object.freeze({
    projectionMaterializer,
    marketplaceMaterializer,
    marketplaceSources,
  });
}

async function verifyProjectionMembers(
  projection: AgentProviderProjection,
  records: FlatProjectionRecordCollection,
  trees: ImmutableProviderTreeCollection,
): Promise<DeploymentResult<null>> {
  for (const member of projection.members) {
    const expectedRecord = projectionMemberRecordBytes(member);
    const record = await records.read(memberKey(member.memberFingerprint));
    if (!record.ok) return record;
    if (record.value.kind === "absent" || !sameBytes(record.value.bytes, expectedRecord)) {
      return projectionFailure(
        "projection.member.record",
        "Projection member record is absent or conflicts with immutable authority",
      );
    }
    const tree = await trees.read(memberTreeKey(member.memberFingerprint));
    if (!tree.ok) return tree;
    if (tree.value.kind === "absent" || !sameTree(tree.value.files, memberTreeFiles(member))) {
      return projectionFailure(
        "projection.member.tree",
        "Projection member tree is absent or conflicts with immutable authority",
      );
    }
  }
  return success(null);
}

async function publishRecordExact(
  records: FlatProjectionRecordCollection,
  key: ProjectionRecordKey,
  bytes: Uint8Array,
): Promise<DeploymentResult<"existing" | "published">> {
  const before = await records.read(key);
  if (!before.ok) return before;
  if (before.value.kind === "present") {
    return sameBytes(before.value.bytes, bytes)
      ? success("existing")
      : projectionFailure("projection.record", "Immutable projection record conflicts with requested bytes");
  }
  const published = await records.publish(key, bytes);
  if (!published.ok) return published;
  const after = await records.read(key);
  if (!after.ok) return after;
  return after.value.kind === "present" && sameBytes(after.value.bytes, bytes)
    ? success(published.value.kind)
    : projectionFailure("projection.record", "Projection record publication did not produce exact bytes");
}

async function publishTreeExact(
  trees: ImmutableProviderTreeCollection,
  key: ImmutableProviderTreeKey,
  files: readonly ImmutableProviderTreeFile[],
): Promise<DeploymentResult<"existing" | "published">> {
  const before = await trees.read(key);
  if (!before.ok) return before;
  if (before.value.kind === "present") {
    return sameTree(before.value.files, files)
      ? success("existing")
      : projectionFailure("projection.tree", "Immutable provider tree conflicts with requested files");
  }
  const published = await trees.publish(key, files);
  if (!published.ok) return published;
  const after = await trees.read(key);
  if (!after.ok) return after;
  return after.value.kind === "present" && sameTree(after.value.files, files)
    ? success(published.value.kind)
    : projectionFailure("projection.tree", "Provider tree publication did not produce exact files");
}

function canonicalRegistration(
  registration: ProviderMarketplaceRegistration,
): DeploymentResult<ProviderMarketplaceRegistration> {
  try {
    const canonical = createProviderMarketplaceRegistration({
      provider: registration.provider,
      adapterProtocol: registration.adapterProtocol,
      marketplaceIdentity: registration.marketplaceIdentity,
      members: registration.members,
    });
    return canonical.projectionDigest === registration.projectionDigest
      && canonical.sourceDigest === registration.sourceDigest
      ? success(canonical)
      : projectionFailure("marketplace", "Marketplace registration digests are invalid");
  } catch (error) {
    return projectionError("marketplace", error);
  }
}

function validateMarketplaceMember(
  record: Readonly<Record<string, unknown>>,
  member: ProviderMarketplaceRegistration["members"][number],
): void {
  if (
    record.pluginId !== member.pluginId
    || record.nativeIdentity !== member.nativeIdentity
    || record.providerSourceIdentity !== member.providerSourceIdentity
    || record.memberFingerprint !== member.memberFingerprint
  ) {
    throw new Error("Marketplace member record changed from its registration");
  }
}

function manifestKey(projectionDigest: AgentProviderProjection["projectionDigest"]): ProjectionRecordKey {
  return Object.freeze({ kind: "manifest", projectionDigest });
}

function memberKey(memberFingerprint: ProviderMemberFingerprint): ProjectionRecordKey {
  return Object.freeze({ kind: "member", memberFingerprint });
}

function memberTreeKey(memberFingerprint: ProviderMemberFingerprint): ImmutableProviderTreeKey {
  return Object.freeze({ kind: "member", memberFingerprint });
}

function marketplaceTreeKey(registration: ProviderMarketplaceRegistration): ImmutableProviderTreeKey {
  return Object.freeze({
    kind: "marketplace",
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
  });
}

function marketplaceSource(registration: ProviderMarketplaceRegistration): ProviderMarketplaceSource {
  return Object.freeze({
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
  });
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function projectionFailure<T>(path: string, message: string): DeploymentResult<T> {
  return failure([issue("PROJECTION_MISMATCH", path, message)]);
}

function projectionError<T>(path: string, error: unknown): DeploymentResult<T> {
  return projectionFailure(path, error instanceof Error ? error.message : String(error));
}

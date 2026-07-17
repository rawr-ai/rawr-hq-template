import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { contentDigest } from "@rawr/agent-plugin-lifecycle/release";

import { canonicalBytes, canonicalDigest, equalBytes, type CanonicalValue } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type {
  MarketplaceProjectionDigest,
  ProviderMarketplaceRegistration,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
  providerSourceTreeValue,
  memberValue,
  projectionValue,
  type AgentProviderProjection,
  type ProjectionDigest,
  type ProviderProjectionMember,
  type ProviderSourceDigest,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import { failure, issue, success, type DeploymentResult } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { NativeMemberObservation } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { ProviderId, ProviderTarget } from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { NodeRuntimeLayout } from "./filesystem";
import { ensureCanonicalDirectory, publishImmutableFile, readOptionalRegularFile } from "./filesystem";

export interface NodeProjectionMemberSource {
  readonly path: string;
  readonly projectionDigest: ProjectionDigest;
  readonly memberFingerprint: ProviderProjectionMember["memberFingerprint"];
}

export interface NodeProjectionMaterialization {
  readonly kind: "existing" | "published";
  readonly projectionDigest: AgentProviderProjection["projectionDigest"];
  readonly manifestPath: string;
  readonly members: readonly NodeProjectionMemberSource[];
}

export interface NodeMarketplaceSource {
  readonly path: string;
  readonly projectionDigest: MarketplaceProjectionDigest;
  readonly sourceDigest: ProviderSourceDigest;
}

export interface NodeProjectionStore {
  materialize(projection: AgentProviderProjection): Promise<DeploymentResult<NodeProjectionMaterialization>>;
  inspect(projection: AgentProviderProjection): Promise<DeploymentResult<NodeProjectionMaterialization>>;
  materializeMarketplace(
    provider: ProviderId,
    registration: ProviderMarketplaceRegistration,
  ): Promise<DeploymentResult<NodeMarketplaceSource & Readonly<{ kind: "existing" | "published" }>>>;
  readMarketplace(input: Readonly<{
    target: ProviderTarget;
    registration: ProviderMarketplaceRegistration;
  }>): Promise<DeploymentResult<NodeMarketplaceSource>>;
  read(input: Readonly<{
    target: ProviderTarget;
    projectionDigest: ProjectionDigest;
    member: ProviderProjectionMember;
  }>): Promise<DeploymentResult<NodeProjectionMemberSource>>;
  readArchivedMember(
    projectionDigest: ProjectionDigest,
    prior: NativeMemberObservation,
  ): Promise<DeploymentResult<NodeProjectionMemberSource>>;
}

export function createNodeProjectionStore(layout: NodeRuntimeLayout): NodeProjectionStore {
  const inspect = async (
    projection: AgentProviderProjection,
  ): Promise<DeploymentResult<NodeProjectionMaterialization>> => {
    try {
      verifyProjectionPayload(projection);
      const members = projection.members.map((member) => memberSource(layout, projection.projectionDigest, member));
      await verifyProjectionSource(
        projectionSourceRoot(layout, projection.projectionDigest),
        projection.marketplace.sourceDigest,
      );
      for (const [index, member] of projection.members.entries()) {
        const bytes = await readOptionalRegularFile(memberArchivePath(layout, member.memberFingerprint));
        if (bytes === null || !equalBytes(bytes, memberBytes(member))) {
          return failure([issue(
            "PROJECTION_MISMATCH",
            `projection.members[${index}]`,
            "Stable projection member is missing or does not match canonical bytes",
            member.memberFingerprint,
            bytes === null ? "absent" : "different bytes",
          )]);
        }
      }
      const manifestPath = projectionManifestPath(layout, projection);
      const manifest = await readOptionalRegularFile(manifestPath);
      if (manifest === null || !equalBytes(manifest, projectionBytes(projection))) {
        return failure([issue(
          "PROJECTION_MISMATCH",
          "projection.manifest",
          "Stable projection manifest is missing or does not match canonical bytes",
          projection.projectionDigest,
          manifest === null ? "absent" : "different bytes",
        )]);
      }
      return success(Object.freeze({
        kind: "existing",
        projectionDigest: projection.projectionDigest,
        manifestPath,
        members: Object.freeze(members),
      }));
    } catch (error) {
      return failure([stateFailure("PROJECTION_MISMATCH", "projection", error)]);
    }
  };

  const materialize = async (
    projection: AgentProviderProjection,
  ): Promise<DeploymentResult<NodeProjectionMaterialization>> => {
    try {
      verifyProjectionPayload(projection);
      let published = false;
      const sourceRoot = projectionSourceRoot(layout, projection.projectionDigest);
      const sourcePublication = await publishProjectionSourceDirectory(
        layout,
        sourceRoot,
        projectionSourceFiles(projection),
      );
      if (sourcePublication.kind === "published") published = true;
      const members: NodeProjectionMemberSource[] = projection.members.map((member) =>
        memberSource(layout, projection.projectionDigest, member));
      for (const member of projection.members) {
        const archive = await publishImmutableFile(
          layout.projection,
          memberArchivePath(layout, member.memberFingerprint),
          memberBytes(member),
        );
        if (archive.kind === "published") published = true;
      }
      const manifestPath = projectionManifestPath(layout, projection);
      const manifest = await publishImmutableFile(layout.projection, manifestPath, projectionBytes(projection));
      if (manifest.kind === "published") published = true;
      return success(Object.freeze({
        kind: published ? "published" : "existing",
        projectionDigest: projection.projectionDigest,
        manifestPath,
        members: Object.freeze(members),
      }));
    } catch (error) {
      return failure([stateFailure("MUTATION_FAILED", "projection.materialization", error)]);
    }
  };

  const read = async (input: Readonly<{
    target: ProviderTarget;
    projectionDigest: ProjectionDigest;
    member: ProviderProjectionMember;
  }>): Promise<DeploymentResult<NodeProjectionMemberSource>> => {
    try {
      verifyMemberPayload(input.member);
      const archive = await readProjectionArchive(layout, input.projectionDigest);
      if (!archive.memberFingerprints.includes(input.member.memberFingerprint)) {
        throw new Error("Stable projection source does not contain the requested member fingerprint");
      }
      const source = memberSource(layout, input.projectionDigest, input.member);
      await verifyProjectionSource(source.path, archive.sourceDigest);
      const bytes = await readOptionalRegularFile(memberArchivePath(layout, input.member.memberFingerprint));
      if (bytes === null || !equalBytes(bytes, memberBytes(input.member))) {
        return failure([issue(
          "PROJECTION_MISMATCH",
          `target.${input.target.targetDigest}.projectionSource`,
          "Native mutation requires the exact stable projection member",
          input.member.memberFingerprint,
          bytes === null ? "absent" : "different bytes",
        )]);
      }
      return success(source);
    } catch (error) {
      return failure([stateFailure("PROJECTION_MISMATCH", "projection.member", error)]);
    }
  };

  const readArchivedMember = async (
    projectionDigest: ProjectionDigest,
    prior: NativeMemberObservation,
  ): Promise<DeploymentResult<NodeProjectionMemberSource>> => {
    try {
      const projection = await readProjectionArchive(layout, projectionDigest);
      if (!projection.memberFingerprints.includes(prior.memberFingerprint)) {
        throw new Error("Prior projection source does not contain the exact retired member");
      }
      const source = archivedMemberSource(layout, projectionDigest, prior.memberFingerprint);
      const bytes = await readOptionalRegularFile(memberArchivePath(layout, prior.memberFingerprint));
      if (bytes === null) {
        return failure([issue(
          "PROJECTION_MISMATCH",
          "projection.archive",
          "Exact inverse requires the stable prior projection member",
          prior.memberFingerprint,
          "absent",
        )]);
      }
      verifyArchivedMember(bytes, prior);
      await verifyProjectionSource(source.path, projection.sourceDigest);
      return success(source);
    } catch (error) {
      return failure([stateFailure("PROJECTION_MISMATCH", "projection.archive", error)]);
    }
  };

  const materializeMarketplace = async (
    provider: ProviderId,
    registration: ProviderMarketplaceRegistration,
  ): Promise<DeploymentResult<NodeMarketplaceSource & Readonly<{ kind: "existing" | "published" }>>> => {
    try {
      const files = await marketplaceSourceFiles(layout, provider, registration);
      const source = marketplaceSource(layout, registration);
      const publication = await publishProjectionSourceDirectory(layout, source.path, files);
      return success(Object.freeze({ ...source, kind: publication.kind }));
    } catch (error) {
      return failure([stateFailure("MUTATION_FAILED", "marketplace.materialization", error)]);
    }
  };

  const readMarketplace = async (input: Readonly<{
    target: ProviderTarget;
    registration: ProviderMarketplaceRegistration;
  }>): Promise<DeploymentResult<NodeMarketplaceSource>> => {
    try {
      const files = await marketplaceSourceFiles(layout, input.target.provider, input.registration);
      const source = marketplaceSource(layout, input.registration);
      await verifyProjectionMaterializationExpected(source.path, files);
      return success(source);
    } catch (error) {
      return failure([stateFailure("PROJECTION_MISMATCH", "marketplace.source", error)]);
    }
  };

  return Object.freeze({
    materialize,
    inspect,
    materializeMarketplace,
    readMarketplace,
    read,
    readArchivedMember,
  });
}

function memberSource(
  layout: NodeRuntimeLayout,
  projectionDigest: ProjectionDigest,
  member: ProviderProjectionMember,
): NodeProjectionMemberSource {
  requireDigest(member.memberFingerprint, "pm1_");
  return Object.freeze({
    path: projectionSourceRoot(layout, projectionDigest),
    projectionDigest,
    memberFingerprint: member.memberFingerprint,
  });
}

function archivedMemberSource(
  layout: NodeRuntimeLayout,
  projectionDigest: ProjectionDigest,
  memberFingerprint: ProviderProjectionMember["memberFingerprint"],
): NodeProjectionMemberSource {
  requireDigest(memberFingerprint, "pm1_");
  return Object.freeze({
    path: projectionSourceRoot(layout, projectionDigest),
    projectionDigest,
    memberFingerprint,
  });
}

function projectionSourceRoot(layout: NodeRuntimeLayout, projectionDigest: ProjectionDigest): string {
  requireDigest(projectionDigest, "ap1_");
  return path.join(layout.projection.sources, projectionDigest);
}

function marketplaceSource(
  layout: NodeRuntimeLayout,
  registration: ProviderMarketplaceRegistration,
): NodeMarketplaceSource {
  requireDigest(registration.projectionDigest, "mp1_");
  requireDigest(registration.sourceDigest, "ps1_");
  return Object.freeze({
    path: path.join(layout.projection.marketplaces, registration.projectionDigest),
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
  });
}

function memberArchivePath(
  layout: NodeRuntimeLayout,
  memberFingerprint: ProviderProjectionMember["memberFingerprint"],
): string {
  requireDigest(memberFingerprint, "pm1_");
  return path.join(layout.projection.members, `${memberFingerprint}.json`);
}

function projectionManifestPath(
  layout: NodeRuntimeLayout,
  projection: AgentProviderProjection,
): string {
  return projectionManifestPathByDigest(layout, projection.projectionDigest);
}

function projectionManifestPathByDigest(
  layout: NodeRuntimeLayout,
  projectionDigest: ProjectionDigest,
): string {
  requireDigest(projectionDigest, "ap1_");
  return path.join(layout.projection.manifests, `${projectionDigest}.json`);
}

function memberBytes(member: ProviderProjectionMember): Uint8Array {
  return canonicalBytes({
    schemaVersion: 1,
    memberFingerprint: member.memberFingerprint,
    member: memberValue(member),
    files: member.files.map((file) => ({
      path: file.path,
      mode: file.mode,
      contentDigest: file.contentDigest,
      bytesBase64: Buffer.from(file.bytes).toString("base64"),
    })),
  });
}

function projectionBytes(projection: AgentProviderProjection): Uint8Array {
  return canonicalBytes({
    schemaVersion: 1,
    projectionDigest: projection.projectionDigest,
    projection: projectionValue(projection),
    memberFingerprints: projection.members.map((member) => member.memberFingerprint),
  });
}

function verifyMemberPayload(member: ProviderProjectionMember): void {
  requireDigest(member.memberFingerprint, "pm1_");
  for (const file of member.files) {
    if (contentDigest(file.bytes) !== file.contentDigest) {
      throw new Error(`Projection member payload digest mismatch: ${file.path}`);
    }
  }
}

function verifyProjectionPayload(projection: AgentProviderProjection): void {
  for (const member of projection.members) verifyMemberPayload(member);
  for (const file of projection.marketplace.files) {
    if (contentDigest(file.bytes) !== file.contentDigest) {
      throw new Error(`Projection marketplace payload digest mismatch: ${file.path}`);
    }
  }
  const sourceDigest = canonicalDigest(
    "ps1_",
    providerSourceTreeValue(projection.marketplace.files, projection.members),
  );
  if (sourceDigest !== projection.marketplace.sourceDigest) {
    throw new Error("Projection marketplace source digest is invalid");
  }
  if (canonicalDigest("ap1_", projectionValue(projection)) !== projection.projectionDigest) {
    throw new Error("Provider projection digest is invalid");
  }
}

type ArchivedPayloadFile = Readonly<{
  path: string;
  mode: number;
  contentDigest: string;
  bytes: Uint8Array;
}>;

function projectionSourceFiles(projection: AgentProviderProjection): readonly ArchivedPayloadFile[] {
  const files = [
    ...projection.marketplace.files.map((file) => Object.freeze({
      path: file.path,
      mode: file.mode,
      contentDigest: file.contentDigest,
      bytes: file.bytes,
    })),
    ...projection.members.flatMap((member) => member.files.map((file) => Object.freeze({
      path: `plugins/${member.pluginId}/${file.path}`,
      mode: file.mode,
      contentDigest: file.contentDigest,
      bytes: file.bytes,
    }))),
  ].sort((left, right) => left.path.localeCompare(right.path, "en"));
  const paths = new Set<string>();
  for (const file of files) {
    if (paths.has(file.path)) throw new Error(`Projection source contains a duplicate path: ${file.path}`);
    paths.add(file.path);
  }
  return Object.freeze(files);
}

async function readProjectionArchive(
  layout: NodeRuntimeLayout,
  projectionDigest: ProjectionDigest,
): Promise<Readonly<{
  sourceDigest: ProviderSourceDigest;
  memberFingerprints: readonly string[];
}>> {
  const bytes = await readOptionalRegularFile(projectionManifestPathByDigest(layout, projectionDigest));
  if (bytes === null) throw new Error("Stable projection manifest is absent");
  const decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  if (!isRecord(decoded) || !equalBytes(canonicalBytes(decoded as CanonicalValue), bytes)) {
    throw new Error("Stable projection manifest is not canonical");
  }
  requireExactKeys(decoded, ["memberFingerprints", "projection", "projectionDigest", "schemaVersion"]);
  const projection = requireRecord(decoded.projection, "archived projection");
  const marketplace = requireRecord(projection.marketplace, "archived projection marketplace");
  requireExactKeys(marketplace, ["files", "identity", "sourceDigest"]);
  if (
    decoded.schemaVersion !== 1
    || decoded.projectionDigest !== projectionDigest
    || canonicalDigest("ap1_", projection as CanonicalValue) !== projectionDigest
    || typeof marketplace.sourceDigest !== "string"
  ) {
    throw new Error("Stable projection manifest digest is invalid");
  }
  requireDigest(marketplace.sourceDigest, "ps1_");
  if (!Array.isArray(decoded.memberFingerprints)
    || decoded.memberFingerprints.some((entry) => typeof entry !== "string" || !/^pm1_[0-9a-f]{64}$/u.test(entry))) {
    throw new Error("Stable projection manifest member table is invalid");
  }
  return Object.freeze({
    sourceDigest: marketplace.sourceDigest as ProviderSourceDigest,
    memberFingerprints: Object.freeze([...decoded.memberFingerprints] as string[]),
  });
}

async function marketplaceSourceFiles(
  layout: NodeRuntimeLayout,
  provider: ProviderId,
  registration: ProviderMarketplaceRegistration,
): Promise<readonly ArchivedPayloadFile[]> {
  const files: ArchivedPayloadFile[] = [];
  const marketplacePath = provider === "codex"
    ? ".agents/plugins/marketplace.json"
    : ".claude-plugin/marketplace.json";
  const marketplaceBytes = canonicalBytes(provider === "codex"
    ? {
        name: registration.marketplaceIdentity,
        plugins: registration.members.map((member) => ({
          name: member.pluginId,
          source: { source: "local", path: `./plugins/${member.pluginId}` },
          policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
          category: "agent",
        })),
      }
    : {
        name: registration.marketplaceIdentity,
        version: "1.0.0",
        description: `RAWR curated agent plugin authority ${registration.marketplaceIdentity}`,
        owner: { name: "RAWR" },
        plugins: registration.members.map((member) => ({
          name: member.pluginId,
          description: `RAWR curated agent plugin ${member.pluginId}`,
          source: `./plugins/${member.pluginId}`,
          category: "development",
        })),
      });
  files.push(payloadFile(marketplacePath, marketplaceBytes));
  const metadataBytes = canonicalBytes({
    protocol: "agent-provider-marketplace-source@v1",
    provider,
    marketplaceIdentity: registration.marketplaceIdentity,
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
    members: registration.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: member.sourceProjectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
  files.push(payloadFile(".rawr/marketplace.json", metadataBytes));
  for (const member of registration.members) {
    const projection = await readProjectionArchive(layout, member.sourceProjectionDigest);
    if (!projection.memberFingerprints.includes(member.memberFingerprint)) {
      throw new Error(`Marketplace member is absent from its archived source projection: ${member.pluginId}`);
    }
    const archiveBytes = await readOptionalRegularFile(memberArchivePath(layout, member.memberFingerprint));
    if (archiveBytes === null) throw new Error(`Marketplace member archive is absent: ${member.pluginId}`);
    const archived = decodeArchivedMember(archiveBytes);
    if (
      archived.member.pluginId !== member.pluginId
      || archived.member.nativeIdentity !== member.nativeIdentity
      || archived.member.providerSourceIdentity !== member.providerSourceIdentity
      || archived.member.memberFingerprint !== member.memberFingerprint
    ) {
      throw new Error(`Marketplace member archive identity changed: ${member.pluginId}`);
    }
    for (const file of archived.files) {
      files.push(Object.freeze({ ...file, path: `plugins/${member.pluginId}/${file.path}` }));
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path, "en"));
  const paths = new Set<string>();
  for (const file of files) {
    if (paths.has(file.path)) throw new Error(`Marketplace source contains a duplicate path: ${file.path}`);
    paths.add(file.path);
  }
  return Object.freeze(files);
}

function payloadFile(filePath: string, bytes: Uint8Array): ArchivedPayloadFile {
  return Object.freeze({
    path: filePath,
    mode: 0o644,
    contentDigest: contentDigest(bytes),
    bytes,
  });
}

function verifyArchivedMember(bytes: Uint8Array, prior: NativeMemberObservation): readonly ArchivedPayloadFile[] {
  const decoded = decodeArchivedMember(bytes);
  const { member, authority, visible } = decoded;
  if (
    member.pluginId !== prior.pluginId
    || member.nativeIdentity !== prior.nativeIdentity
    || authority.protocol !== PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL
    || authority.contentAuthority !== prior.artifactAuthority.contentAuthority
    || authority.sourceCommit !== prior.artifactAuthority.sourceCommit
    || member.providerSourceIdentity !== prior.providerSourceIdentity
    || member.providerSourceIdentity !== authority.contentAuthority
    || member.memberFingerprint !== prior.memberFingerprint
    || visible.pluginIdentity !== prior.nativeIdentity
    || !sameStringArray(visible.skills, prior.visibleSkills)
    || !sameStringArray(visible.hooks, prior.visibleHooks)
  ) {
    throw new Error("Archived projection member does not bind exact prior native identity");
  }
  return decoded.files;
}

function decodeArchivedMember(bytes: Uint8Array): Readonly<{
  member: Record<string, unknown>;
  authority: Record<string, unknown>;
  visible: Record<string, unknown>;
  files: readonly ArchivedPayloadFile[];
}> {
  const decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  if (!isRecord(decoded) || !equalBytes(canonicalBytes(decoded as CanonicalValue), bytes)) {
    throw new Error("Archived projection member is not canonical");
  }
  requireExactKeys(decoded, ["files", "member", "memberFingerprint", "schemaVersion"]);
  if (decoded.schemaVersion !== 1 || typeof decoded.memberFingerprint !== "string") {
    throw new Error("Archived projection member fingerprint is invalid");
  }
  const member = requireRecord(decoded.member, "archived member");
  requireExactKeys(member, ["artifactAuthority", "files", "memberFingerprint", "nativeIdentity", "pluginId", "providerSourceIdentity", "releaseRef", "visible"]);
  const authority = requireRecord(member.artifactAuthority, "archived member artifact authority");
  requireExactKeys(authority, ["contentAuthority", "protocol", "sourceCommit"]);
  const visible = requireRecord(member.visible, "archived member visibility");
  requireExactKeys(visible, ["hooks", "pluginIdentity", "skills"]);
  if (member.memberFingerprint !== decoded.memberFingerprint) throw new Error("Archived member envelope fingerprint changed");
  const { memberFingerprint: _memberFingerprint, ...fingerprintBody } = member;
  if (canonicalDigest("pm1_", fingerprintBody as CanonicalValue) !== decoded.memberFingerprint) {
    throw new Error("Archived projection member digest is invalid");
  }

  if (!Array.isArray(member.files) || !Array.isArray(decoded.files) || member.files.length !== decoded.files.length) {
    throw new Error("Archived projection member file table is invalid");
  }
  const files: ArchivedPayloadFile[] = [];
  for (const [index, memberFileValue] of member.files.entries()) {
    const memberFile = requireRecord(memberFileValue, `archived member file ${index}`);
    const archivedFile = requireRecord(decoded.files[index], `archived payload file ${index}`);
    requireExactKeys(memberFile, ["contentDigest", "mode", "path"]);
    requireExactKeys(archivedFile, ["bytesBase64", "contentDigest", "mode", "path"]);
    if (
      memberFile.path !== archivedFile.path
      || memberFile.mode !== archivedFile.mode
      || memberFile.contentDigest !== archivedFile.contentDigest
      || typeof archivedFile.bytesBase64 !== "string"
    ) {
      throw new Error("Archived projection payload metadata is inconsistent");
    }
    const payload = Buffer.from(archivedFile.bytesBase64, "base64");
    if (payload.toString("base64") !== archivedFile.bytesBase64 || contentDigest(payload) !== archivedFile.contentDigest) {
      throw new Error("Archived projection payload bytes are invalid");
    }
    if (typeof archivedFile.path !== "string" || (archivedFile.mode !== 0o644 && archivedFile.mode !== 0o755)) {
      throw new Error("Archived projection payload path or mode is invalid");
    }
    files.push(Object.freeze({
      path: archivedFile.path,
      mode: archivedFile.mode,
      contentDigest: archivedFile.contentDigest as string,
      bytes: new Uint8Array(payload),
    }));
  }
  return Object.freeze({ member, authority, visible, files: Object.freeze(files) });
}

async function publishProjectionSourceDirectory(
  layout: NodeRuntimeLayout,
  destination: string,
  files: readonly ArchivedPayloadFile[],
): Promise<Readonly<{ kind: "existing" | "published" }>> {
  if (
    path.dirname(destination) !== layout.projection.sources
    && path.dirname(destination) !== layout.projection.marketplaces
  ) {
    throw new Error("Projection source destination escaped the source root");
  }
  try {
    await verifyProjectionMaterializationExpected(destination, files);
    return Object.freeze({ kind: "existing" });
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
  }

  await ensureCanonicalDirectory(path.dirname(destination), "provider projection source root");
  await ensureCanonicalDirectory(layout.projection.temporary, "provider projection temporary root");

  const temporary = path.join(
    layout.projection.temporary,
    `source-${process.pid}-${randomUUID()}`,
  );
  await mkdir(temporary, { mode: 0o700 });
  try {
    for (const file of files) {
      const filePath = materializedFilePath(temporary, file.path);
      await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
      const handle = await open(
        filePath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
        file.mode,
      );
      try {
        await handle.writeFile(file.bytes);
        await handle.chmod(file.mode);
        await handle.sync();
      } finally {
        await handle.close();
      }
    }
    try {
      await rename(temporary, destination);
      return Object.freeze({ kind: "published" });
    } catch (error) {
      if (!hasCode(error, "EEXIST") && !hasCode(error, "ENOTEMPTY")) throw error;
      await verifyProjectionMaterializationExpected(destination, files);
      return Object.freeze({ kind: "existing" });
    }
  } finally {
    await removeOwnedTemporarySource(layout, temporary);
  }
}

async function verifyProjectionMaterializationExpected(
  sourceRoot: string,
  expectedFiles: readonly ArchivedPayloadFile[],
): Promise<void> {
  const rootStatus = await lstat(sourceRoot, { bigint: true });
  if (!rootStatus.isDirectory() || rootStatus.isSymbolicLink()) {
    throw new Error("Stable projection source must be a non-symlink directory");
  }
  const expectedPaths = new Set(expectedFiles.map((file) => file.path));
  const expectedDirectories = new Set<string>();
  for (const file of expectedFiles) {
    let directory = path.posix.dirname(file.path);
    while (directory !== ".") {
      expectedDirectories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  const actualPaths = new Set<string>();
  const actualDirectories = new Set<string>();
  await walkMaterializedDirectory(sourceRoot, "", actualPaths, actualDirectories);
  if (!sameSet(actualPaths, expectedPaths) || !sameSet(actualDirectories, expectedDirectories)) {
    throw new Error("Stable projection source has an unexpected file tree");
  }
  for (const file of expectedFiles) {
    const filePath = materializedFilePath(sourceRoot, file.path);
    const status = await lstat(filePath, { bigint: true });
    if (!status.isFile() || status.isSymbolicLink() || Number(status.mode & 0o777n) !== file.mode) {
      throw new Error(`Stable projection source file mode is invalid: ${file.path}`);
    }
    const bytes = await readOptionalRegularFile(filePath);
    if (bytes === null || !equalBytes(bytes, file.bytes) || contentDigest(bytes) !== file.contentDigest) {
      throw new Error(`Stable projection source file bytes are invalid: ${file.path}`);
    }
  }
}

async function verifyProjectionSource(
  sourceRoot: string,
  expectedDigest: ProviderSourceDigest,
): Promise<void> {
  requireDigest(expectedDigest, "ps1_");
  const rootStatus = await lstat(sourceRoot, { bigint: true });
  if (!rootStatus.isDirectory() || rootStatus.isSymbolicLink()) {
    throw new Error("Stable projection source must be a non-symlink directory");
  }
  const paths = new Set<string>();
  const directories = new Set<string>();
  await walkMaterializedDirectory(sourceRoot, "", paths, directories);
  const expectedDirectories = new Set<string>();
  const files = [];
  for (const relativePath of paths) {
    let directory = path.posix.dirname(relativePath);
    while (directory !== ".") {
      expectedDirectories.add(directory);
      directory = path.posix.dirname(directory);
    }
    const filePath = materializedFilePath(sourceRoot, relativePath);
    const status = await lstat(filePath, { bigint: true });
    if (!status.isFile() || status.isSymbolicLink()) {
      throw new Error(`Stable projection source entry is not a regular file: ${relativePath}`);
    }
    const mode = Number(status.mode & 0o777n);
    if (mode !== 0o644 && mode !== 0o755) {
      throw new Error(`Stable projection source file mode is invalid: ${relativePath}`);
    }
    const bytes = await readOptionalRegularFile(filePath);
    if (bytes === null) throw new Error(`Stable projection source file is absent: ${relativePath}`);
    files.push({ path: relativePath, mode, contentDigest: contentDigest(bytes) });
  }
  if (!sameSet(directories, expectedDirectories)) {
    throw new Error("Stable projection source contains an unexpected directory");
  }
  files.sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (canonicalDigest("ps1_", { files }) !== expectedDigest) {
    throw new Error("Stable projection source digest does not match its archived projection");
  }
}

async function walkMaterializedDirectory(
  root: string,
  relativeRoot: string,
  files: Set<string>,
  directories: Set<string>,
): Promise<void> {
  const entries = await readdir(path.join(root, relativeRoot), { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = relativeRoot === "" ? entry.name : `${relativeRoot}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error("Stable projection source cannot contain symlinks");
    if (entry.isDirectory()) {
      directories.add(relativePath);
      await walkMaterializedDirectory(root, relativePath, files, directories);
      continue;
    }
    if (!entry.isFile()) throw new Error("Stable projection source contains an unsupported entry");
    files.add(relativePath);
  }
}

function materializedFilePath(root: string, generatedPath: string): string {
  const filePath = path.resolve(root, ...generatedPath.split("/"));
  const relative = path.relative(root, filePath);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Projection source file escaped its immutable root");
  }
  return filePath;
}

async function removeOwnedTemporarySource(layout: NodeRuntimeLayout, temporary: string): Promise<void> {
  const expectedParent = layout.projection.temporary;
  if (
    path.dirname(temporary) !== expectedParent
    || !/^source-[1-9][0-9]*-[0-9a-f-]{36}$/u.test(path.basename(temporary))
  ) {
    throw new Error("Refusing to remove an unowned projection temporary directory");
  }

  let status;
  try {
    status = await lstat(temporary);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return;
    throw error;
  }
  if (
    !status.isDirectory()
    || status.isSymbolicLink()
    || await realpath(expectedParent) !== expectedParent
    || await realpath(temporary) !== temporary
  ) {
    throw new Error("Refusing to remove a non-canonical projection temporary directory");
  }
  await rm(temporary, { recursive: true });
}

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function hasCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === code;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(record).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("Archived projection member has an unexpected shape");
  }
}

function sameStringArray(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((entry, index) => typeof entry === "string" && entry === expected[index]);
}

function requireDigest(value: string, prefix: string): void {
  if (!new RegExp(`^${prefix}[0-9a-f]{64}$`, "u").test(value)) {
    throw new Error(`Provider state digest must use ${prefix}`);
  }
}

function stateFailure(
  code: "MUTATION_FAILED" | "PROJECTION_MISMATCH",
  pathPrefix: string,
  error: unknown,
) {
  return issue(code, pathPrefix, error instanceof Error ? error.message : String(error));
}

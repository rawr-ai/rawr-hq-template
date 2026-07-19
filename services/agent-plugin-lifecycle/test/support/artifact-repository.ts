import type {
  ArtifactEvidenceObservation,
  ArtifactObjectAddress,
  ArtifactPublicationResult,
  ArtifactRepositoryAsyncPort,
  ArtifactTreeEntry,
  ArtifactTreeObservation,
  ArtifactTreeSnapshot,
} from "@rawr/resource-agent-plugin-artifact-repository";

import { createResourceArtifactStore } from "../../src/service/repository/artifact-repository";
import type { VerifiedArtifactSnapshotV1 } from "../../src/service/shared/release";

export const MEMORY_ARTIFACT_REPOSITORY_ROOT = "/tmp/rawr-memory-artifact-repository";

export interface SeededArtifactRepository {
  readonly artifactRepository: MemoryArtifactRepository;
  readonly artifactRepositoryRoot: string;
}

export async function createSeededArtifactRepository(
  snapshots: readonly VerifiedArtifactSnapshotV1[],
  repositoryRoot = MEMORY_ARTIFACT_REPOSITORY_ROOT,
): Promise<SeededArtifactRepository> {
  const artifactRepository = new MemoryArtifactRepository();
  await seedArtifactRepository(artifactRepository, repositoryRoot, snapshots);
  artifactRepository.resetObservations();
  return Object.freeze({ artifactRepository, artifactRepositoryRoot: repositoryRoot });
}

export async function seedArtifactRepository(
  artifactRepository: ArtifactRepositoryAsyncPort,
  repositoryRoot: string,
  snapshots: readonly VerifiedArtifactSnapshotV1[],
): Promise<void> {
  const store = createResourceArtifactStore({ repository: artifactRepository, repositoryRoot });
  const releases = new Map<string, Extract<VerifiedArtifactSnapshotV1, { kind: "release" }>["release"]>();
  const releaseSets = new Map<
    string,
    Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>["releaseSet"]
  >();
  for (const snapshot of snapshots) {
    if (snapshot.kind === "release") {
      releases.set(snapshot.release.artifactDigest, snapshot.release);
      continue;
    }
    for (const member of snapshot.members) {
      releases.set(member.release.artifactDigest, member.release);
    }
    releaseSets.set(snapshot.releaseSet.releaseSetDigest, snapshot.releaseSet);
  }
  for (const release of releases.values()) {
    requirePublication(await store.publishRelease(release));
  }
  for (const releaseSet of releaseSets.values()) {
    requirePublication(await store.publishReleaseSet(releaseSet));
  }
}

/** In-memory raw repository used only to exercise lifecycle service composition. */
export class MemoryArtifactRepository implements ArtifactRepositoryAsyncPort {
  private readonly trees = new Map<string, ArtifactTreeSnapshot>();
  private nextTreeReadFailure: string | undefined;
  private nextEvidencePublicationFailure: string | undefined;
  readTreeCalls = 0;
  readEvidenceCalls = 0;
  publishedEvidenceCalls = 0;
  lastTreeAddress: ArtifactObjectAddress | undefined;
  lastEvidenceAddress: ArtifactObjectAddress | undefined;

  locateTree(
    _input: Parameters<ArtifactRepositoryAsyncPort["locateTree"]>[0],
  ): Promise<never> {
    return unavailable("artifact tree location");
  }

  async readTree(
    input: Parameters<ArtifactRepositoryAsyncPort["readTree"]>[0],
  ): Promise<ArtifactTreeObservation> {
    this.readTreeCalls += 1;
    this.lastTreeAddress = input.address;
    if (this.nextTreeReadFailure !== undefined) {
      const failure = this.nextTreeReadFailure;
      this.nextTreeReadFailure = undefined;
      throw new Error(failure);
    }
    const snapshot = this.trees.get(addressKey(input.address));
    return snapshot === undefined
      ? Object.freeze({ kind: "Missing", address: input.address })
      : Object.freeze({ kind: "Present", snapshot: copyTree(snapshot) });
  }

  async publishTree(
    input: Parameters<ArtifactRepositoryAsyncPort["publishTree"]>[0],
  ): Promise<ArtifactPublicationResult> {
    const key = addressKey(input.address);
    const candidate = snapshotFor(input.address, input.entries);
    const prior = this.trees.get(key);
    if (prior !== undefined) {
      return sameTree(prior, candidate)
        ? Object.freeze({ kind: "ReadOnlyConverged", address: input.address })
        : Object.freeze({ kind: "Occupied", address: input.address, observation: "Present" });
    }

    await input.control?.onEvent?.({ kind: "AfterStagingWrite", address: input.address });
    await input.control?.onEvent?.({ kind: "AfterStagingVerification", address: input.address });
    const decision = await input.control?.beforeCommit?.();
    if (decision?.kind === "Reject") {
      return Object.freeze({ kind: "Rejected", address: input.address, failure: decision.failure });
    }
    await input.control?.onEvent?.({ kind: "BeforeNoReplacePublication", address: input.address });
    this.trees.set(key, candidate);
    await input.control?.onEvent?.({ kind: "AfterNoReplacePublication", address: input.address });
    return Object.freeze({ kind: "Published", address: input.address });
  }

  async readEvidence(
    input: Parameters<ArtifactRepositoryAsyncPort["readEvidence"]>[0],
  ): Promise<ArtifactEvidenceObservation> {
    this.readEvidenceCalls += 1;
    this.lastEvidenceAddress = input.address;
    const snapshot = this.trees.get(addressKey(input.address));
    if (snapshot === undefined) return Object.freeze({ kind: "Missing", address: input.address });
    const entry = snapshot.entries[0];
    if (
      snapshot.directories.length !== 0
      || snapshot.entries.length !== 1
      || entry?.path !== "evidence.json"
      || entry.mode !== 0o444
    ) {
      const issues: [Readonly<{ code: "UnexpectedEntry"; detail: string }>] = [Object.freeze({
        code: "UnexpectedEntry",
        detail: "Mechanical evidence fixture has an unexpected tree shape",
      })];
      return Object.freeze({
        kind: "Mismatch",
        address: input.address,
        issues: Object.freeze(issues),
      });
    }
    return Object.freeze({
      kind: "Present",
      address: input.address,
      bytes: new Uint8Array(entry.bytes),
    });
  }

  async publishEvidence(
    input: Parameters<ArtifactRepositoryAsyncPort["publishEvidence"]>[0],
  ): Promise<ArtifactPublicationResult> {
    this.publishedEvidenceCalls += 1;
    this.lastEvidenceAddress = input.address;
    if (this.nextEvidencePublicationFailure !== undefined) {
      const failure = this.nextEvidencePublicationFailure;
      this.nextEvidencePublicationFailure = undefined;
      return Object.freeze({ kind: "Rejected", address: input.address, failure });
    }
    return this.publishTree({
      address: input.address,
      entries: Object.freeze([Object.freeze({
        path: "evidence.json",
        mode: 0o444,
        bytes: new Uint8Array(input.bytes),
      })]),
      limits: Object.freeze({ maxEntries: 1, maxBytes: input.maxBytes }),
      ...(input.control === undefined ? {} : { control: input.control }),
    });
  }

  resetObservations(): void {
    this.readTreeCalls = 0;
    this.readEvidenceCalls = 0;
    this.publishedEvidenceCalls = 0;
    this.lastTreeAddress = undefined;
    this.lastEvidenceAddress = undefined;
  }

  rejectNextEvidencePublication(failure: string): void {
    this.nextEvidencePublicationFailure = failure;
  }

  rejectNextTreeRead(failure: string): void {
    this.nextTreeReadFailure = failure;
  }

  addDirectory(objectId: string, path: string): void {
    const [key, snapshot] = this.findByObjectId(objectId);
    this.trees.set(key, Object.freeze({
      ...snapshot,
      directories: Object.freeze([
        ...snapshot.directories,
        Object.freeze({ path, mode: 0o700 }),
      ].sort((left, right) => left.path.localeCompare(right.path))),
    }));
  }

  replaceEntry(objectId: string, path: string, bytes: Uint8Array): void {
    const [key, snapshot] = this.findByObjectId(objectId);
    this.trees.set(key, Object.freeze({
      ...snapshot,
      entries: Object.freeze(snapshot.entries.map((entry) =>
        entry.path === path ? Object.freeze({ ...entry, bytes: new Uint8Array(bytes) }) : entry
      )),
    }));
  }

  private findByObjectId(objectId: string): readonly [string, ArtifactTreeSnapshot] {
    const found = [...this.trees.entries()].find(([, snapshot]) =>
      snapshot.address.objectId === objectId
    );
    if (found === undefined) throw new Error(`Missing fixture artifact ${objectId}`);
    return found;
  }
}

function snapshotFor(
  address: ArtifactObjectAddress,
  entries: readonly ArtifactTreeEntry[],
): ArtifactTreeSnapshot {
  const directoryPaths = new Set<string>();
  for (const entry of entries) {
    const segments = entry.path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directoryPaths.add(segments.slice(0, index).join("/"));
    }
  }
  return Object.freeze({
    address,
    directories: Object.freeze([...directoryPaths]
      .sort()
      .map((path) => Object.freeze({ path, mode: 0o700 }))),
    entries: Object.freeze([...entries]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((entry) => Object.freeze({ ...entry, bytes: new Uint8Array(entry.bytes) }))),
  });
}

function copyTree(snapshot: ArtifactTreeSnapshot): ArtifactTreeSnapshot {
  return Object.freeze({
    ...snapshot,
    directories: Object.freeze(snapshot.directories.map((directory) => Object.freeze({ ...directory }))),
    entries: Object.freeze(snapshot.entries.map((entry) => Object.freeze({
      ...entry,
      bytes: new Uint8Array(entry.bytes),
    }))),
  });
}

function sameTree(left: ArtifactTreeSnapshot, right: ArtifactTreeSnapshot): boolean {
  return JSON.stringify(left.directories) === JSON.stringify(right.directories)
    && left.entries.length === right.entries.length
    && left.entries.every((entry, index) => {
      const candidate = right.entries[index];
      return candidate !== undefined
        && entry.path === candidate.path
        && entry.mode === candidate.mode
        && entry.bytes.byteLength === candidate.bytes.byteLength
        && entry.bytes.every((byte, byteIndex) => byte === candidate.bytes[byteIndex]);
    });
}

function addressKey(address: ArtifactObjectAddress): string {
  return `${address.repositoryRoot}/${address.namespace.join("/")}/${address.objectId}`;
}

async function unavailable(label: string): Promise<never> {
  throw new Error(`Unexpected ${label} access in memory artifact repository`);
}

function requirePublication(result: Awaited<ReturnType<ReturnType<typeof createResourceArtifactStore>["publishRelease"]>>): void {
  if (result.kind === "Published" || result.kind === "ReadOnlyConverged") return;
  throw new Error(`Artifact fixture publication failed: ${result.failure}`);
}

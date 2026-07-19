import { describe, expect, it } from "vitest";

import {
  createProviderMarketplaceRegistration,
  type ProviderMarketplaceRegistration,
} from "../../../src/service/modules/providers/model/policy/marketplace";
import {
  renderCompleteProjection,
  type AgentProviderProjection,
} from "../../../src/service/modules/providers/model/policy/projection";
import { CODEX_ADAPTER_PROTOCOL } from "../../../src/service/modules/providers/repository/codex";
import { createPathlessProjectionStorage } from "../../../src/service/modules/providers/repository/projection-storage";
import type {
  FlatProjectionRecordCollection,
  ImmutableProviderTreeCollection,
  ImmutableProviderTreeFile,
  ImmutableProviderTreeKey,
  ProjectionRecordKey,
} from "../../../src/service/modules/providers/model/repositories/projection-storage";
import { failure, issue, success } from "../../../src/service/modules/providers/model/errors/deployment-result";
import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import { productFixture } from "../../shared/release/fixtures";

describe("pathless projection storage", () => {
  it("publishes member trees and metadata before the manifest completion marker", async () => {
    const projection = completeProjection();
    const journal: string[] = [];
    const records = new FakeRecords(journal);
    const trees = new FakeTrees(journal);
    const storage = createPathlessProjectionStorage({ records, trees });

    const first = await storage.projectionMaterializer.materialize(projection);
    expect(first).toEqual({
      ok: true,
      value: { kind: "published", projectionDigest: projection.projectionDigest },
    });
    const completion = journal.findIndex((event) => event.startsWith("record:manifest:"));
    expect(completion).toBe(journal.length - 1);
    expect(trees.events).toHaveLength(projection.members.length);
    expect(journal.slice(0, completion).some((event) => event.startsWith("tree:member:"))).toBe(true);
    expect(journal.slice(0, completion).some((event) => event.startsWith("record:member:"))).toBe(true);

    const memberRecord = records.require(memberRecordKey(projection.members[0]!.memberFingerprint));
    const manifest = records.require(manifestRecordKey(projection.projectionDigest));
    expect(new TextDecoder().decode(memberRecord)).not.toContain("bytesBase64");
    expect(new TextDecoder().decode(manifest)).not.toContain("/tmp/");

    const recordPublishAttempts = records.publishAttempts.length;
    const treePublishAttempts = trees.publishAttempts.length;
    const repeated = await storage.projectionMaterializer.materialize(projection);
    expect(repeated).toEqual({
      ok: true,
      value: { kind: "existing", projectionDigest: projection.projectionDigest },
    });
    expect(records.publishAttempts).toHaveLength(recordPublishAttempts);
    expect(trees.publishAttempts).toHaveLength(treePublishAttempts);
  });

  it("treats a partial publication as non-authoritative and completes it on retry", async () => {
    const projection = completeProjection();
    const records = new FakeRecords();
    records.failNextManifest = true;
    const trees = new FakeTrees();
    const storage = createPathlessProjectionStorage({ records, trees });

    const partial = await storage.projectionMaterializer.materialize(projection);
    expect(partial.ok).toBe(false);
    expect(records.has(manifestRecordKey(projection.projectionDigest))).toBe(false);
    expect(projection.members.every((member) =>
      records.has(memberRecordKey(member.memberFingerprint))
      && trees.has(memberTreeKey(member.memberFingerprint)))).toBe(true);
    const memberPublications = records.events.length + trees.events.length;
    const retried = await storage.projectionMaterializer.materialize(projection);
    expect(retried).toEqual({
      ok: true,
      value: { kind: "published", projectionDigest: projection.projectionDigest },
    });
    expect(records.events.length + trees.events.length).toBe(memberPublications + 1);
  });

  it("refuses an immutable member conflict without publishing a manifest", async () => {
    const projection = completeProjection();
    const records = new FakeRecords();
    const trees = new FakeTrees();
    const firstMember = projection.members[0]!;
    trees.seed(memberTreeKey(firstMember.memberFingerprint), [{
      path: firstMember.files[0]!.path,
      mode: firstMember.files[0]!.mode,
      bytes: new TextEncoder().encode("substituted\n"),
    }]);
    const storage = createPathlessProjectionStorage({ records, trees });

    const result = await storage.projectionMaterializer.materialize(projection);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected immutable tree conflict");
    expect(result.issues[0]).toMatchObject({
      code: "PROJECTION_MISMATCH",
      path: "projection.tree",
    });
    expect(records.has(manifestRecordKey(projection.projectionDigest))).toBe(false);
  });

  it("refuses an existing manifest whose admitted member tree is no longer complete", async () => {
    const projection = completeProjection();
    const records = new FakeRecords();
    const trees = new FakeTrees();
    const storage = createPathlessProjectionStorage({ records, trees });
    expect((await storage.projectionMaterializer.materialize(projection)).ok).toBe(true);
    trees.remove(memberTreeKey(projection.members[0]!.memberFingerprint));

    const result = await storage.projectionMaterializer.materialize(projection);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected incomplete admitted projection failure");
    expect(result.issues[0]).toMatchObject({
      code: "PROJECTION_MISMATCH",
      path: "projection.member.tree",
    });
  });

  it("assembles one immutable marketplace tree and returns only semantic selectors", async () => {
    const projection = completeProjection();
    const records = new FakeRecords();
    const trees = new FakeTrees();
    const storage = createPathlessProjectionStorage({ records, trees });
    expect((await storage.projectionMaterializer.materialize(projection)).ok).toBe(true);
    const registration = marketplaceRegistration(projection);
    const target = mustTargetProjection(projection);

    const missing = await storage.marketplaceSources.read(target, registration);
    expect(missing.ok).toBe(false);
    expect(trees.has(marketplaceTreeKey(registration))).toBe(false);

    const materialized = await storage.marketplaceMaterializer.materialize("codex", registration);
    expect(materialized).toEqual({
      ok: true,
      value: {
        kind: "published",
        projectionDigest: registration.projectionDigest,
        sourceDigest: registration.sourceDigest,
      },
    });
    const source = await storage.marketplaceSources.read(
      target,
      registration,
    );
    expect(source).toEqual({
      ok: true,
      value: {
        projectionDigest: registration.projectionDigest,
        sourceDigest: registration.sourceDigest,
      },
    });
    const tree = trees.require(marketplaceTreeKey(registration));
    expect(tree.map((file) => file.path)).toContain(".rawr/marketplace.json");
    expect(tree.some((file) => file.path.startsWith("plugins/alpha/"))).toBe(true);
    const marketplaceManifest = projection.marketplace.files[0]!;
    expect(tree.find((file) => file.path === marketplaceManifest.path)).toEqual({
      path: marketplaceManifest.path,
      mode: marketplaceManifest.mode,
      bytes: marketplaceManifest.bytes,
    });

    const publishAttempts = trees.publishAttempts.length;
    expect(await storage.marketplaceMaterializer.materialize("codex", registration)).toEqual({
      ok: true,
      value: {
        kind: "existing",
        projectionDigest: registration.projectionDigest,
        sourceDigest: registration.sourceDigest,
      },
    });
    expect(trees.publishAttempts).toHaveLength(publishAttempts);
    expect(await storage.marketplaceSources.read(target, registration)).toEqual(source);
    expect(trees.publishAttempts).toHaveLength(publishAttempts);
  });
});

class FakeRecords implements FlatProjectionRecordCollection {
  readonly events: string[] = [];
  readonly publishAttempts: string[] = [];
  failNextManifest = false;
  readonly #records = new Map<string, Uint8Array>();

  constructor(private readonly journal: string[] = []) {}

  async read(key: ProjectionRecordKey) {
    const bytes = this.#records.get(recordKey(key));
    return success(bytes === undefined
      ? { kind: "absent" as const }
      : { kind: "present" as const, bytes: new Uint8Array(bytes) });
  }

  async publish(key: ProjectionRecordKey, bytes: Uint8Array) {
    this.publishAttempts.push(recordKey(key));
    if (key.kind === "manifest" && this.failNextManifest) {
      this.failNextManifest = false;
      return failure([issue("MUTATION_FAILED", "projection.manifest", "Injected manifest publication failure")]);
    }
    const identity = recordKey(key);
    const existing = this.#records.get(identity);
    if (existing !== undefined) {
      return sameBytes(existing, bytes)
        ? success({ kind: "existing" as const })
        : failure([issue("PROJECTION_MISMATCH", "projection.record", "Immutable record conflict")]);
    }
    this.#records.set(identity, new Uint8Array(bytes));
    this.events.push(identity);
    this.journal.push(`record:${identity}`);
    return success({ kind: "published" as const });
  }

  has(key: ProjectionRecordKey): boolean {
    return this.#records.has(recordKey(key));
  }

  require(key: ProjectionRecordKey): Uint8Array {
    const bytes = this.#records.get(recordKey(key));
    if (bytes === undefined) throw new Error("Projection record fixture is absent");
    return new Uint8Array(bytes);
  }
}

class FakeTrees implements ImmutableProviderTreeCollection {
  readonly events: string[] = [];
  readonly publishAttempts: string[] = [];
  readonly #trees = new Map<string, readonly ImmutableProviderTreeFile[]>();

  constructor(private readonly journal: string[] = []) {}

  async read(key: ImmutableProviderTreeKey) {
    const files = this.#trees.get(treeKey(key));
    return success(files === undefined
      ? { kind: "absent" as const }
      : { kind: "present" as const, files: cloneTree(files) });
  }

  async publish(key: ImmutableProviderTreeKey, files: readonly ImmutableProviderTreeFile[]) {
    const identity = treeKey(key);
    this.publishAttempts.push(identity);
    const existing = this.#trees.get(identity);
    if (existing !== undefined) {
      return sameTree(existing, files)
        ? success({ kind: "existing" as const })
        : failure([issue("PROJECTION_MISMATCH", "projection.tree", "Immutable tree conflict")]);
    }
    this.#trees.set(identity, cloneTree(files));
    this.events.push(identity);
    this.journal.push(`tree:${identity}`);
    return success({ kind: "published" as const });
  }

  seed(key: ImmutableProviderTreeKey, files: readonly ImmutableProviderTreeFile[]): void {
    this.#trees.set(treeKey(key), cloneTree(files));
  }

  remove(key: ImmutableProviderTreeKey): void {
    this.#trees.delete(treeKey(key));
  }

  has(key: ImmutableProviderTreeKey): boolean {
    return this.#trees.has(treeKey(key));
  }

  require(key: ImmutableProviderTreeKey): readonly ImmutableProviderTreeFile[] {
    const files = this.#trees.get(treeKey(key));
    if (files === undefined) throw new Error("Provider tree fixture is absent");
    return cloneTree(files);
  }
}

function completeProjection(): AgentProviderProjection {
  const fixture = productFixture();
  const rendered = renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members: [snapshot(fixture.alphaRelease), snapshot(fixture.betaRelease)],
  });
  if (!rendered.ok) throw new Error(rendered.issues[0].message);
  return rendered.value;
}

function marketplaceRegistration(projection: AgentProviderProjection): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
    provider: projection.provider,
    adapterProtocol: projection.adapterProtocol,
    marketplaceIdentity: projection.marketplace.identity,
    members: projection.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: projection.projectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
}

function mustTargetProjection(projection: AgentProviderProjection) {
  return {
    provider: projection.provider,
    home: "/provider-home",
    targetDigest: `pt1_${"a".repeat(64)}`,
  } as Parameters<ReturnType<typeof createPathlessProjectionStorage>["marketplaceSources"]["read"]>[0];
}

function snapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return {
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  };
}

function manifestRecordKey(projectionDigest: AgentProviderProjection["projectionDigest"]): ProjectionRecordKey {
  return { kind: "manifest", projectionDigest };
}

function memberRecordKey(
  memberFingerprint: AgentProviderProjection["members"][number]["memberFingerprint"],
): ProjectionRecordKey {
  return { kind: "member", memberFingerprint };
}

function memberTreeKey(
  memberFingerprint: AgentProviderProjection["members"][number]["memberFingerprint"],
): ImmutableProviderTreeKey {
  return { kind: "member", memberFingerprint };
}

function marketplaceTreeKey(registration: ProviderMarketplaceRegistration): ImmutableProviderTreeKey {
  return {
    kind: "marketplace",
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
  };
}

function recordKey(key: ProjectionRecordKey): string {
  return key.kind === "manifest"
    ? `manifest:${key.projectionDigest}`
    : `member:${key.memberFingerprint}`;
}

function treeKey(key: ImmutableProviderTreeKey): string {
  return key.kind === "member"
    ? `member:${key.memberFingerprint}`
    : `marketplace:${key.projectionDigest}:${key.sourceDigest}`;
}

function cloneTree(files: readonly ImmutableProviderTreeFile[]): readonly ImmutableProviderTreeFile[] {
  return Object.freeze(files.map((file) => Object.freeze({ ...file, bytes: new Uint8Array(file.bytes) })));
}

function sameTree(
  left: readonly ImmutableProviderTreeFile[],
  right: readonly ImmutableProviderTreeFile[],
): boolean {
  return left.length === right.length && left.every((file, index) => {
    const other = right[index];
    return other !== undefined
      && file.path === other.path
      && file.mode === other.mode
      && sameBytes(file.bytes, other.bytes);
  });
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

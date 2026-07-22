import { lstat, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import type { AgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records";
import { makeNodeAgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records/providers/effect-platform-node";
import { afterEach, describe, expect, it } from "vitest";

import { normalizeCompleteTestRequest } from "../../../src/service/modules/providers/model/dto/mode";
import {
  type ProviderTarget,
  parseProviderTarget,
} from "../../../src/service/modules/providers/model/dto/provider-target";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
} from "../../../src/service/modules/providers/model/policy/marketplace";
import {
  type AgentProviderProjection,
  renderCompleteProjection,
} from "../../../src/service/modules/providers/model/policy/projection";
import {
  createTargetReceipt,
  visibleFingerprint,
} from "../../../src/service/modules/providers/model/policy/receipt";
import { createTargetIdentitySidecar } from "../../../src/service/modules/providers/model/policy/state-machine";
import { CODEX_ADAPTER_PROTOCOL } from "../../../src/service/modules/providers/repository/codex";
import { createResourceProviderRecordState } from "../../../src/service/modules/providers/repository/resource-record-storage";
import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import { productFixture } from "../../shared/release/fixtures";

describe("resource provider record state", () => {
  let fixtureRoot: string | null = null;

  afterEach(async () => {
    if (fixtureRoot !== null) await removeOwnedFixture(fixtureRoot);
    fixtureRoot = null;
  });

  it("maps projection and target records across real resource reopen", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c5-provider-records-")));
    const controllerDataRoot = path.join(fixtureRoot, "controller-data");
    const projectionRepositoryRoot = path.join(controllerDataRoot, "provider-projections");
    const targetRecordsRoot = path.join(controllerDataRoot, "provider-target-records");
    const providerHome = path.join(fixtureRoot, "codex-home");
    await mkdir(controllerDataRoot);
    await mkdir(providerHome);

    const target = mustResult(parseProviderTarget({ provider: "codex", home: providerHome }));
    const fixture = productFixture();
    const snapshot = completeSetSnapshot(fixture);
    const projection = mustResult(
      renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, snapshot)
    );
    const registration = createProviderMarketplaceRegistration({
      provider: target.provider,
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
    const receipt = receiptFor(target, snapshot, projection, registration);
    const sidecar = createTargetIdentitySidecar(target);

    const forward = createState({
      controllerDataRoot,
      projectionRepositoryRoot,
      targetRecordsRoot,
    });
    expect(await forward.projections.projectionMaterializer.materialize(projection)).toEqual({
      ok: true,
      value: { kind: "published", projectionDigest: projection.projectionDigest },
    });
    expect(
      await forward.projections.marketplaceMaterializer.materialize("codex", registration)
    ).toEqual({
      ok: true,
      value: {
        kind: "published",
        projectionDigest: registration.projectionDigest,
        sourceDigest: registration.sourceDigest,
      },
    });
    expect(await forward.targets.identities.admit(target, sidecar)).toEqual({
      ok: true,
      value: sidecar,
    });
    expect(await forward.targets.receipts.publish(target, { kind: "absent" }, receipt)).toEqual({
      ok: true,
      value: receipt,
    });

    const reopened = createState({
      controllerDataRoot,
      projectionRepositoryRoot,
      targetRecordsRoot,
    });
    expect(await reopened.projections.marketplaceSources.read(target, registration)).toEqual({
      ok: true,
      value: {
        projectionDigest: registration.projectionDigest,
        sourceDigest: registration.sourceDigest,
      },
    });
    expect(await reopened.targets.identities.read(target)).toEqual({
      ok: true,
      value: { kind: "present", sidecar },
    });
    expect(await reopened.targets.receipts.read(target)).toEqual({
      ok: true,
      value: { kind: "present", receipt },
    });
  });

  it("retains failed transaction authority across repeated middleware construction", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c5-provider-records-")));
    const controllerDataRoot = path.join(fixtureRoot, "controller-data");
    const projectionRepositoryRoot = path.join(controllerDataRoot, "provider-projections");
    const targetRecordsRoot = path.join(controllerDataRoot, "provider-target-records");
    const providerHome = path.join(fixtureRoot, "codex-home");
    await mkdir(controllerDataRoot);
    await mkdir(providerHome);

    const rawRecords = makeNodeAgentProviderRecordsAsyncPort({
      controllerDataRoot,
      projectionRoot: projectionRepositoryRoot,
      targetRecordsRoot,
    });
    let releaseFailures = 1;
    const records: AgentProviderRecordsAsyncPort = Object.freeze({
      ...rawRecords,
      async releaseTarget(input: Parameters<AgentProviderRecordsAsyncPort["releaseTarget"]>[0]) {
        if (releaseFailures > 0) {
          releaseFailures -= 1;
          throw new Error("injected release failure");
        }
        return await rawRecords.releaseTarget(input);
      },
    });
    const trees = makeNodeArtifactRepositoryAsyncPort();
    const options = Object.freeze({ records, trees, projectionRepositoryRoot });
    const first = createResourceProviderRecordState(options);
    const target = mustResult(parseProviderTarget({ provider: "codex", home: providerHome }));
    const sidecar = createTargetIdentitySidecar(target);

    expect(await first.targets.identities.admit(target, sidecar)).toEqual({
      ok: true,
      value: sidecar,
    });
    expect((await first.targets.identities.admit(target, sidecar)).ok).toBe(false);

    const nextInvocation = createResourceProviderRecordState(options);
    expect(nextInvocation).toBe(first);
    expect(await nextInvocation.targets.identities.admit(target, sidecar)).toEqual({
      ok: true,
      value: sidecar,
    });
  });
});

interface ResourceRoots {
  readonly controllerDataRoot: string;
  readonly projectionRepositoryRoot: string;
  readonly targetRecordsRoot: string;
}

function createState(roots: ResourceRoots) {
  return createResourceProviderRecordState({
    records: makeNodeAgentProviderRecordsAsyncPort({
      controllerDataRoot: roots.controllerDataRoot,
      projectionRoot: roots.projectionRepositoryRoot,
      targetRecordsRoot: roots.targetRecordsRoot,
    }),
    trees: makeNodeArtifactRepositoryAsyncPort(),
    projectionRepositoryRoot: roots.projectionRepositoryRoot,
  });
}

function completeSetSnapshot(
  fixture: ReturnType<typeof productFixture>
): Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }> {
  return Object.freeze({
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members: Object.freeze([
      releaseSnapshot(fixture.alphaRelease),
      releaseSnapshot(fixture.betaRelease),
    ]),
  });
}

function releaseSnapshot(
  release: ReturnType<typeof productFixture>["alphaRelease"]
): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: Object.freeze(
      release.artifactBody.payloadEntries.map((entry) =>
        Object.freeze({
          path: entry.path,
          mode: entry.mode,
          contentDigest: entry.contentDigest,
          bytes: payloadEntryBytes(entry),
        })
      )
    ),
  });
}

function receiptFor(
  target: ProviderTarget,
  snapshot: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>,
  projection: AgentProviderProjection,
  registration: ReturnType<typeof createProviderMarketplaceRegistration>
) {
  const request = mustResult(
    normalizeCompleteTestRequest({
      kind: "complete-test",
      releaseSet: snapshot.ref,
      evaluationProfile: "provider-smoke@v1",
      targets: [{ provider: target.provider, home: target.home }],
    })
  );
  const verifiedMembers = projection.members.map((member) =>
    Object.freeze({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      artifactAuthority: member.artifactAuthority,
      providerSourceIdentity: member.providerSourceIdentity,
      memberFingerprint: member.memberFingerprint,
    })
  );
  return createTargetReceipt({
    schemaVersion: 1,
    provider: target.provider,
    targetDigest: target.targetDigest,
    generation: 1,
    lineage: Object.freeze({ kind: "initial" }),
    marketplace: marketplaceState(registration),
    scope: Object.freeze({
      kind: "complete-test",
      requestDigest: request.requestDigest,
      projectionDigest: projection.projectionDigest,
      adapterProtocol: projection.adapterProtocol,
      capabilityProfileDigest: projection.capabilityProfile.capabilityProfileDigest,
      visibleFingerprint: visibleFingerprint(verifiedMembers),
      verifiedMembers: Object.freeze(verifiedMembers),
      releaseSet: snapshot.ref,
      evaluationProfile: request.evaluationProfile,
    }),
    managedMembers: Object.freeze(
      verifiedMembers.map((member) =>
        Object.freeze({
          ...member,
          sourceProjectionDigest: projection.projectionDigest,
        })
      )
    ),
  });
}

function mustResult<T>(
  result: Readonly<{ ok: true; value: T } | { ok: false; issues: readonly { message: string }[] }>
): T {
  if (!result.ok) throw new Error(result.issues[0]?.message ?? "Fixture construction failed");
  return result.value;
}

async function removeOwnedFixture(root: string): Promise<void> {
  const parent = await realpath(tmpdir());
  if (
    path.dirname(root) !== parent ||
    !path.basename(root).startsWith("rawr-c5-provider-records-")
  ) {
    throw new Error("Refusing recursive cleanup outside the owned provider-record fixture root");
  }
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink() || (await realpath(root)) !== root) {
    throw new Error("Refusing recursive cleanup of a non-canonical provider-record fixture root");
  }
  await rm(root, { recursive: true });
}

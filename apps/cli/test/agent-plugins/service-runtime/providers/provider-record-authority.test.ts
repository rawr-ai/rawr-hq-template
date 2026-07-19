import { lstat, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  CODEX_ADAPTER_PROTOCOL,
  createProviderMarketplaceRegistration,
  createTargetIdentitySidecar,
  createTargetReceipt,
  marketplaceState,
  parseProviderDeploymentRequest,
  parseProviderTarget,
  renderCompleteProjection,
  visibleFingerprint,
  type AgentProviderProjection,
  type ProviderTarget,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { afterEach, describe, expect, it } from "vitest";

import { deriveAgentPluginControllerLayout } from "../../../../src/lib/agent-plugins/layout";
import { createNodeProviderRecordState } from "../../../../src/lib/agent-plugins/service-runtime/providers/node-runtime";
import { productFixture } from "./product-fixture";

describe("provider record authority", () => {
  let fixtureRoot: string | null = null;

  afterEach(async () => {
    if (fixtureRoot !== null) await removeOwnedFixture(fixtureRoot);
    fixtureRoot = null;
  });

  it("uses one resource state owner for forward lifecycle and reopened reads", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c5-provider-records-")));
    const dataRoot = path.join(fixtureRoot, "controller-data");
    const providerHome = path.join(fixtureRoot, "codex-home");
    await mkdir(dataRoot);
    await mkdir(providerHome);
    const layout = deriveAgentPluginControllerLayout({ dataRoot });
    const roots = {
      controllerDataRoot: dataRoot,
      providerProjectionRoot: layout.providerProjectionRoot,
      providerTargetStateRoot: layout.providerTargetStateRoot,
    } as const;
    const target = mustResult(parseProviderTarget({ provider: "codex", home: providerHome }));
    const fixture = productFixture();
    const snapshot = completeSetSnapshot(fixture);
    const projection = mustResult(renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, snapshot));
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

    const forward = createNodeProviderRecordState(roots);
    expect(await forward.projections.projectionMaterializer.materialize(projection)).toEqual({
      ok: true,
      value: { kind: "published", projectionDigest: projection.projectionDigest },
    });
    expect(await forward.projections.marketplaceMaterializer.materialize("codex", registration)).toEqual({
      ok: true,
      value: {
        kind: "published",
        projectionDigest: registration.projectionDigest,
        sourceDigest: registration.sourceDigest,
      },
    });
    expect(await forward.targets.identities.admit(target, sidecar)).toEqual({ ok: true, value: sidecar });
    expect(await forward.targets.receipts.publish(target, { kind: "absent" }, receipt)).toEqual({
      ok: true,
      value: receipt,
    });

    const reopened = createNodeProviderRecordState(roots);
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
});

function completeSetSnapshot(
  fixture: ReturnType<typeof productFixture>,
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
  release: ReturnType<typeof productFixture>["alphaRelease"],
): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => Object.freeze({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  });
}

function receiptFor(
  target: ProviderTarget,
  snapshot: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>,
  projection: AgentProviderProjection,
  registration: ReturnType<typeof createProviderMarketplaceRegistration>,
) {
  const request = mustResult(parseProviderDeploymentRequest({
    kind: "complete-test",
    releaseSet: snapshot.ref,
    evaluationProfile: "provider-smoke@v1",
    targets: [{ provider: target.provider, home: target.home }],
  }));
  if (request.kind !== "complete-test") throw new Error("Provider fixture request mode changed");
  const verifiedMembers = projection.members.map((member) => Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
  }));
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
    managedMembers: Object.freeze(verifiedMembers.map((member) => Object.freeze({
      ...member,
      sourceProjectionDigest: projection.projectionDigest,
    }))),
  });
}

function mustResult<T>(
  result: Readonly<{ ok: true; value: T } | { ok: false; issues: readonly { message: string }[] }>,
): T {
  if (!result.ok) throw new Error(result.issues[0]?.message ?? "Fixture construction failed");
  return result.value;
}

async function removeOwnedFixture(root: string): Promise<void> {
  const parent = await realpath(tmpdir());
  if (path.dirname(root) !== parent || !path.basename(root).startsWith("rawr-c5-provider-records-")) {
    throw new Error("Refusing recursive cleanup outside the owned provider-record fixture root");
  }
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink() || await realpath(root) !== root) {
    throw new Error("Refusing recursive cleanup of a non-canonical provider-record fixture root");
  }
  await rm(root, { recursive: true });
}

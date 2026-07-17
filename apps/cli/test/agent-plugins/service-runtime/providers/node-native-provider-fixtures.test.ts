import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-lifecycle/release";
import { afterEach, describe, expect, it } from "vitest";

import { productFixture } from "./product-fixture";
import { CLAUDE_ADAPTER_PROTOCOL } from "../../../../src/lib/agent-plugins/service-runtime/providers/adapters/claude";
import { CODEX_ADAPTER_PROTOCOL } from "../../../../src/lib/agent-plugins/service-runtime/providers/adapters/codex";
import { inspectNodeNativePluginPackage } from "../../../../src/lib/agent-plugins/service-runtime/providers/adapters/node-plugin-package";
import { readNodeMarketplaceSource } from "../../../../src/lib/agent-plugins/service-runtime/providers/adapters/node-marketplace-source";
import {
  createProviderMarketplaceRegistration,
  type ProviderMarketplaceRegistration,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  renderCompleteProjection,
  type AdapterProtocol,
  type AgentProviderProjection,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { ProviderId } from "@rawr/agent-plugin-lifecycle/ports/providers";
import { openNodeProviderState } from "../../../../src/lib/agent-plugins/service-runtime/providers/node-state";

describe("generated native provider fixtures", () => {
  let fixtureRoot: string | null = null;

  afterEach(async () => {
    if (fixtureRoot !== null) await removeOwnedFixture(fixtureRoot);
    fixtureRoot = null;
  });

  it.each([
    ["codex", CODEX_ADAPTER_PROTOCOL],
    ["claude", CLAUDE_ADAPTER_PROTOCOL],
  ] as const)("materializes an exact generated A/B marketplace for %s", async (provider, protocol) => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c3-native-fixture-")));
    const state = await openNodeProviderState(providerStateRoots(fixtureRoot));
    const projection = completeProjection(provider, protocol);
    const projected = await state.projections.materialize(projection);
    if (!projected.ok) throw new Error(projected.issues[0].message);
    const registration = marketplaceRegistration(projection);
    const marketplace = await state.projections.materializeMarketplace(provider, registration);
    if (!marketplace.ok) throw new Error(marketplace.issues[0].message);

    const decoded = await readNodeMarketplaceSource({
      allowedRoot: state.layout.projection.marketplaces,
      sourcePath: marketplace.value.path,
      provider,
      adapterProtocol: projection.adapterProtocol,
    });
    expect(decoded).toEqual(registration);
    expect(decoded.members.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);

    for (const member of projection.members) {
      const inspected = await inspectNodeNativePluginPackage(
        path.join(marketplace.value.path, "plugins", member.pluginId),
        provider,
      );
      expect(inspected).toMatchObject({
        pluginId: member.pluginId,
        nativeIdentity: member.nativeIdentity,
        artifactAuthority: member.artifactAuthority,
        providerSourceIdentity: member.providerSourceIdentity,
        memberFingerprint: member.memberFingerprint,
        visibleSkills: member.visible.skills,
        visibleHooks: member.visible.hooks,
      });
    }

    const repeated = await state.projections.materializeMarketplace(provider, registration);
    expect(repeated.ok && repeated.value.kind).toBe("existing");
  });
});

function completeProjection(provider: ProviderId, adapterProtocol: AdapterProtocol): AgentProviderProjection {
  const fixture = productFixture();
  const snapshot: Extract<VerifiedArtifactSnapshotV1, { readonly kind: "complete-set" }> = {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members: [releaseSnapshot(fixture.alphaRelease), releaseSnapshot(fixture.betaRelease)],
  };
  const rendered = renderCompleteProjection(provider, adapterProtocol, snapshot);
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

function releaseSnapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
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

function providerStateRoots(root: string) {
  const controllerRoot = path.join(root, "controller");
  return Object.freeze({
    providerProjectionRoot: path.join(controllerRoot, "provider-projections-v1"),
    providerTargetStateRoot: path.join(controllerRoot, "provider-target-state-v1"),
  });
}

async function removeOwnedFixture(root: string): Promise<void> {
  const parent = await realpath(tmpdir());
  if (path.dirname(root) !== parent || !path.basename(root).startsWith("rawr-c3-native-fixture-")) {
    throw new Error("Refusing recursive cleanup outside the owned native-provider fixture root");
  }
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink() || await realpath(root) !== root) {
    throw new Error("Refusing recursive cleanup of a non-canonical native-provider fixture root");
  }
  await rm(root, { recursive: true });
}

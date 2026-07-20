import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCompleteSetArtifactRef,
  createMechanicalEvidenceHandle as createReleaseMechanicalEvidenceHandle,
  createReleaseArtifactRef,
  mechanicalEvidenceDigest,
  payloadEntryBytes,
  type MechanicalEvidenceHandleV1,
  type MechanicalEvidenceReadResult,
  type MechanicalEvidenceStore,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  createMechanicalProviderEvidence,
  parseProviderTarget,
  renderCompleteProjection,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";

import {
  createNodeMechanicalEvidenceRuntime,
  createNodeMechanicalEvidenceRuntimeFromStore,
} from "../../../../src/lib/agent-plugins/service-runtime/evidence/node-mechanical";
import { createMechanicalEvidenceReader } from "../../../../src/lib/agent-plugins/bindings/output";
import { deriveAgentPluginControllerLayout } from "../../../../src/lib/agent-plugins/layout";
import { CODEX_ADAPTER_PROTOCOL } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { productFixture } from "../providers/product-fixture";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
} from "../releases/owned-fixture-root";

describe("node mechanical evidence runtime", () => {
  it("publishes one immutable provider evidence object idempotently", async () => {
    const store = new MemoryEvidenceStore();
    const runtime = createNodeMechanicalEvidenceRuntimeFromStore(store);
    const evidence = completeEvidence();

    expect((await runtime.provider.publish(evidence)).ok).toBe(true);
    expect((await runtime.provider.publish(evidence)).ok).toBe(true);
    expect(store.publicationWrites).toBe(1);

    const inspected = await runtime.provider.inspect(evidence.evidenceDigest);
    expect(inspected.ok && inspected.value.kind).toBe("present");
  });

  it("reports changed provider evidence bytes as a mechanical failure", async () => {
    const store = new MemoryEvidenceStore();
    const runtime = createNodeMechanicalEvidenceRuntimeFromStore(store);
    const evidence = completeEvidence();
    await runtime.provider.publish(evidence);
    store.replace(evidence.evidenceDigest, new TextEncoder().encode("changed\n"));

    const result = await runtime.provider.inspect(evidence.evidenceDigest);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues[0]?.code).toBe("EVIDENCE_FAILED");
  });

  it("converges through the selected filesystem provider without changing repository state", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const layout = deriveAgentPluginControllerLayout({ dataRoot: fixture.path });
      const runtime = createNodeMechanicalEvidenceRuntime(layout.artifactStoreRoot);
      const reader = createMechanicalEvidenceReader(layout.artifactStoreRoot);
      const evidence = completeEvidence();

      const published = await runtime.provider.publish(evidence);
      if (!published.ok) throw new Error(published.issues.map((entry) => entry.message).join("; "));
      expect(published).toMatchObject({ ok: true });
      const releaseHandle = createReleaseMechanicalEvidenceHandle(evidence.bytes);
      const evidenceDirectory = join(
        layout.artifactStoreRoot,
        "mechanical-evidence",
        "sha256",
        releaseHandle.digest,
      );
      const evidencePath = join(evidenceDirectory, "evidence.json");
      const before = await lstat(evidencePath, { bigint: true });
      const beforeBytes = await readFile(evidencePath);
      const beforeInventory = await readdir(join(evidenceDirectory, ".."));

      const standalone = await reader.read(releaseHandle);
      expect(standalone.kind).toBe("Verified");
      if (standalone.kind !== "Verified") throw new Error("published evidence did not verify");
      expect(standalone.bytes).toEqual(evidence.bytes);

      expect((await runtime.provider.publish(evidence)).ok).toBe(true);
      const after = await lstat(evidencePath, { bigint: true });
      expect(await readFile(evidencePath)).toEqual(beforeBytes);
      expect(await readdir(join(evidenceDirectory, ".."))).toEqual(beforeInventory);
      expect({ ino: after.ino, mode: after.mode, mtimeNs: after.mtimeNs }).toEqual({
        ino: before.ino,
        mode: before.mode,
        mtimeNs: before.mtimeNs,
      });
    } finally {
      await removeOwnedFixtureRoot(fixture);
    }
  });
});

class MemoryEvidenceStore implements MechanicalEvidenceStore {
  readonly #bytes = new Map<string, Uint8Array>();
  publicationWrites = 0;

  async read(handle: MechanicalEvidenceHandleV1): Promise<MechanicalEvidenceReadResult> {
    const bytes = this.#bytes.get(handle.digest);
    if (bytes === undefined) return { kind: "Missing", handle };
    if (mechanicalEvidenceDigest(bytes) !== handle.digest) {
      return {
        kind: "Mismatch",
        handle,
        issues: [{ code: "DigestMismatch", detail: "stored bytes changed" }],
      };
    }
    return { kind: "Verified", handle, bytes: new Uint8Array(bytes) };
  }

  async publish(handle: MechanicalEvidenceHandleV1, bytes: Uint8Array) {
    const prior = this.#bytes.get(handle.digest);
    if (prior !== undefined) return { kind: "ReadOnlyConverged" as const, handle };
    this.#bytes.set(handle.digest, new Uint8Array(bytes));
    this.publicationWrites += 1;
    return { kind: "Published" as const, handle };
  }

  replace(digest: string, bytes: Uint8Array): void {
    this.#bytes.set(digest, new Uint8Array(bytes));
  }
}

function completeEvidence() {
  const fixture = productFixture();
  const members: VerifiedReleaseArtifactV1[] = [fixture.alphaRelease, fixture.betaRelease].map((release) => ({
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  }));
  const projection = renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members,
  });
  if (!projection.ok) throw new Error(projection.issues[0].message);
  const target = parseProviderTarget({ provider: "codex", home: "/tmp/codex-home" });
  if (!target.ok) throw new Error(target.issues[0].message);
  return createMechanicalProviderEvidence(
    { kind: "complete-test", releaseSet: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest) },
    "complete-default" as never,
    [{
      kind: "verified",
      targetDigest: target.value.targetDigest,
      provider: "codex",
      projectionDigest: projection.value.projectionDigest,
      adapterProtocol: projection.value.adapterProtocol,
      capabilityProfileDigest: projection.value.capabilityProfile.capabilityProfileDigest,
      visibleFingerprint: "vf1_" + "1".repeat(64),
      payloadDigests: projection.value.members.map((member) => member.releaseRef.artifactDigest),
    }],
  );
}

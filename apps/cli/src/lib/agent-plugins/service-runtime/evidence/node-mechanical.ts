import {
  createMechanicalEvidenceHandle as createStoreHandle,
  type MechanicalEvidenceStore,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
import {
  decodeMechanicalProviderEvidence,
  failure,
  issue,
  success,
  type MechanicalEvidenceDigest,
  type MechanicalEvidencePublisher,
  type MechanicalProviderEvidence,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";

import { createMechanicalEvidenceStore } from "../../bindings/output";
import type { ArtifactStoreRoot } from "../../layout";

export type NodeMechanicalEvidenceRuntime = Readonly<{
  provider: MechanicalEvidencePublisher;
}>;

export function createNodeMechanicalEvidenceRuntime(
  artifactStoreRoot: ArtifactStoreRoot,
): NodeMechanicalEvidenceRuntime {
  return createNodeMechanicalEvidenceRuntimeFromStore(
    createMechanicalEvidenceStore(artifactStoreRoot),
  );
}

export function createNodeMechanicalEvidenceRuntimeFromStore(
  store: MechanicalEvidenceStore,
): NodeMechanicalEvidenceRuntime {
  const provider: MechanicalEvidencePublisher = Object.freeze({
    async inspect(evidenceDigest: MechanicalEvidenceDigest) {
      const read = await store.read(storeHandle(evidenceDigest));
      if (read.kind === "Missing") return success(Object.freeze({ kind: "missing" }));
      if (read.kind === "Mismatch") {
        return failure([issue(
          "EVIDENCE_FAILED",
          "evidence.inspect",
          read.issues.map((entry) => entry.detail).join("; "),
        )]);
      }
      const decoded = decodeMechanicalProviderEvidence(read.bytes, evidenceDigest);
      if (!decoded.ok) return decoded;
      return success(Object.freeze({
        kind: "present",
        handle: providerHandle(evidenceDigest),
        bytes: new Uint8Array(read.bytes),
      }));
    },
    async publish(evidence: MechanicalProviderEvidence) {
      const verified = decodeMechanicalProviderEvidence(evidence.bytes, evidence.evidenceDigest);
      if (!verified.ok) return verified;
      const publication = await store.publish(createStoreHandle(evidence.bytes), evidence.bytes);
      if (publication.kind === "Published" || publication.kind === "ReadOnlyConverged") {
        return success(providerHandle(evidence.evidenceDigest));
      }
      return failure([issue(
        "EVIDENCE_FAILED",
        "evidence.publish",
        `${publication.failure}${publication.cleanupFailure === undefined ? "" : `; ${publication.cleanupFailure}`}`,
      )]);
    },
  });

  return Object.freeze({ provider });
}

function storeHandle(evidenceDigest: string): ReturnType<typeof createStoreHandle> {
  return Object.freeze({
    kind: "mechanical-evidence",
    protocolVersion: 1,
    digest: evidenceDigest,
  }) as ReturnType<typeof createStoreHandle>;
}

function providerHandle(evidenceDigest: MechanicalEvidenceDigest) {
  return Object.freeze({
    evidenceDigest,
    artifactIdentity: `mechanical-evidence:${evidenceDigest}`,
  });
}

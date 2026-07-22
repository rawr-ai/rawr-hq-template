import {
  createMechanicalEvidenceHandle,
  MECHANICAL_EVIDENCE_PROTOCOL_VERSION,
  type MechanicalEvidenceHandleV1,
  type MechanicalEvidenceStore,
  parseMechanicalEvidenceHandle,
} from "../../../shared/release";

import type { MechanicalEvidenceDigest } from "../model/dto/mechanical-evidence";
import { failure, issue, success } from "../model/errors/deployment-result";
import { decodeMechanicalProviderEvidence } from "../model/helpers/evidence-codec";
import type { MechanicalEvidencePublisher } from "../model/repositories/evidence";

/** Projects the generic immutable evidence store into provider evidence semantics. */
export function createResourceMechanicalEvidencePublisher(
  store: MechanicalEvidenceStore
): MechanicalEvidencePublisher {
  const publisher: MechanicalEvidencePublisher = {
    async inspect(evidenceDigest) {
      const read = await store.read(storeHandle(evidenceDigest));
      if (read.kind === "Missing") return success(Object.freeze({ kind: "missing" }));
      if (read.kind === "Mismatch") {
        return failure([
          issue(
            "EVIDENCE_FAILED",
            "evidence.inspect",
            read.issues.map((entry) => entry.detail).join("; ")
          ),
        ]);
      }
      const decoded = decodeMechanicalProviderEvidence(read.bytes, evidenceDigest);
      if (!decoded.ok) return decoded;
      return success(
        Object.freeze({
          kind: "present",
          handle: providerHandle(evidenceDigest),
          bytes: new Uint8Array(read.bytes),
        })
      );
    },
    async publish(evidence) {
      const verified = decodeMechanicalProviderEvidence(evidence.bytes, evidence.evidenceDigest);
      if (!verified.ok) return verified;
      const publication = await store.publish(
        createMechanicalEvidenceHandle(evidence.bytes),
        evidence.bytes
      );
      if (publication.kind === "Published" || publication.kind === "ReadOnlyConverged") {
        return success(providerHandle(evidence.evidenceDigest));
      }
      return failure([
        issue(
          "EVIDENCE_FAILED",
          "evidence.publish",
          `${publication.failure}${publication.cleanupFailure === undefined ? "" : `; ${publication.cleanupFailure}`}`
        ),
      ]);
    },
  };
  return Object.freeze(publisher);
}

function storeHandle(evidenceDigest: MechanicalEvidenceDigest): MechanicalEvidenceHandleV1 {
  const parsed = parseMechanicalEvidenceHandle({
    kind: "mechanical-evidence",
    protocolVersion: MECHANICAL_EVIDENCE_PROTOCOL_VERSION,
    digest: evidenceDigest,
  });
  if (!parsed.ok) throw new Error(parsed.issue.detail);
  return parsed.value;
}

function providerHandle(evidenceDigest: MechanicalEvidenceDigest) {
  return Object.freeze({
    evidenceDigest,
    artifactIdentity: `mechanical-evidence:${evidenceDigest}`,
  });
}

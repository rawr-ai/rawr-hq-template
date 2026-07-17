import type { MechanicalEvidenceDigest, MechanicalProviderEvidence } from "../domain/evidence";
import type { DeploymentResult } from "../domain/result";

export interface MechanicalEvidenceHandle {
  readonly evidenceDigest: MechanicalEvidenceDigest;
  readonly artifactIdentity: string;
}

export type MechanicalEvidenceObservation =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "present"; handle: MechanicalEvidenceHandle; bytes: Uint8Array }>;

export interface MechanicalEvidencePublisher {
  inspect(evidenceDigest: MechanicalEvidenceDigest): Promise<DeploymentResult<MechanicalEvidenceObservation>>;
  publish(evidence: MechanicalProviderEvidence): Promise<DeploymentResult<MechanicalEvidenceHandle>>;
}

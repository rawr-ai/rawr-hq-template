import type { MechanicalEvidenceDigest, MechanicalProviderEvidence } from "../dto/mechanical-evidence";
import type { DeploymentResult } from "../errors/deployment-result";

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

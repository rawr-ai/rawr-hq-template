import type { ArtifactRef, VerifiedArtifactSnapshotV1 } from "../../../../shared/release";

import type { DeploymentResult } from "../domain/result";

export interface VerifiedReleaseReader {
  read(ref: ArtifactRef): Promise<DeploymentResult<VerifiedArtifactSnapshotV1>>;
}

import type { ArtifactRef, VerifiedArtifactSnapshotV1 } from "@rawr/agent-plugin-release";

import type { DeploymentResult } from "../domain/result";

export interface VerifiedReleaseReader {
  read(ref: ArtifactRef): Promise<DeploymentResult<VerifiedArtifactSnapshotV1>>;
}

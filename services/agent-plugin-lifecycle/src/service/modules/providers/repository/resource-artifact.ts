import type { ArtifactStore } from "../../../model/dependencies/releases";

import { failure, issue, success } from "../model/errors/deployment-result";
import type { VerifiedReleaseReader } from "../model/repositories/artifact";

/** Adapts the immutable release store without adding another artifact owner. */
export function createResourceProviderReleaseReader(
  reader: Pick<ArtifactStore, "read">
): VerifiedReleaseReader {
  const providerReader: VerifiedReleaseReader = {
    async read(ref) {
      const observed = await reader.read(ref);
      if (observed.kind === "Verified") return success(observed.snapshot);
      if (observed.kind === "Missing") {
        return failure([
          issue(
            "ARTIFACT_READ_FAILED",
            "artifact",
            "The selected immutable release artifact is missing"
          ),
        ]);
      }
      return failure([
        issue(
          "ARTIFACT_READ_FAILED",
          "artifact",
          observed.issues.map((entry) => `${entry.code}: ${entry.detail}`).join("; ")
        ),
      ]);
    },
  };
  return Object.freeze(providerReader);
}

import type { ArtifactReader } from "@rawr/agent-plugin-lifecycle/ports/releases";
import {
  failure,
  issue,
  success,
  type VerifiedReleaseReader,
} from "@rawr/agent-plugin-lifecycle/ports/providers";

/** Adapts the immutable release store without adding another artifact owner. */
export function createProviderReleaseReader(reader: ArtifactReader): VerifiedReleaseReader {
  const providerReader: VerifiedReleaseReader = {
    async read(ref: Parameters<VerifiedReleaseReader["read"]>[0]) {
      const observed = await reader.read(ref);
      if (observed.kind === "Verified") return success(observed.snapshot);
      if (observed.kind === "Missing") {
        return failure([issue(
          "ARTIFACT_READ_FAILED",
          "artifact",
          "The selected immutable release artifact is missing",
        )]);
      }
      return failure([issue(
        "ARTIFACT_READ_FAILED",
        "artifact",
        observed.issues.map((entry) => `${entry.code}: ${entry.detail}`).join("; "),
      )]);
    },
  };
  return Object.freeze(providerReader);
}

import type {
  ArtifactReader as BuildArtifactReader,
} from "@rawr/agent-plugin-build";
import type {
  DeploymentResult,
  ProviderDeploymentIssue,
  VerifiedReleaseReader,
} from "@rawr/agent-provider-deployment";

export function createProviderVerifiedReleaseReader(
  reader: BuildArtifactReader,
): VerifiedReleaseReader {
  const adapter: VerifiedReleaseReader = {
    async read(ref) {
      const result = await reader.read(ref);
      if (result.kind === "Verified") return success(result.snapshot);
      return failed(
        "ARTIFACT_READ_FAILED",
        "artifact",
        result.kind === "Missing"
          ? "Immutable release artifact is missing"
          : result.issues.map((issue) => issue.detail).join("; "),
      );
    },
  };
  return Object.freeze(adapter);
}

function success<T>(value: T): DeploymentResult<T> {
  return Object.freeze({ ok: true, value });
}

function failed<T>(
  code: ProviderDeploymentIssue["code"],
  path: string,
  message: string,
): DeploymentResult<T> {
  const issue = Object.freeze({ code, path, message, expected: "", actual: "" });
  const issues: readonly [ProviderDeploymentIssue] = Object.freeze([issue]);
  return Object.freeze({
    ok: false,
    issues,
  });
}

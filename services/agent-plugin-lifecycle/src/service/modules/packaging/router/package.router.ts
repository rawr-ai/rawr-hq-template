import {
  COWORK_PACKAGE_FORMAT,
  type PackageAgentPluginRequest,
  type PackageAgentPluginResult,
  type PackagingFailure,
  type PackagingFailureCode,
} from "../model/dto/packaging-lifecycle";
import { assertSnapshotMatchesRef, renderCoworkV1 } from "../model/helpers/cowork-v1";
import { module } from "../module";
import type { PackagingLifecycleRuntime } from "../ports";

export const packageProcedure = module.package.handler(async ({ context, input }) => {
  return packageAgentPlugin(input, context.packaging);
});

async function packageAgentPlugin(
  request: PackageAgentPluginRequest,
  dependencies: PackagingLifecycleRuntime,
): Promise<PackageAgentPluginResult> {
  let readResult: Awaited<ReturnType<PackagingLifecycleRuntime["artifactReader"]["read"]>>;
  try {
    readResult = await dependencies.artifactReader.read(request.artifactRef);
  } catch (error) {
    return rejected(failure(
      "ArtifactMismatch",
      "artifact-read",
      `Artifact reader failed without a closed result: ${errorMessage(error)}`,
    ));
  }

  if (readResult.kind === "Missing") {
    return rejected(failure(
      "ArtifactMissing",
      "artifact-read",
      "Requested immutable artifact is missing",
    ));
  }
  if (readResult.kind === "Mismatch") {
    const issueCodes = [...readResult.issues]
      .map((issue) => issue.code)
      .sort()
      .join(",");
    return rejected(failure(
      "ArtifactMismatch",
      "artifact-read",
      `Requested immutable artifact failed verification: ${issueCodes}`,
    ));
  }

  try {
    assertSnapshotMatchesRef(readResult.snapshot, request.artifactRef);
  } catch (error) {
    return rejected(failure(
      "ArtifactSnapshotMismatch",
      "artifact-snapshot",
      errorMessage(error),
    ));
  }

  let rendered: Awaited<ReturnType<typeof renderCoworkV1>>;
  try {
    rendered = await renderCoworkV1(readResult.snapshot, dependencies.coworkV1);
  } catch (error) {
    return rejected(failure(
      "PackageRenderFailed",
      "package-render",
      `Cowork v1 rendering failed: ${errorMessage(error)}`,
    ));
  }

  const identity = {
    artifactRef: request.artifactRef,
    format: COWORK_PACKAGE_FORMAT,
    outputPath: request.outputPath,
    packageDigest: rendered.packageDigest,
  } as const;
  let output: Awaited<ReturnType<PackagingLifecycleRuntime["output"]["publish"]>>;
  try {
    output = await dependencies.output.publish({
      outputPath: request.outputPath,
      bytes: rendered.bytes,
      packageDigest: rendered.packageDigest,
    });
  } catch (error) {
    return {
      kind: "OutputUnsettled",
      primaryFailure: failure(
        "OutputVerifyFailed",
        "output-port",
        `Atomic output port failed without a closed result: ${errorMessage(error)}`,
      ),
      ...identity,
    };
  }
  if (output.kind === "RejectedBeforeOutputMutation") return output;

  switch (output.kind) {
    case "ReadOnlyConverged":
      return { kind: output.kind, ...identity };
    case "OutputReplacedVerified":
      return { kind: output.kind, priorOutput: output.priorOutput, ...identity };
    case "OutputUnsettled":
      return {
        kind: output.kind,
        primaryFailure: output.primaryFailure,
        ...(output.cleanupFailure === undefined ? {} : { cleanupFailure: output.cleanupFailure }),
        ...identity,
      };
  }
}

function rejected(primaryFailure: PackagingFailure): PackageAgentPluginResult {
  return { kind: "RejectedBeforeOutputMutation", primaryFailure };
}

function failure(
  code: PackagingFailureCode,
  phase: string,
  message: string,
): PackagingFailure {
  return Object.freeze({ code, phase, message });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

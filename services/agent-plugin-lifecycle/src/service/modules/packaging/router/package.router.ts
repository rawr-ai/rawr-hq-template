import {
  COWORK_PACKAGE_FORMAT,
  type PackageAgentPluginRequest,
  type PackageAgentPluginResult,
  type PackagingFailure,
  type PackagingFailureCode,
} from "../model/dto/packaging-lifecycle";
import {
  assertSnapshotMatchesRef,
  coworkV1PackageDigest,
  createCoworkV1ArchiveRequest,
} from "../model/helpers/cowork-v1";
import { module } from "../module";
import type {
  AgentPluginPackageOutputAsyncPort,
  PackageOutputFailure,
  PackageOutputPublicationResult,
} from "@rawr/resource-agent-plugin-package-output";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../shared/release";
import type { ArtifactReader } from "../../../model/dependencies/releases";

interface PackagingDependencies {
  readonly artifacts: ArtifactReader;
  readonly packageOutput: AgentPluginPackageOutputAsyncPort;
}

export const packageProcedure = module.package.handler(async ({ context, input }) => {
  return packageAgentPlugin(input, {
    artifacts: context.artifacts,
    packageOutput: context.packageOutput,
  });
});

async function packageAgentPlugin(
  request: PackageAgentPluginRequest,
  dependencies: PackagingDependencies,
): Promise<PackageAgentPluginResult> {
  let readResult: Awaited<ReturnType<ArtifactReader["read"]>>;
  try {
    readResult = await dependencies.artifacts.read(request.artifactRef);
  } catch (error) {
    return rejected(createFailure(
      "ArtifactMismatch",
      "artifact-read",
      `Artifact reader failed without a closed result: ${errorMessage(error)}`,
    ));
  }

  if (readResult.kind === "Missing") {
    return rejected(createFailure(
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
    return rejected(createFailure(
      "ArtifactMismatch",
      "artifact-read",
      `Requested immutable artifact failed verification: ${issueCodes}`,
    ));
  }

  try {
    assertSnapshotMatchesRef(readResult.snapshot, request.artifactRef);
  } catch (error) {
    return rejected(createFailure(
      "ArtifactSnapshotMismatch",
      "artifact-snapshot",
      errorMessage(error),
    ));
  }

  let bytes: Uint8Array;
  try {
    bytes = await dependencies.packageOutput.encodeCoworkV1(
      createCoworkV1ArchiveRequest(readResult.snapshot),
    );
  } catch (error) {
    return rejected(createFailure(
      "PackageRenderFailed",
      "package-render",
      `Cowork v1 rendering failed: ${errorDetail(error)}`,
    ));
  }

  const packageDigest = coworkV1PackageDigest(bytes);
  const identity = {
    artifactRef: request.artifactRef,
    format: COWORK_PACKAGE_FORMAT,
    outputPath: request.outputPath,
    packageDigest,
  } as const;
  let output: PackageOutputPublicationResult;
  try {
    output = await dependencies.packageOutput.publish({
      outputPath: request.outputPath,
      bytes: new Uint8Array(bytes),
      maxPriorOutputBytes: Math.max(bytes.byteLength, MAX_RELEASE_SET_PAYLOAD_BYTES),
    });
  } catch (error) {
    return {
      kind: "OutputUnsettled",
      primaryFailure: createFailure(
        "OutputVerifyFailed",
        "output-port",
        `Atomic output port failed without a closed result: ${errorDetail(error)}`,
      ),
      ...identity,
    };
  }
  switch (output.kind) {
    case "RejectedBeforeOutputMutation":
      return {
        kind: output.kind,
        primaryFailure: mapFailure(output.primaryFailure),
        ...(output.cleanupFailure === undefined
          ? {}
          : { cleanupFailure: mapFailure(output.cleanupFailure, true) }),
      };
    case "ReadOnlyConverged":
      return { kind: output.kind, ...identity };
    case "OutputReplacedVerified":
      return { kind: output.kind, priorOutput: output.priorOutput, ...identity };
    case "OutputUnsettled":
      return {
        kind: output.kind,
        primaryFailure: mapFailure(output.primaryFailure),
        ...(output.cleanupFailure === undefined
          ? {}
          : { cleanupFailure: mapFailure(output.cleanupFailure, true) }),
        ...identity,
      };
  }
}

function mapFailure(failure: PackageOutputFailure, cleanup = false): PackagingFailure {
  return createFailure(
    cleanup ? cleanupFailureCode(failure) : primaryFailureCode(failure),
    failure.phase,
    failure.detail,
  );
}

function primaryFailureCode(failure: PackageOutputFailure): PackagingFailureCode {
  switch (failure.reason) {
    case "InvalidInput":
      return "InvalidRequest";
    case "ArchiveEncodingFailed":
      return "PackageRenderFailed";
    case "OutputParentUnsafe":
      return "OutputParentUnsafe";
    case "OutputUnsafe":
      return "OutputUnsafe";
    case "OutputChanged":
      return "OutputChanged";
    case "TemporaryFailed":
      return failure.phase.includes("verification")
        ? "TemporaryVerifyFailed"
        : failure.phase.includes("create") || failure.phase.includes("admission")
          ? "TemporaryCreateFailed"
          : "TemporaryWriteFailed";
    case "OutputCommitFailed":
      return "OutputCommitFailed";
    case "OutputVerifyFailed":
      return "OutputVerifyFailed";
    case "FilesystemFailed":
      return isProviderFailpoint(failure.phase) ? "FailpointFailed" : "OutputVerifyFailed";
  }
}

function cleanupFailureCode(failure: PackageOutputFailure): PackagingFailureCode {
  return failure.reason === "FilesystemFailed" || failure.reason === "TemporaryFailed"
    ? "TemporaryCleanupFailed"
    : primaryFailureCode(failure);
}

function isProviderFailpoint(phase: string): boolean {
  return phase === "AfterOutputObserved"
    || phase === "BeforeCommit"
    || phase === "AfterCommit"
    || phase === "BeforeFinalVerification";
}

function rejected(primaryFailure: PackagingFailure): PackageAgentPluginResult {
  return { kind: "RejectedBeforeOutputMutation", primaryFailure };
}

function createFailure(
  code: PackagingFailureCode,
  phase: string,
  message: string,
): PackagingFailure {
  return Object.freeze({ code, phase, message });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "detail" in error && typeof error.detail === "string") {
    return error.detail;
  }
  return String(error);
}

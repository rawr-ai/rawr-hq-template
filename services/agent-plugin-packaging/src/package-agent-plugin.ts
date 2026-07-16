import { parseArtifactRef } from "@rawr/agent-plugin-release";

import type { ArtifactReader } from "./artifact-reader";
import type { AtomicPackageOutput } from "./atomic-output";
import {
  COWORK_PACKAGE_FORMAT,
  type PackageAgentPluginRequest,
  type PackageAgentPluginResult,
  type PackagingFailure,
  type PackagingFailureCode,
} from "./contract";
import { assertSnapshotMatchesRef, renderCoworkV1 } from "./cowork-v1";

export interface PackageAgentPluginApplication {
  package(request: unknown): Promise<PackageAgentPluginResult>;
}

export interface PackageAgentPluginDependencies {
  readonly artifactReader: ArtifactReader;
  readonly output: AtomicPackageOutput;
}

export function createPackageAgentPluginApplication(
  dependencies: PackageAgentPluginDependencies,
): PackageAgentPluginApplication {
  return {
    package: (request) => packageAgentPlugin(request, dependencies),
  };
}

async function packageAgentPlugin(
  input: unknown,
  dependencies: PackageAgentPluginDependencies,
): Promise<PackageAgentPluginResult> {
  const request = parseRequest(input);
  if (request instanceof RequestFailure) {
    return rejected(request.failure);
  }

  let readResult: Awaited<ReturnType<ArtifactReader["read"]>>;
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
    rendered = await renderCoworkV1(readResult.snapshot);
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
  let output: Awaited<ReturnType<AtomicPackageOutput["publish"]>>;
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

function parseRequest(input: unknown): PackageAgentPluginRequest | RequestFailure {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return invalidRequest("Packaging request must be a closed object");
  }
  const keys = Object.keys(input).sort();
  if (keys.join("\0") !== ["artifactRef", "format", "outputPath"].sort().join("\0")) {
    return invalidRequest("Packaging request fields must be exactly artifactRef, format, and outputPath");
  }
  if (!("artifactRef" in input) || !("format" in input) || !("outputPath" in input)) {
    return invalidRequest("Packaging request is incomplete");
  }
  const artifactRef = parseArtifactRef(input.artifactRef);
  if (!artifactRef.ok) {
    return invalidRequest(`Invalid artifact reference: ${artifactRef.issues.map((issue) => issue.code).join(",")}`);
  }
  if (input.format !== COWORK_PACKAGE_FORMAT) {
    return invalidRequest(`Package format must be ${COWORK_PACKAGE_FORMAT}`);
  }
  if (typeof input.outputPath !== "string" || input.outputPath.length === 0) {
    return invalidRequest("Package outputPath must be a non-empty string");
  }
  return Object.freeze({
    artifactRef: artifactRef.value,
    format: COWORK_PACKAGE_FORMAT,
    outputPath: input.outputPath,
  });
}

class RequestFailure {
  constructor(readonly failure: PackagingFailure) {}
}

function invalidRequest(message: string): RequestFailure {
  return new RequestFailure(failure("InvalidRequest", "request", message));
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

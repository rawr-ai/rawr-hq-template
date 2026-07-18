import {
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  contentDigest,
} from "../../service/shared/release";
import type {
  AtomicPackageOutput,
  AtomicPackageOutputResult,
  CoworkV1Runtime,
  PackageDigest,
  PackageOutputFailpointContext,
  PackageOutputFailpoints,
  PackagingFailure,
  PackagingFailureCode,
  PackagingLifecycleRuntime,
} from "../../service/modules/packaging/ports";
import type {
  AgentPluginPackageOutputAsyncPort,
  PackageOutputFailure,
  PackageOutputPublicationEvent,
  PackageOutputPublicationResult,
} from "@rawr/resource-agent-plugin-package-output";

export interface ResourcePackageOutputOptions {
  readonly artifactReader: PackagingLifecycleRuntime["artifactReader"];
  readonly packageOutput: AgentPluginPackageOutputAsyncPort;
  readonly failpoints?: PackageOutputFailpoints;
}

/** Projects the generic package output resource into the lifecycle service's packaging ports. */
export function createResourcePackageOutputRuntime(
  options: ResourcePackageOutputOptions,
): PackagingLifecycleRuntime {
  return Object.freeze({
    artifactReader: options.artifactReader,
    coworkV1: coworkV1Runtime(options.packageOutput),
    output: atomicOutput(options.packageOutput, options.failpoints),
  });
}

export function coworkV1PackageDigest(bytes: Uint8Array): PackageDigest {
  const digest = contentDigest(bytes);
  return `pkg1_${digest.slice("sha256_".length)}`;
}

function coworkV1Runtime(port: AgentPluginPackageOutputAsyncPort): CoworkV1Runtime {
  return Object.freeze({
    encode: (request: Parameters<CoworkV1Runtime["encode"]>[0]) => port.encodeCoworkV1(request),
    packageDigest: coworkV1PackageDigest,
  });
}

function atomicOutput(
  port: AgentPluginPackageOutputAsyncPort,
  failpoints: PackageOutputFailpoints | undefined,
): AtomicPackageOutput {
  return Object.freeze({
    async publish(
      request: Parameters<AtomicPackageOutput["publish"]>[0],
    ): Promise<AtomicPackageOutputResult> {
      if (coworkV1PackageDigest(request.bytes) !== request.packageDigest) {
        return Object.freeze({
          kind: "RejectedBeforeOutputMutation",
          primaryFailure: serviceFailure(
            "InvalidRequest",
            "package-digest",
            "Package digest does not bind the exact output bytes",
          ),
        });
      }
      let result: PackageOutputPublicationResult;
      try {
        result = await port.publish({
          outputPath: request.outputPath,
          bytes: new Uint8Array(request.bytes),
          maxPriorOutputBytes: Math.max(request.bytes.byteLength, MAX_RELEASE_SET_PAYLOAD_BYTES),
          ...(failpoints === undefined
            ? {}
            : {
              control: {
                onEvent: (event: PackageOutputPublicationEvent) =>
                  relayPublicationEvent(failpoints, event),
              },
            }),
        });
      } catch (error) {
        return Object.freeze({
          kind: "OutputUnsettled",
          primaryFailure: serviceFailure("OutputVerifyFailed", "output-port", errorDetail(error)),
        });
      }
      return mapPublication(result);
    },
  });
}

function mapPublication(result: PackageOutputPublicationResult): AtomicPackageOutputResult {
  switch (result.kind) {
    case "ReadOnlyConverged":
      return Object.freeze({ kind: result.kind });
    case "OutputReplacedVerified":
      return Object.freeze({ kind: result.kind, priorOutput: result.priorOutput });
    case "RejectedBeforeOutputMutation":
    case "OutputUnsettled":
      return Object.freeze({
        kind: result.kind,
        primaryFailure: mapFailure(result.primaryFailure),
        ...(result.cleanupFailure === undefined
          ? {}
          : { cleanupFailure: mapFailure(result.cleanupFailure, true) }),
      });
  }
}

function mapFailure(failure: PackageOutputFailure, cleanup = false): PackagingFailure {
  return serviceFailure(
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

async function relayPublicationEvent(
  failpoints: PackageOutputFailpoints,
  event: PackageOutputPublicationEvent,
): Promise<void> {
  await failpoints.hit(event.point, mapFailpointContext(event));
}

function mapFailpointContext(
  context: PackageOutputPublicationEvent,
): PackageOutputFailpointContext {
  return Object.freeze({
    outputPath: context.outputPath,
    ...(context.temporaryPath === undefined ? {} : { temporaryPath: context.temporaryPath }),
  });
}

function isProviderFailpoint(phase: string): boolean {
  return phase === "AfterOutputObserved"
    || phase === "BeforeCommit"
    || phase === "AfterCommit"
    || phase === "BeforeFinalVerification";
}

function serviceFailure(
  code: PackagingFailureCode,
  phase: string,
  message: string,
): PackagingFailure {
  return Object.freeze({ code, phase, message });
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "detail" in error && typeof error.detail === "string") {
    return error.detail;
  }
  return String(error);
}

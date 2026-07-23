import type {
  AgentPluginPackageOutputAsyncPort,
  PackageOutputFailure,
  PackageOutputPublicationResult,
} from "@rawr/resource-agent-plugin-package-output";
import type { ContentWorkspaceSnapshotReader } from "../../../model/dependencies/releases";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../shared/release";
import { deriveReleaseSelection } from "../../releases/model/policy/release-plan";
import {
  COWORK_PACKAGE_FORMAT,
  MAX_PACKAGING_FAILURE_MESSAGE_LENGTH,
  MAX_PACKAGING_FAILURE_PHASE_LENGTH,
  type PackageAgentPluginRequest,
  type PackageAgentPluginResult,
  type PackagedReleaseIdentity,
  type PackagingFailure,
  type PackagingFailureCode,
} from "../model/dto/packaging-lifecycle";
import { coworkV1PackageDigest, createCoworkV1ArchiveRequest } from "../model/helpers/cowork-v1";
import { module } from "../module";

interface PackagingDependencies {
  readonly source: ContentWorkspaceSnapshotReader;
  readonly packageOutput: AgentPluginPackageOutputAsyncPort;
}

const TRUNCATED_PACKAGING_DIAGNOSTIC_SUFFIX = "...[truncated]";
const UNREADABLE_EXTERNAL_DIAGNOSTIC = "External dependency failed without a readable diagnostic";

export const packageProcedure = module.package.handler(async ({ context, input }) => {
  return packageAgentPlugin(input, {
    source: context.source,
    packageOutput: context.packageOutput,
  });
});

async function packageAgentPlugin(
  request: PackageAgentPluginRequest,
  dependencies: PackagingDependencies
): Promise<PackageAgentPluginResult> {
  let inspected: Awaited<ReturnType<ContentWorkspaceSnapshotReader["inspect"]>>;
  try {
    inspected = await dependencies.source.inspect(request.contentWorkspace);
  } catch (error) {
    return rejected(
      createFailure(
        "SourceReadFailed",
        "source-inspect",
        `Content source inspection failed without a closed result: ${errorMessage(error)}`
      )
    );
  }
  if (inspected.kind === "Ineligible") {
    return rejected(
      createFailure("SourceIneligible", "source-inspect", sourceIssueMessage(inspected.issues))
    );
  }

  const derivation = deriveReleaseSelection(inspected.snapshot, request.mode);
  if (!derivation.ok) {
    return rejected(
      createFailure(
        "ReleaseConstructionFailed",
        "release-construct",
        derivation.issues
          .map((issue) => issue.kind)
          .sort()
          .join(",")
      )
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = await dependencies.packageOutput.encodeCoworkV1(
      createCoworkV1ArchiveRequest(derivation.value)
    );
  } catch (error) {
    return rejected(
      createFailure(
        "PackageRenderFailed",
        "package-render",
        `Cowork v1 rendering failed: ${errorDetail(error)}`
      )
    );
  }

  let revalidated: Awaited<ReturnType<ContentWorkspaceSnapshotReader["revalidate"]>>;
  try {
    revalidated = await dependencies.source.revalidate(
      request.contentWorkspace,
      inspected.snapshot.eligibilityBinding
    );
  } catch (error) {
    return rejected(
      createFailure(
        "SourceReadFailed",
        "source-revalidate",
        `Content source revalidation failed without a closed result: ${errorMessage(error)}`
      )
    );
  }
  if (revalidated.kind === "Ineligible") {
    return rejected(
      createFailure("SourceIneligible", "source-revalidate", sourceIssueMessage(revalidated.issues))
    );
  }

  const packageDigest = coworkV1PackageDigest(bytes);
  const identity = {
    repositoryIdentity: inspected.snapshot.repositoryIdentity,
    sourceCommit: inspected.snapshot.sourceCommit,
    sourceTree: inspected.snapshot.sourceTree,
    release: packagedReleaseIdentity(derivation.value),
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
        `Atomic output port failed without a closed result: ${errorDetail(error)}`
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

function packagedReleaseIdentity(
  plan: Extract<ReturnType<typeof deriveReleaseSelection>, { readonly ok: true }>["value"]
): PackagedReleaseIdentity {
  if (plan.releaseSet !== undefined) {
    return Object.freeze({
      kind: "complete-set",
      releaseSetDigest: plan.releaseSet.releaseSetDigest,
    });
  }
  const release = plan.releases[0];
  if (release === undefined) throw new Error("Targeted release construction returned no release");
  return Object.freeze({
    kind: "release",
    pluginId: release.artifactBody.releaseBody.pluginId,
    releaseDigest: release.releaseDigest,
  });
}

function sourceIssueMessage(
  issues: readonly Readonly<{ readonly code: string; readonly detail: string }>[]
): string {
  return issues
    .map((issue) => `${issue.code}:${issue.detail}`)
    .sort()
    .join(",");
}

function mapFailure(failure: PackageOutputFailure, cleanup = false): PackagingFailure {
  return createFailure(
    cleanup ? cleanupFailureCode(failure) : primaryFailureCode(failure),
    failure.phase,
    failure.detail
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
  return (
    phase === "AfterOutputObserved" ||
    phase === "BeforeCommit" ||
    phase === "AfterCommit" ||
    phase === "BeforeFinalVerification"
  );
}

function rejected(primaryFailure: PackagingFailure): PackageAgentPluginResult {
  return { kind: "RejectedBeforeOutputMutation", primaryFailure };
}

function createFailure(
  code: PackagingFailureCode,
  phase: string,
  message: string
): PackagingFailure {
  return Object.freeze({
    code,
    phase: boundedDiagnostic(phase, MAX_PACKAGING_FAILURE_PHASE_LENGTH),
    message: boundedDiagnostic(message, MAX_PACKAGING_FAILURE_MESSAGE_LENGTH),
  });
}

function errorMessage(error: unknown): string {
  try {
    return diagnosticString(error instanceof Error ? error.message : error);
  } catch {
    return UNREADABLE_EXTERNAL_DIAGNOSTIC;
  }
}

function errorDetail(error: unknown): string {
  try {
    if (error instanceof Error) return diagnosticString(error.message);
    if (typeof error === "object" && error !== null && "detail" in error) {
      const detail = error.detail;
      if (typeof detail === "string") return detail;
    }
    return diagnosticString(error);
  } catch {
    return UNREADABLE_EXTERNAL_DIAGNOSTIC;
  }
}

function diagnosticString(value: unknown): string {
  try {
    return typeof value === "string" ? value : String(value);
  } catch {
    return UNREADABLE_EXTERNAL_DIAGNOSTIC;
  }
}

function boundedDiagnostic(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(
    0,
    maxLength - TRUNCATED_PACKAGING_DIAGNOSTIC_SUFFIX.length
  )}${TRUNCATED_PACKAGING_DIAGNOSTIC_SUFFIX}`;
}

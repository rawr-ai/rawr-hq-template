import type { PackageOutputFailure } from "@rawr/resource-agent-plugin-package-output";

import type { DerivedReleaseSelection } from "#agent-plugin-lifecycle-service/model/dto/release-derivation";
import {
  MAX_PACKAGING_FAILURE_MESSAGE_LENGTH,
  MAX_PACKAGING_FAILURE_PHASE_LENGTH,
  type PackageAgentPluginResult,
  type PackagedReleaseIdentity,
  type PackagingFailure,
  type PackagingFailureCode,
} from "../dto/packaging-lifecycle";

const TRUNCATED_PACKAGING_DIAGNOSTIC_SUFFIX = "...[truncated]";
const UNREADABLE_EXTERNAL_DIAGNOSTIC = "External dependency failed without a readable diagnostic";

/**
 * Projects a derived selection into the package identity reported by settled output.
 *
 * Packaging owns this projection so release construction remains neutral to
 * the output format and its public result vocabulary.
 */
export function packagedReleaseIdentity(
  selection: DerivedReleaseSelection
): PackagedReleaseIdentity {
  if (selection.releaseSet !== undefined) {
    return Object.freeze({
      kind: "complete-set",
      releaseSetDigest: selection.releaseSet.releaseSetDigest,
    });
  }
  const release = selection.releases[0];
  if (release === undefined) throw new Error("Targeted release construction returned no release");
  return Object.freeze({
    kind: "release",
    pluginId: release.artifactBody.releaseBody.pluginId,
    releaseDigest: release.releaseDigest,
  });
}

/**
 * Produces the stable public diagnostic for an ineligible source observation.
 *
 * Sorting here keeps source policy independent from Packaging's failure text.
 */
export function sourceIssueMessage(
  issues: readonly Readonly<{ readonly code: string; readonly detail: string }>[]
): string {
  return issues
    .map((issue) => `${issue.code}:${issue.detail}`)
    .sort()
    .join(",");
}

/**
 * Classifies a package-output resource failure into Packaging's public failure vocabulary.
 *
 * Resource mechanics remain behind the port while the module owns the result
 * code and bounded diagnostic exposed to its callers.
 */
export function mapPackageOutputFailure(
  failure: PackageOutputFailure,
  cleanup = false
): PackagingFailure {
  return createPackagingFailure(
    cleanup ? cleanupFailureCode(failure) : primaryFailureCode(failure),
    failure.phase,
    failure.detail
  );
}

/**
 * Maps a typed archive-encoding failure into Packaging's stable render refusal.
 */
export function packageRenderFailure(failure: PackageOutputFailure): PackagingFailure {
  return createPackagingFailure(
    "PackageRenderFailed",
    "package-render",
    `Cowork v1 rendering failed: ${failure.phase}: ${failure.detail}`
  );
}

/**
 * Maps an escaped typed publication failure into Packaging's unsettled result.
 */
export function unsettledPackageOutputFailure(failure: PackageOutputFailure): PackagingFailure {
  return createPackagingFailure(
    "OutputVerifyFailed",
    "output-port",
    `Atomic output port failed without a closed result: ${failure.phase}: ${failure.detail}`
  );
}

/**
 * Constructs a pre-mutation refusal without fabricating a package identity.
 */
export function rejectedPackagingResult(
  primaryFailure: PackagingFailure
): PackageAgentPluginResult {
  return { kind: "RejectedBeforeOutputMutation", primaryFailure };
}

/**
 * Constructs one bounded Packaging failure at the module's public result boundary.
 */
export function createPackagingFailure(
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

/**
 * Renders an unknown inspection or revalidation failure without exposing an unreadable value.
 */
export function externalErrorMessage(error: unknown): string {
  try {
    return diagnosticString(error instanceof Error ? error.message : error);
  } catch {
    return UNREADABLE_EXTERNAL_DIAGNOSTIC;
  }
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

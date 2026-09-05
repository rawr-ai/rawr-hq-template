import type {
  HarnessFinding,
  HarnessHealthKind,
  HarnessHealthReport,
  RequiredResourceReadiness,
  RuntimeLaunchIdentity,
} from "./harness-descriptor";

function assertFindings(findings: readonly HarnessFinding[]): void {
  if (
    !Array.isArray(findings) ||
    findings.some(
      (finding) =>
        finding === null ||
        typeof finding !== "object" ||
        typeof finding.code !== "string" ||
        typeof finding.message !== "string" ||
        !["info", "warning", "error"].includes(finding.severity)
    )
  )
    throw new TypeError("Harness findings must contain bounded finding records.");
}

/** A native owner checks read-only provisioning evidence before touching its host. */
export function assertRequiredResourcesReady(input: RequiredResourceReadiness): void {
  if (
    input === null ||
    typeof input !== "object" ||
    input.ready !== true ||
    !Array.isArray(input.resources)
  ) {
    throw new TypeError("Required resource readiness is not passing.");
  }
  for (const resource of input.resources) {
    if (
      resource === null ||
      typeof resource !== "object" ||
      typeof resource.resource !== "string" ||
      resource.resource.length === 0 ||
      resource.ready !== true
    ) {
      throw new TypeError("A required resource is not ready.");
    }
    assertFindings(resource.findings);
    if (resource.findings.some((finding: HarnessFinding) => finding.severity === "error"))
      throw new TypeError("Required resource readiness contains an error finding.");
  }
}

/** Validation does not turn unknown or not-applicable evidence into passing readiness. */
export function assertHarnessHealthReport(
  report: HarnessHealthReport,
  expected: {
    readonly launchIdentity: RuntimeLaunchIdentity;
    readonly harnessId: string;
    readonly kind: HarnessHealthKind;
  }
): void {
  if (
    report === null ||
    typeof report !== "object" ||
    report.launchIdentity !== expected.launchIdentity ||
    report.harnessId !== expected.harnessId ||
    report.kind !== expected.kind ||
    !["passing", "failing", "not-applicable", "unknown"].includes(report.status)
  ) {
    throw new TypeError("Harness health evidence does not match its mount identity and probe.");
  }
  assertFindings(report.findings);
  if (
    report.status === "passing" &&
    report.findings.some((finding) => finding.severity === "error")
  ) {
    throw new TypeError("Passing harness health cannot contain an error finding.");
  }
}

/** Share one owner's native stop, including its original rejection; no cross-owner coordination. */
export function createOwnerStop(stop: () => void | Promise<void>): () => Promise<void> {
  let stopping: Promise<void> | undefined;
  return () => (stopping ??= Promise.resolve().then(stop));
}

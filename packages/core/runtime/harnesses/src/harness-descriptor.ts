import type { AppRole, RuntimeLaunchIdentity } from "../../definition/src/app";
import type { ProcessRuntimeAccess } from "../../process-runtime/src/runtime-access";

export type { AppRole, RuntimeLaunchIdentity } from "../../definition/src/app";
export type { ProcessRuntimeAccess } from "../../process-runtime/src/runtime-access";

export interface HarnessFinding {
  readonly code: string;
  readonly message: string;
  readonly severity: "info" | "warning" | "error";
}

export interface RequiredResourceReadinessRecord {
  readonly resource: string;
  readonly ready: boolean;
  readonly findings: readonly HarnessFinding[];
}

export interface RequiredResourceReadiness {
  readonly ready: boolean;
  readonly resources: readonly RequiredResourceReadinessRecord[];
}

export type HarnessHealthKind = "readiness" | "liveness";
export type HarnessHealthStatus = "passing" | "failing" | "not-applicable" | "unknown";

export interface HarnessHealthReport {
  readonly launchIdentity: RuntimeLaunchIdentity;
  readonly harnessId: string;
  readonly kind: HarnessHealthKind;
  readonly status: HarnessHealthStatus;
  readonly findings: readonly HarnessFinding[];
}

export interface HarnessReportSink {
  report(report: HarnessHealthReport): void | Promise<void>;
}

export interface HarnessMountInput<TMountPayload = unknown> {
  readonly launchIdentity: RuntimeLaunchIdentity;
  readonly roles: readonly AppRole[];
  readonly mountReadyPayloads: readonly TMountPayload[];
  readonly processAccess: ProcessRuntimeAccess;
  readonly requiredResources: RequiredResourceReadiness;
  readonly reports: HarnessReportSink;
}

export interface NativeHarnessHandle {
  /** Share one stop promise; rejection occurs only after native work and cleanup settle. */
  stop(): Promise<void>;
  readiness?(): Promise<HarnessHealthReport>;
  liveness?(): Promise<HarnessHealthReport>;
}

export interface HarnessDescriptor<TMountPayload = unknown> {
  readonly id: string;
  readonly roles: readonly AppRole[];
  readonly surfaces: readonly string[];
  /** On failure, settle cleanup of partial native state before rejecting. */
  mount(input: HarnessMountInput<TMountPayload>): Promise<NativeHarnessHandle>;
}

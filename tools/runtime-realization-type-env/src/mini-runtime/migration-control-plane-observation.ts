import type { DeploymentRuntimeHandoff } from "./deployment-handoff";
import {
  redactRuntimeRecordAttributes,
  type InMemoryRuntimeCatalog,
  type RuntimeRecordAttributes,
  type RuntimeRecordValue,
} from "./catalog";
import type {
  RuntimeTelemetryOtlpExportResult,
  RuntimeTelemetryRecord,
} from "./telemetry-export";

export interface MigrationControlPlanePlacementCandidateInput {
  readonly targetId: string;
  readonly reason: string;
  readonly role?: string;
  readonly surface?: string;
  readonly attributes?: Record<string, unknown>;
}

/**
 * A migration-review hint about where a realized runtime concern might land.
 *
 * This is deliberately a candidate, not a placement decision or scheduler
 * command. Future control-plane work may promote or reject it outside this
 * lab-only packet boundary.
 */
export interface MigrationControlPlanePlacementCandidate {
  readonly kind: "runtime.migration-control-plane-placement-candidate";
  readonly targetId: string;
  readonly reason: string;
  readonly role?: string;
  readonly surface?: string;
  readonly decision: "candidate-only";
  readonly attributes: RuntimeRecordAttributes;
}

export interface MigrationControlPlaneDeploymentObservation {
  readonly kind: "runtime.migration-control-plane-deployment-observation";
  readonly appId: string;
  readonly portableArtifactKind: DeploymentRuntimeHandoff["portableArtifact"]["kind"];
  readonly compiledProcessPlanKind: DeploymentRuntimeHandoff["compiledProcessPlan"]["kind"];
  readonly executionDescriptorRefCount: number;
  readonly executionPlanCount: number;
  readonly serviceBindingPlanCount: number;
  readonly surfaceRuntimePlanCount: number;
  readonly serverRouteDescriptorCount: number;
  readonly workflowDispatcherDescriptorCount: number;
  readonly diagnosticCount: number;
  readonly roles: readonly string[];
  readonly boundaries: readonly string[];
}

export interface MigrationControlPlaneCatalogObservation {
  readonly kind: "runtime.migration-control-plane-catalog-observation";
  readonly catalogKind: InMemoryRuntimeCatalog["kind"];
  readonly moduleCount: number;
  readonly recordCount: number;
  readonly phases: readonly string[];
  readonly subjectIds: readonly string[];
  readonly lastSequence?: number;
}

/**
 * Run-level telemetry summary used to correlate the packet with lab traces.
 *
 * The packet keeps source/name/export status facts only; it does not embed
 * telemetry payloads or become the telemetry persistence surface.
 */
export interface MigrationControlPlaneTelemetryObservation {
  readonly kind: "runtime.migration-control-plane-telemetry-observation";
  readonly runId: string;
  readonly traceId?: string;
  readonly recordCount: number;
  readonly sources: readonly string[];
  readonly names: readonly string[];
  readonly export?: {
    readonly kind: RuntimeTelemetryOtlpExportResult["kind"];
    readonly status: RuntimeTelemetryOtlpExportResult["status"];
    readonly endpoint: string;
    readonly httpStatus?: number;
  };
}

/**
 * Portable, lab-local handoff from runtime observation into migration review.
 *
 * The packet carries correlation, candidate, and summary facts only. It is not
 * catalog storage, product observability, deployment placement, persistence, or
 * a control-plane API.
 */
export interface MigrationControlPlaneObservationPacket {
  readonly kind: "runtime.migration-control-plane-observation-packet";
  readonly observationId: string;
  readonly correlationId: string;
  readonly runId: string;
  readonly traceId?: string;
  readonly appId: string;
  readonly deployment: MigrationControlPlaneDeploymentObservation;
  readonly catalog: MigrationControlPlaneCatalogObservation;
  readonly telemetry: MigrationControlPlaneTelemetryObservation;
  readonly placementCandidates: readonly MigrationControlPlanePlacementCandidate[];
  readonly attributes: RuntimeRecordAttributes;
}

export interface MigrationControlPlaneObservationInput {
  readonly deploymentHandoff: DeploymentRuntimeHandoff;
  readonly catalog: InMemoryRuntimeCatalog;
  readonly runId: string;
  readonly traceId?: string;
  readonly telemetryRecords?: readonly RuntimeTelemetryRecord[];
  readonly telemetryExport?: RuntimeTelemetryOtlpExportResult;
  readonly placementCandidates?: readonly MigrationControlPlanePlacementCandidateInput[];
  readonly observationId?: string;
  readonly correlationId?: string;
  readonly attributes?: Record<string, unknown>;
}

// Reject live handles and authority-bearing fields at the observation boundary.
// Redaction remains a fallback for reportable attributes, not permission to
// accept runtime access objects, descriptors, secrets, or provider payloads.
const FORBIDDEN_CONTROL_PLANE_INPUT_KEY =
  /descriptorTable|descriptor$|^run$|runtimeAccess|liveRuntimeHandle|managedRuntime|effectRuntime|rawSecret|secret|token|password|credential|api[-_]?key|private[-_]?key|providerValue|releaseHandle|acquireHandle/i;

const CONTROL_PLANE_REDACTED_KEY =
  /secret|token|password|credential|api[-_]?key|private[-_]?key|handle|payload|body|runtimeAccess/i;

function uniqueSorted(values: readonly (string | undefined)[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function stableHex(input: string, length: number): string {
  let seed = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    seed ^= input.charCodeAt(index);
    seed = Math.imul(seed, 0x01000193);
  }

  let hex = "";
  while (hex.length < length) {
    seed = Math.imul(seed ^ hex.length ^ input.length, 1664525) + 1013904223;
    hex += (seed >>> 0).toString(16).padStart(8, "0");
  }

  return hex.slice(0, length);
}

function assertNoForbiddenInputKeys(
  value: unknown,
  path: string,
  seen: WeakSet<object> = new WeakSet(),
): void {
  if (typeof value === "function" || typeof value === "symbol") {
    throw new Error(`migration control-plane observation rejects live handle at ${path}`);
  }

  if (value === null || typeof value !== "object") return;

  if (seen.has(value)) {
    throw new Error(`migration control-plane observation rejects cyclic value at ${path}`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoForbiddenInputKeys(entry, `${path}[${index}]`, seen),
    );
    seen.delete(value);
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_CONTROL_PLANE_INPUT_KEY.test(key)) {
      throw new Error(
        `migration control-plane observation rejects forbidden field at ${childPath}`,
      );
    }
    assertNoForbiddenInputKeys(entry, childPath, seen);
  }

  seen.delete(value);
}

function redactControlPlaneValue(
  value: unknown,
  key?: string,
  seen: WeakSet<object> = new WeakSet(),
): RuntimeRecordValue {
  if (key && CONTROL_PLANE_REDACTED_KEY.test(key)) {
    return "[redacted]";
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();

  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return "[redacted:live-handle]";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactControlPlaneValue(entry, undefined, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[redacted:cycle]";
    seen.add(value);

    const kind = "kind" in value ? String(value.kind) : "";
    if (
      kind === "runtime.resource-access" ||
      kind === "execution.descriptor" ||
      kind === "deployment.runtime-handoff"
    ) {
      seen.delete(value);
      return "[redacted:live-handle]";
    }

    const redacted = Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactControlPlaneValue(entryValue, entryKey, seen),
      ]),
    ) as RuntimeRecordAttributes;
    seen.delete(value);
    return redacted;
  }

  return String(value);
}

function redactControlPlaneAttributes(
  attributes: Record<string, unknown> = {},
): RuntimeRecordAttributes {
  return redactControlPlaneValue(attributes) as RuntimeRecordAttributes;
}

function deploymentObservation(
  handoff: DeploymentRuntimeHandoff,
): MigrationControlPlaneDeploymentObservation {
  if (
    handoff.appId !== handoff.portableArtifact.appId ||
    handoff.appId !== handoff.compiledProcessPlan.appId
  ) {
    throw new Error(
      `migration control-plane observation appId mismatch for deployment handoff ${handoff.appId}`,
    );
  }

  assertNoForbiddenInputKeys(handoff, "deploymentHandoff");

  const refs = handoff.portableArtifact.executionDescriptorRefs;
  return {
    kind: "runtime.migration-control-plane-deployment-observation",
    appId: handoff.appId,
    portableArtifactKind: handoff.portableArtifact.kind,
    compiledProcessPlanKind: handoff.compiledProcessPlan.kind,
    executionDescriptorRefCount: refs.length,
    executionPlanCount: handoff.compiledProcessPlan.executionPlans.length,
    serviceBindingPlanCount: handoff.portableArtifact.serviceBindingPlans.length,
    surfaceRuntimePlanCount: handoff.portableArtifact.surfaceRuntimePlans.length,
    serverRouteDescriptorCount:
      handoff.portableArtifact.serverRouteDescriptors.length,
    workflowDispatcherDescriptorCount:
      handoff.portableArtifact.workflowDispatcherDescriptors.length,
    diagnosticCount: handoff.portableArtifact.diagnostics.length,
    roles: uniqueSorted(refs.map((ref) => ref.role)),
    boundaries: uniqueSorted(refs.map((ref) => ref.boundary)),
  };
}

function catalogObservation(
  catalog: InMemoryRuntimeCatalog,
): MigrationControlPlaneCatalogObservation {
  return {
    kind: "runtime.migration-control-plane-catalog-observation",
    catalogKind: catalog.kind,
    moduleCount: catalog.modules.length,
    recordCount: catalog.records.length,
    phases: uniqueSorted(catalog.records.map((record) => record.phase)),
    subjectIds: uniqueSorted(catalog.records.map((record) => record.subjectId)),
    ...(catalog.records.length > 0
      ? { lastSequence: catalog.records[catalog.records.length - 1]?.sequence }
      : {}),
  };
}

function telemetryObservation(input: {
  readonly runId: string;
  readonly traceId?: string;
  readonly records: readonly RuntimeTelemetryRecord[];
  readonly exportResult?: RuntimeTelemetryOtlpExportResult;
}): MigrationControlPlaneTelemetryObservation {
  // A packet can summarize only telemetry from the same runtime run; mixed-run
  // records would make migration evidence look more authoritative than it is.
  for (const record of input.records) {
    if (
      "telemetryRunId" in record.attributes &&
      record.attributes.telemetryRunId !== input.runId
    ) {
      throw new Error(
        `migration control-plane observation telemetry runId mismatch: expected ${input.runId}`,
      );
    }
  }

  return {
    kind: "runtime.migration-control-plane-telemetry-observation",
    runId: input.runId,
    ...(input.traceId ? { traceId: input.traceId } : {}),
    recordCount: input.records.length,
    sources: uniqueSorted(input.records.map((record) => record.source)),
    names: uniqueSorted(input.records.map((record) => record.name)),
    ...(input.exportResult
      ? {
          export: {
            kind: input.exportResult.kind,
            status: input.exportResult.status,
            endpoint: input.exportResult.endpoint,
            ...("httpStatus" in input.exportResult &&
            input.exportResult.httpStatus !== undefined
              ? { httpStatus: input.exportResult.httpStatus }
              : {}),
          },
        }
      : {}),
  };
}

function placementCandidate(
  input: MigrationControlPlanePlacementCandidateInput,
): MigrationControlPlanePlacementCandidate {
  // Candidates preserve a possible destination without crossing into policy,
  // scheduling, or deployment authority.
  return {
    kind: "runtime.migration-control-plane-placement-candidate",
    targetId: input.targetId,
    reason: input.reason,
    ...(input.role ? { role: input.role } : {}),
    ...(input.surface ? { surface: input.surface } : {}),
    decision: "candidate-only",
    attributes: redactControlPlaneAttributes(input.attributes),
  };
}

export function createMigrationControlPlaneObservationPacket(
  input: MigrationControlPlaneObservationInput,
): MigrationControlPlaneObservationPacket {
  const telemetryRecords = input.telemetryRecords ?? [];
  const deployment = deploymentObservation(input.deploymentHandoff);
  const catalog = catalogObservation(input.catalog);
  const telemetry = telemetryObservation({
    runId: input.runId,
    traceId: input.traceId,
    records: telemetryRecords,
    exportResult: input.telemetryExport,
  });
  const correlationId =
    input.correlationId ??
    `runtime-control-plane:${input.deploymentHandoff.appId}:${stableHex(
      JSON.stringify({
        runId: input.runId,
        traceId: input.traceId,
        catalogRecords: catalog.recordCount,
        telemetryRecords: telemetry.recordCount,
        placementCandidates: input.placementCandidates?.length ?? 0,
      }),
      12,
    )}`;
  const observationId =
    input.observationId ??
    `observation:${input.deploymentHandoff.appId}:${stableHex(correlationId, 12)}`;

  return {
    kind: "runtime.migration-control-plane-observation-packet",
    observationId,
    correlationId,
    runId: input.runId,
    ...(input.traceId ? { traceId: input.traceId } : {}),
    appId: input.deploymentHandoff.appId,
    deployment,
    catalog,
    telemetry,
    placementCandidates: (input.placementCandidates ?? []).map(placementCandidate),
    attributes: redactRuntimeRecordAttributes(
      redactControlPlaneAttributes(input.attributes),
    ),
  };
}

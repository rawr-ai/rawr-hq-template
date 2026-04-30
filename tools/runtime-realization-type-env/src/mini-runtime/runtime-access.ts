import type { RuntimeResourceAccess } from "../spine/artifacts";
import type {
  RuntimeDiagnostic,
  RuntimeTelemetry,
  RuntimeTopologyRecord,
} from "../spine/artifacts";
import {
  redactRuntimeRecordAttributes,
  type RuntimeRecordAttributes,
} from "./catalog";

export interface MiniRuntimeResourceDefinition<TValue = unknown> {
  readonly id: string;
  readonly value: TValue;
  readonly metadata?: Record<string, unknown>;
}

export interface MiniRuntimeResourceRecord {
  readonly kind: "runtime.resource-record";
  readonly resourceId: string;
  readonly metadata: RuntimeRecordAttributes;
}

export interface MiniRuntimeTopologyRecord {
  readonly kind: "runtime.topology-record";
  readonly record: RuntimeRecordAttributes;
}

export interface MiniRuntimeDiagnosticRecord {
  readonly kind: "runtime.diagnostic-record";
  readonly code: string;
  readonly message: string;
  readonly attributes?: RuntimeRecordAttributes;
}

export interface MiniRuntimeTelemetryEvent {
  readonly kind: "runtime.telemetry-event";
  readonly name: string;
  readonly attributes?: RuntimeRecordAttributes;
}

/**
 * Mini-runtime-only probe over the canonical-looking RuntimeResourceAccess seam.
 *
 * This type deliberately exposes sanctioned lookup plus redacted observation
 * sinks, while leaving raw resource catalogs, host handles, and final public
 * method law outside the lab. Future migration work may copy the authority
 * boundary, not this exact helper as public API.
 */
export type MiniRuntimeResourceAccess = RuntimeResourceAccess & {
  requireResource<TValue = unknown>(resourceId: string): TValue;
  optionalResource<TValue = unknown>(resourceId: string): TValue | undefined;
  resourceMetadata(resourceId: string): RuntimeRecordAttributes | undefined;
  telemetry(): RuntimeTelemetry;
  emitTopology(record: RuntimeTopologyRecord): void;
  emitDiagnostic(diagnostic: RuntimeDiagnostic & {
    readonly attributes?: Record<string, unknown>;
  }): void;
};

export type MiniRuntimeResourceAccessProbe = MiniRuntimeResourceAccess & {
  records(): readonly MiniRuntimeResourceRecord[];
  topologyRecords(): readonly MiniRuntimeTopologyRecord[];
  diagnosticRecords(): readonly MiniRuntimeDiagnosticRecord[];
  telemetryEvents(): readonly MiniRuntimeTelemetryEvent[];
};

/**
 * Builds an in-process resource access probe for contained runtime tests.
 *
 * Runtime values may be live handles; only metadata and emitted observation
 * records cross the proof boundary, and those are redacted before exposure.
 * The returned probe is a simulation surface for contained resource-access
 * checks, not a production catalog, telemetry exporter, or dependency-injection
 * container.
 */
export function createMiniRuntimeResourceAccess(
  resources: readonly MiniRuntimeResourceDefinition[],
): MiniRuntimeResourceAccessProbe {
  const byId = new Map<string, MiniRuntimeResourceDefinition>();
  const topologyRecords: MiniRuntimeTopologyRecord[] = [];
  const diagnosticRecords: MiniRuntimeDiagnosticRecord[] = [];
  const telemetryEvents: MiniRuntimeTelemetryEvent[] = [];

  const telemetry: RuntimeTelemetry = {
    event(name, attributes) {
      telemetryEvents.push({
        kind: "runtime.telemetry-event",
        name,
        attributes: redactRuntimeRecordAttributes(attributes),
      });
    },
  };

  for (const resource of resources) {
    if (byId.has(resource.id)) {
      throw new Error(`duplicate runtime resource: ${resource.id}`);
    }
    byId.set(resource.id, resource);
  }

  const access = {
    kind: "runtime.resource-access" as const,
    requireResource<TValue = unknown>(resourceId: string): TValue {
      const resource = byId.get(resourceId);
      if (!resource) {
        throw new Error(`missing runtime resource: ${resourceId}`);
      }
      return resource.value as TValue;
    },
    optionalResource<TValue = unknown>(resourceId: string): TValue | undefined {
      return byId.get(resourceId)?.value as TValue | undefined;
    },
    resourceMetadata(resourceId: string): RuntimeRecordAttributes | undefined {
      const resource = byId.get(resourceId);
      if (!resource) return undefined;
      return redactRuntimeRecordAttributes(resource.metadata);
    },
    telemetry(): RuntimeTelemetry {
      return telemetry;
    },
    emitTopology(record: RuntimeTopologyRecord): void {
      topologyRecords.push({
        kind: "runtime.topology-record",
        record: redactRuntimeRecordAttributes(record),
      });
    },
    emitDiagnostic(diagnostic: RuntimeDiagnostic & {
      readonly attributes?: Record<string, unknown>;
    }): void {
      diagnosticRecords.push({
        kind: "runtime.diagnostic-record",
        code: diagnostic.code,
        message: diagnostic.message,
        attributes: diagnostic.attributes
          ? redactRuntimeRecordAttributes(diagnostic.attributes)
          : undefined,
      });
    },
    records(): readonly MiniRuntimeResourceRecord[] {
      return [...byId.values()].map((resource) => ({
        kind: "runtime.resource-record" as const,
        resourceId: resource.id,
        metadata: redactRuntimeRecordAttributes(resource.metadata),
      }));
    },
    topologyRecords(): readonly MiniRuntimeTopologyRecord[] {
      return topologyRecords.map((record) => ({
        kind: record.kind,
        record: { ...record.record },
      }));
    },
    diagnosticRecords(): readonly MiniRuntimeDiagnosticRecord[] {
      return diagnosticRecords.map((record) => ({
        kind: record.kind,
        code: record.code,
        message: record.message,
        attributes: record.attributes ? { ...record.attributes } : undefined,
      }));
    },
    telemetryEvents(): readonly MiniRuntimeTelemetryEvent[] {
      return telemetryEvents.map((event) => ({
        kind: event.kind,
        name: event.name,
        attributes: event.attributes ? { ...event.attributes } : undefined,
      }));
    },
  };

  return Object.freeze(access) as MiniRuntimeResourceAccessProbe;
}

import {
  redactRuntimeRecordAttributes,
  redactRuntimeRecordValue,
  type InMemoryRuntimeCatalog,
  type RuntimeRecordAttributes,
  type RuntimeRecordValue,
} from "./catalog";

export interface RuntimeTelemetryEventLike {
  readonly name: string;
  readonly attributes?: Record<string, unknown>;
}

/**
 * Normalized lab telemetry record after the mini-runtime redaction boundary.
 *
 * Sequence/source/run identity make exported traces reproducible for review,
 * but this record is not catalog storage or production observability policy.
 */
export interface RuntimeTelemetryRecord {
  readonly kind: "runtime.telemetry-record";
  readonly sequence: number;
  readonly source: string;
  readonly name: string;
  readonly attributes: RuntimeRecordAttributes;
}

export interface RuntimeTelemetryProjectionInput {
  readonly source: string;
  readonly runId: string;
  readonly events: readonly RuntimeTelemetryEventLike[];
  readonly startingSequence?: number;
}

export interface RuntimeCatalogTelemetryProjectionInput {
  readonly source: string;
  readonly runId: string;
  readonly catalog: InMemoryRuntimeCatalog;
  readonly startingSequence?: number;
}

/**
 * Minimal OTLP JSON value subset needed by the local HyperDX lab export path.
 *
 * Keeping the type narrow avoids presenting this helper as a general OTLP
 * model, native host telemetry bridge, or production bootstrap surface.
 */
export type RuntimeTelemetryOtlpAnyValue =
  | { readonly stringValue: string }
  | { readonly boolValue: boolean }
  | { readonly intValue: string }
  | { readonly doubleValue: number }
  | {
      readonly arrayValue: {
        readonly values: readonly RuntimeTelemetryOtlpAnyValue[];
      };
    }
  | {
      readonly kvlistValue: {
        readonly values: readonly RuntimeTelemetryOtlpKeyValue[];
      };
    };

export interface RuntimeTelemetryOtlpKeyValue {
  readonly key: string;
  readonly value: RuntimeTelemetryOtlpAnyValue;
}

export interface RuntimeTelemetryOtlpSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: 1;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano: string;
  readonly attributes: readonly RuntimeTelemetryOtlpKeyValue[];
}

export interface RuntimeTelemetryOtlpTracePayload {
  readonly resourceSpans: readonly [
    {
      readonly resource: {
        readonly attributes: readonly RuntimeTelemetryOtlpKeyValue[];
      };
      readonly scopeSpans: readonly [
        {
          readonly scope: {
            readonly name: string;
            readonly version: string;
          };
          readonly spans: readonly RuntimeTelemetryOtlpSpan[];
        },
      ];
    },
  ];
}

/**
 * Inputs for building deterministic trace payloads from already-redacted
 * runtime records. Optional identifiers are fixtures/review aids, not durable
 * async history or trace authority.
 */
export interface RuntimeTelemetryOtlpTraceInput {
  readonly records: readonly RuntimeTelemetryRecord[];
  readonly serviceName: string;
  readonly runId: string;
  readonly traceId?: string;
  readonly scopeName?: string;
  readonly scopeVersion?: string;
  readonly startTimeUnixNano?: string;
  readonly resourceAttributes?: Record<string, unknown>;
}

export interface RuntimeTelemetryFetchResponse {
  readonly status: number;
  readonly statusText?: string;
  text(): Promise<string>;
}

export type RuntimeTelemetryFetch = (
  url: string,
  init: {
    readonly method: "POST";
    readonly headers: Record<string, string>;
    readonly body: string;
  },
) => Promise<RuntimeTelemetryFetchResponse>;

export type RuntimeTelemetryOtlpExportResult =
  | {
      readonly kind: "runtime.telemetry-otlp-export-result";
      readonly status: "accepted";
      readonly endpoint: string;
      readonly httpStatus: number;
      readonly responseBody?: RuntimeRecordValue;
    }
  | {
      readonly kind: "runtime.telemetry-otlp-export-result";
      readonly status: "failed";
      readonly endpoint: string;
      readonly httpStatus?: number;
      readonly error: RuntimeRecordValue;
      readonly responseBody?: RuntimeRecordValue;
    };

/**
 * Explicit export envelope for a prepared lab payload.
 *
 * Header/fetch injection supports local harnesses without making network
 * telemetry part of mini-runtime execution.
 */
export interface RuntimeTelemetryOtlpExportInput {
  readonly endpoint: string;
  readonly payload: RuntimeTelemetryOtlpTracePayload;
  readonly fetch?: RuntimeTelemetryFetch;
  readonly headers?: Record<string, string>;
}

/**
 * Projects already-redacted mini-runtime events into a lab telemetry stream.
 *
 * This is the copy/paste seam for future runtime telemetry: it preserves useful
 * lifecycle identity while keeping export separate from the execution path. It
 * is not a product telemetry schema, dashboard policy, or catalog persistence
 * contract.
 */
export function projectRuntimeEventsToTelemetryRecords(
  input: RuntimeTelemetryProjectionInput,
): readonly RuntimeTelemetryRecord[] {
  return input.events.map((event, index) => {
    const sequence = (input.startingSequence ?? 0) + index + 1;
    return {
      kind: "runtime.telemetry-record" as const,
      sequence,
      source: input.source,
      name: event.name,
      attributes: redactRuntimeRecordAttributes({
        ...(event.attributes ?? {}),
        telemetryRunId: input.runId,
        telemetrySource: input.source,
        telemetrySequence: sequence,
      }),
    };
  });
}

/**
 * Projects in-memory bootgraph/catalog observations without copying live values.
 *
 * Catalog modules and lifecycle records are exported as observation facts only;
 * started provider values, release callbacks, runtime access objects, and
 * persistence handles remain outside the payload.
 */
export function projectRuntimeCatalogToTelemetryRecords(
  input: RuntimeCatalogTelemetryProjectionInput,
): readonly RuntimeTelemetryRecord[] {
  const records: RuntimeTelemetryRecord[] = [];
  let sequence = input.startingSequence ?? 0;

  for (const moduleRecord of input.catalog.modules) {
    sequence += 1;
    records.push({
      kind: "runtime.telemetry-record",
      sequence,
      source: input.source,
      name: "runtime.catalog.module",
      attributes: redactRuntimeRecordAttributes({
        telemetryRunId: input.runId,
        telemetrySource: input.source,
        telemetrySequence: sequence,
        moduleId: moduleRecord.moduleId,
        dependencies: moduleRecord.dependencies,
        metadata: moduleRecord.metadata,
      }),
    });
  }

  for (const observation of input.catalog.records) {
    sequence += 1;
    records.push({
      kind: "runtime.telemetry-record",
      sequence,
      source: input.source,
      name: observation.phase,
      attributes: redactRuntimeRecordAttributes({
        ...observation.attributes,
        telemetryRunId: input.runId,
        telemetrySource: input.source,
        telemetrySequence: sequence,
        catalogSequence: observation.sequence,
        subjectId: observation.subjectId,
      }),
    });
  }

  return records;
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

function baseTime(input: string): bigint {
  return BigInt(Number.parseInt(stableHex(input, 8), 16)) * 1_000_000n;
}

function otlpAnyValue(value: RuntimeRecordValue): RuntimeTelemetryOtlpAnyValue {
  if (value === null) return { stringValue: "null" };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { intValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => otlpAnyValue(entry)),
      },
    };
  }

  return {
    kvlistValue: {
      values: runtimeAttributesToOtlp(value as RuntimeRecordAttributes),
    },
  };
}

function runtimeAttributesToOtlp(
  attributes: RuntimeRecordAttributes,
): readonly RuntimeTelemetryOtlpKeyValue[] {
  return Object.entries(attributes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      key,
      value: otlpAnyValue(value),
    }));
}

/**
 * Builds a deterministic OTLP HTTP trace JSON payload for the local lab.
 *
 * The payload is shaped for HyperDX's local OTLP ingest path, but it remains a
 * contained projection of already-redacted runtime records. Query naming,
 * retention, dashboards, production OpenTelemetry bootstrap, and durable async
 * history stay outside this helper.
 */
export function buildRuntimeTelemetryOtlpTracePayload(
  input: RuntimeTelemetryOtlpTraceInput,
): RuntimeTelemetryOtlpTracePayload {
  const traceId = input.traceId ?? stableHex(input.runId, 32);
  const start = input.startTimeUnixNano
    ? BigInt(input.startTimeUnixNano)
    : baseTime(input.runId);

  return {
    resourceSpans: [
      {
        resource: {
          attributes: runtimeAttributesToOtlp(
            redactRuntimeRecordAttributes({
              serviceName: input.serviceName,
              "service.name": input.serviceName,
              telemetryRunId: input.runId,
              ...(input.resourceAttributes ?? {}),
            }),
          ),
        },
        scopeSpans: [
          {
            scope: {
              name:
                input.scopeName ??
                "rawr.runtime-realization-type-env.telemetry-export",
              version: input.scopeVersion ?? "lab-v2",
            },
            spans: input.records.map((record, index) => {
              const startTime = start + BigInt(index) * 1_000_000n;
              const endTime = startTime + 1_000_000n;
              return {
                traceId,
                spanId: stableHex(
                  `${input.runId}:${record.source}:${record.sequence}:${record.name}`,
                  16,
                ),
                name: record.name,
                kind: 1 as const,
                startTimeUnixNano: startTime.toString(),
                endTimeUnixNano: endTime.toString(),
                attributes: runtimeAttributesToOtlp(
                  redactRuntimeRecordAttributes({
                    ...record.attributes,
                    telemetryRecordKind: record.kind,
                    telemetryRecordName: record.name,
                    telemetrySource: record.source,
                    telemetrySequence: record.sequence,
                  }),
                ),
              };
            }),
          },
        ],
      },
    ],
  };
}

function otlpTraceEndpoint(endpoint: string): string {
  return endpoint.endsWith("/v1/traces")
    ? endpoint
    : `${endpoint.replace(/\/+$/, "")}/v1/traces`;
}

function parseResponseBody(text: string): RuntimeRecordValue | undefined {
  if (!text) return undefined;
  try {
    return redactRuntimeRecordValue(JSON.parse(text));
  } catch {
    return redactRuntimeRecordValue(text);
  }
}

/**
 * Explicitly emits a prepared OTLP trace payload to a local ingest endpoint.
 *
 * Network export is opt-in so runtime execution tests cannot hide side effects.
 * The result records only endpoint/status/body metadata and never echoes the
 * submitted telemetry payload back on failure.
 */
export async function exportRuntimeTelemetryOtlpTraces(
  input: RuntimeTelemetryOtlpExportInput,
): Promise<RuntimeTelemetryOtlpExportResult> {
  const endpoint = otlpTraceEndpoint(input.endpoint);
  const fetcher = input.fetch ?? globalThis.fetch?.bind(globalThis);

  if (!fetcher) {
    return {
      kind: "runtime.telemetry-otlp-export-result",
      status: "failed",
      endpoint,
      error: "fetch unavailable",
    };
  }

  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.headers ?? {}),
      },
      body: JSON.stringify(input.payload),
    });
    const responseBody = parseResponseBody(await response.text());

    if (response.status >= 200 && response.status < 300) {
      return {
        kind: "runtime.telemetry-otlp-export-result",
        status: "accepted",
        endpoint,
        httpStatus: response.status,
        ...(responseBody !== undefined ? { responseBody } : {}),
      };
    }

    return {
      kind: "runtime.telemetry-otlp-export-result",
      status: "failed",
      endpoint,
      httpStatus: response.status,
      error: response.statusText ?? `HTTP ${response.status}`,
      ...(responseBody !== undefined ? { responseBody } : {}),
    };
  } catch (error) {
    return {
      kind: "runtime.telemetry-otlp-export-result",
      status: "failed",
      endpoint,
      error: redactRuntimeRecordValue(error),
    };
  }
}

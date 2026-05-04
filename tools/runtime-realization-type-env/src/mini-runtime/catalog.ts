export type RuntimeRecordScalar = string | number | boolean | null;

/**
 * Portable observation payload shape for the contained mini runtime.
 *
 * Runtime records are allowed to leave the lab only as JSON-like values after
 * redaction. This is not a product telemetry schema and not a guarantee that
 * arbitrary user metadata has passed a complete DLP policy.
 */
export type RuntimeRecordValue =
  | RuntimeRecordScalar
  | readonly RuntimeRecordValue[]
  | { readonly [key: string]: RuntimeRecordValue };

export type RuntimeRecordAttributes = {
  readonly [key: string]: RuntimeRecordValue;
};

export interface RuntimeObservationRecord {
  readonly kind: "runtime.observation-record";
  readonly sequence: number;
  readonly phase: string;
  readonly subjectId: string;
  readonly attributes: RuntimeRecordAttributes;
}

export interface RuntimeCatalogModuleRecord {
  readonly kind: "runtime.catalog.module";
  readonly moduleId: string;
  readonly dependencies: readonly string[];
  readonly metadata: RuntimeRecordAttributes;
}

export interface InMemoryRuntimeCatalog {
  readonly kind: "runtime.catalog.in-memory";
  readonly modules: readonly RuntimeCatalogModuleRecord[];
  readonly records: readonly RuntimeObservationRecord[];
}

export interface RuntimeCatalogModuleInput {
  readonly moduleId: string;
  readonly dependencies?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimeObservationRecorder {
  record(input: {
    readonly phase: string;
    readonly subjectId: string;
    readonly attributes?: Record<string, unknown>;
  }): RuntimeObservationRecord;
  catalog(): InMemoryRuntimeCatalog;
}

const SENSITIVE_RECORD_KEY =
  /secret|token|password|credential|api[-_]?key|private[-_]?key|handle/i;

/**
 * Redacts mini-runtime observation values before they enter lab records.
 *
 * The policy protects evidence snapshots from common secret keys, live handles,
 * and cycles. It is deliberately narrower than production observability
 * governance, HyperDX export policy, or persisted catalog semantics.
 */
export function redactRuntimeRecordValue(
  value: unknown,
  key?: string,
  seen: WeakSet<object> = new WeakSet(),
): RuntimeRecordValue {
  if (key && SENSITIVE_RECORD_KEY.test(key)) {
    return "[redacted]";
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

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
    return value.map((entry) => redactRuntimeRecordValue(entry, undefined, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[redacted:cycle]";
    }
    seen.add(value);

    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactRuntimeRecordValue(entryValue, entryKey, seen),
      ]),
    ) as RuntimeRecordAttributes;
  }

  return String(value);
}

export function redactRuntimeRecordAttributes(
  attributes: Record<string, unknown> = {},
): RuntimeRecordAttributes {
  return redactRuntimeRecordValue(attributes) as RuntimeRecordAttributes;
}

/**
 * In-memory recorder for lifecycle and catalog observations inside the lab.
 *
 * Sequence numbers preserve local ordering evidence only. The returned catalog
 * is a snapshot for mini-runtime tests, not runtime persistence, migration
 * control-plane storage, or a telemetry exporter.
 */
export function createRuntimeObservationRecorder(input: {
  readonly modules?: readonly RuntimeCatalogModuleInput[];
}): RuntimeObservationRecorder {
  const records: RuntimeObservationRecord[] = [];
  const modules = (input.modules ?? []).map((module) => ({
    kind: "runtime.catalog.module" as const,
    moduleId: module.moduleId,
    dependencies: [...(module.dependencies ?? [])],
    metadata: redactRuntimeRecordAttributes(module.metadata),
  }));

  return {
    record(recordInput) {
      const record = {
        kind: "runtime.observation-record" as const,
        sequence: records.length + 1,
        phase: recordInput.phase,
        subjectId: recordInput.subjectId,
        attributes: redactRuntimeRecordAttributes(recordInput.attributes),
      };

      records.push(record);
      return record;
    },
    catalog() {
      return {
        kind: "runtime.catalog.in-memory",
        modules: modules.map((module) => ({
          ...module,
          dependencies: [...module.dependencies],
          metadata: { ...module.metadata },
        })),
        records: records.map((record) => ({
          ...record,
          attributes: { ...record.attributes },
        })),
      };
    },
  };
}

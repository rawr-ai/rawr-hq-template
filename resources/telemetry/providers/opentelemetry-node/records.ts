import type {
  BeginNativeOperationInput,
  EmitTechnicalLogInput,
  NativeOperationTelemetryScope,
  TelemetryCorrelationAttributes,
  TelemetryDiagnostic,
} from "@habitat-ai/resource-telemetry";
import {
  MAX_TELEMETRY_ATTRIBUTE_STRING_LENGTH,
  MAX_TELEMETRY_ATTRIBUTES,
  TelemetryIdentityTextSchema,
  TelemetryOperationNameSchema,
  TelemetryOperationOutcomeSchema,
} from "@habitat-ai/resource-telemetry";
import { context } from "@opentelemetry/api";
import { type Logger, SeverityNumber } from "@opentelemetry/api-logs";
import { Effect } from "effect";
import type { DrainContext } from "evlog";
import Schema from "typebox/schema";

const MAX_CANONICAL_RECORD_ATTRIBUTES = 6;
const MAX_EXPORTED_RECORD_ATTRIBUTES = MAX_TELEMETRY_ATTRIBUTES - MAX_CANONICAL_RECORD_ATTRIBUTES;
const operationIdValidator = Schema.Compile(TelemetryIdentityTextSchema);
const operationNameValidator = Schema.Compile(TelemetryOperationNameSchema);
const operationOutcomeValidator = Schema.Compile(TelemetryOperationOutcomeSchema);

const severityNumbers: Readonly<Record<EmitTechnicalLogInput["severity"], SeverityNumber>> =
  Object.freeze({
    trace: SeverityNumber.TRACE,
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
    fatal: SeverityNumber.FATAL,
  });

const evlogSeverityNumbers: Readonly<Record<DrainContext["event"]["level"], SeverityNumber>> =
  Object.freeze({
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
  });

const sensitivePathSegments = new Set([
  "apikey",
  "authorization",
  "cookie",
  "credential",
  "password",
  "secret",
  "token",
]);

const reservedAttributePaths = new Set([
  "deployment.environment.name",
  "habitat.process.role",
  "operation.id",
  "operation.kind",
  "operation.name",
  "operation.outcome",
  "operation.surface",
  "record.kind",
  "service.instance.id",
  "service.name",
  "service.version",
]);

/** Provider-private callback for retaining a contained record diagnostic. */
export type RetainRecordDiagnostic = (diagnostic: TelemetryDiagnostic) => void;

/** Constructs the provider-owned EVLog drain into the active logger provider. */
export function makeEvlogDrain(
  logger: Logger,
  defaults: TelemetryCorrelationAttributes,
  exportedPaths: readonly string[],
  intakeIsOpen: () => boolean,
  retain: RetainRecordDiagnostic
): (drainContext: DrainContext) => Promise<void> {
  return async (drainContext) => {
    if (!intakeIsOpen()) return;
    try {
      logger.emit({
        eventName: "orpc.operation",
        severityNumber: evlogSeverityNumbers[drainContext.event.level],
        severityText: drainContext.event.level.toUpperCase(),
        body: "oRPC operation completed",
        attributes: {
          ...selectProductAttributes(drainContext, exportedPaths, defaults),
          ...selectCanonicalProductOperation(drainContext.event),
          "record.kind": "product-event",
          "operation.surface": "orpc",
          "operation.kind": "procedure",
        },
        context: context.active(),
      });
    } catch {
      retain(recordDiagnostic("native-operation", "EVLOG_DRAIN_FAILED"));
    }
  };
}

/** Constructs one bounded fallback event scope for Oclif or Inngest. */
export function makeNativeOperationScope(
  input: BeginNativeOperationInput,
  defaults: TelemetryCorrelationAttributes,
  exportedPaths: readonly string[],
  logger: Logger,
  retain: RetainRecordDiagnostic
): NativeOperationTelemetryScope {
  let open = true;
  let attributes = selectFlatAttributes(exportedPaths, defaults, input.attributes);
  const operationContext = context.active();

  return Object.freeze({
    enrich: (input: Parameters<NativeOperationTelemetryScope["enrich"]>[0]) =>
      Effect.sync(() => {
        if (open) attributes = selectFlatAttributes(exportedPaths, attributes, input.attributes);
      }),
    finish: (finish: Parameters<NativeOperationTelemetryScope["finish"]>[0]) =>
      Effect.sync(() => {
        if (!open) return;
        open = false;
        const sealedAttributes = selectFlatAttributes(exportedPaths, attributes, finish.attributes);
        try {
          logger.emit({
            eventName: input.operation,
            severityNumber:
              finish.outcome === "failed" ? SeverityNumber.ERROR : SeverityNumber.INFO,
            severityText: finish.outcome === "failed" ? "ERROR" : "INFO",
            body: input.operation,
            attributes: {
              ...sealedAttributes,
              "record.kind": "product-event",
              "operation.surface": input.surface,
              "operation.kind": input.kind,
              "operation.name": input.operation,
              "operation.id": input.operationId,
              "operation.outcome": finish.outcome,
            },
            context: operationContext,
          });
        } catch {
          retain(recordDiagnostic("native-operation", "NATIVE_OPERATION_EMIT_FAILED"));
        }
      }),
  });
}

/** Emits one bounded technical record through the active logger provider. */
export function emitTechnicalLog(
  logger: Logger,
  defaults: TelemetryCorrelationAttributes,
  exportedPaths: readonly string[],
  input: EmitTechnicalLogInput
): void {
  logger.emit({
    eventName: input.eventName,
    severityNumber: severityNumbers[input.severity],
    severityText: input.severity.toUpperCase(),
    body: input.message,
    attributes: {
      ...selectFlatAttributes(exportedPaths, defaults, input.attributes),
      "record.kind": "technical-log",
    },
  });
}

/** Constructs a provider-private diagnostic without retaining raw record data. */
export function recordDiagnostic(
  stage: TelemetryDiagnostic["stage"],
  code: string
): TelemetryDiagnostic {
  return Object.freeze({
    stage,
    code,
    detail: "OpenTelemetry Node provider operation failed and was contained",
  });
}

/** Returns the inert scope used after intake closes. */
export function inertNativeOperationScope(): NativeOperationTelemetryScope {
  return Object.freeze({
    enrich: () => Effect.void,
    finish: () => Effect.void,
  });
}

/** Selects the configured bounded scalar paths and omits sensitive path names. */
export function selectFlatAttributes(
  exportedPaths: readonly string[],
  ...sources: readonly TelemetryCorrelationAttributes[]
): TelemetryCorrelationAttributes {
  const selected: Record<string, string | number | boolean> = {};
  for (const source of sources) {
    for (const path of exportedPaths) {
      if (isProtectedPath(path) || !Object.hasOwn(source, path)) continue;
      setSelectedAttribute(selected, path, source[path]);
    }
  }
  return Object.freeze(selected);
}

function selectProductAttributes(
  drainContext: DrainContext,
  exportedPaths: readonly string[],
  defaults: TelemetryCorrelationAttributes
): TelemetryCorrelationAttributes {
  const selected: Record<string, string | number | boolean> = {
    ...selectFlatAttributes(exportedPaths, defaults),
  };
  for (const path of exportedPaths) {
    if (isProtectedPath(path)) continue;
    setSelectedAttribute(selected, path, readProductPath(drainContext, path));
  }
  return Object.freeze(selected);
}

function setSelectedAttribute(
  selected: Record<string, string | number | boolean>,
  path: string,
  value: unknown
): void {
  if (!isScalar(value)) return;
  if (
    !Object.hasOwn(selected, path) &&
    Object.keys(selected).length >= MAX_EXPORTED_RECORD_ATTRIBUTES
  ) {
    return;
  }
  selected[path] = value;
}

function selectCanonicalProductOperation(
  event: DrainContext["event"]
): TelemetryCorrelationAttributes {
  const operation = Reflect.get(event, "operation");
  if (typeof operation !== "object" || operation === null) return Object.freeze({});

  const selected: Record<string, string> = {};
  const id = Reflect.get(operation, "id");
  const name = Reflect.get(operation, "name");
  const outcome = Reflect.get(operation, "outcome");
  if (operationIdValidator.Check(id)) selected["operation.id"] = id;
  if (operationNameValidator.Check(name)) selected["operation.name"] = name;
  if (operationOutcomeValidator.Check(outcome)) selected["operation.outcome"] = outcome;
  return Object.freeze(selected);
}

function readProductPath(drainContext: DrainContext, path: string): unknown {
  if (Object.hasOwn(drainContext.event, path)) return drainContext.event[path];
  if (path === "request.id") return drainContext.request?.requestId;
  if (path === "request.method") return drainContext.request?.method;
  if (path === "request.path") return drainContext.request?.path;
  const root: unknown = path.startsWith("request.") ? drainContext.request : drainContext.event;
  const segments = path.startsWith("request.")
    ? path.slice("request.".length).split(".")
    : path.split(".");
  let value = root;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null || !Object.hasOwn(value, segment)) {
      return undefined;
    }
    value = Reflect.get(value, segment);
  }
  return value;
}

function isScalar(value: unknown): value is string | number | boolean {
  return (
    (typeof value === "string" && value.length <= MAX_TELEMETRY_ATTRIBUTE_STRING_LENGTH) ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isSensitivePath(path: string): boolean {
  const segments = path
    .toLowerCase()
    .split(/[._-]/u)
    .filter((segment) => segment.length > 0);
  return segments.some((segment) => sensitivePathSegments.has(segment)) || hasApiKeyPair(segments);
}

function hasApiKeyPair(segments: readonly string[]): boolean {
  return segments.some((segment, index) => segment === "api" && segments[index + 1] === "key");
}

function isProtectedPath(path: string): boolean {
  return reservedAttributePaths.has(path) || isSensitivePath(path);
}

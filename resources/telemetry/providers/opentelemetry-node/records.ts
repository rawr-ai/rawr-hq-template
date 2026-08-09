import type { EmitTechnicalLogInput, TelemetryAttributes } from "@habitat-ai/resource-telemetry";
import {
  MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH,
  MAX_TELEMETRY_ATTRIBUTE_STRING_LENGTH,
  MAX_TELEMETRY_ATTRIBUTES,
} from "@habitat-ai/resource-telemetry";
import { context } from "@opentelemetry/api";
import { type Logger, SeverityNumber } from "@opentelemetry/api-logs";

const severityNumbers: Readonly<Record<EmitTechnicalLogInput["severity"], SeverityNumber>> =
  Object.freeze({
    trace: SeverityNumber.TRACE,
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
    fatal: SeverityNumber.FATAL,
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
  "record.kind",
  "service.instance.id",
  "service.name",
  "service.version",
]);

/** Emits one bounded technical record through the active logger provider. */
export function emitTechnicalLog(
  logger: Logger,
  defaults: TelemetryAttributes,
  exportedPaths: readonly string[],
  input: EmitTechnicalLogInput
): void {
  logger.emit({
    eventName: input.eventName.slice(0, 256),
    severityNumber: severityNumbers[input.severity],
    severityText: input.severity.toUpperCase(),
    body: input.message.slice(0, 4_096),
    attributes: {
      ...selectFlatAttributes(exportedPaths, defaults, input.attributes),
      "record.kind": "technical-log",
    },
    context: context.active(),
  });
}

/** Selects configured bounded scalar paths and omits protected or sensitive names. */
export function selectFlatAttributes(
  exportedPaths: readonly string[],
  ...sources: readonly TelemetryAttributes[]
): TelemetryAttributes {
  const selected: Record<string, string | number | boolean> = {};
  for (const source of sources) {
    for (const path of exportedPaths) {
      if (!isAdmittedPath(path) || !Object.hasOwn(source, path)) continue;
      const value = source[path];
      if (!isScalar(value)) continue;
      if (
        !Object.hasOwn(selected, path) &&
        Object.keys(selected).length >= MAX_TELEMETRY_ATTRIBUTES
      ) {
        continue;
      }
      selected[path] = value;
    }
  }
  return Object.freeze(selected);
}

function isScalar(value: unknown): value is string | number | boolean {
  return (
    (typeof value === "string" && value.length <= MAX_TELEMETRY_ATTRIBUTE_STRING_LENGTH) ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isAdmittedPath(path: string): boolean {
  if (
    path.length === 0 ||
    path.length > MAX_TELEMETRY_ATTRIBUTE_KEY_LENGTH ||
    !/^[a-z][a-z0-9_.-]*$/u.test(path) ||
    reservedAttributePaths.has(path)
  ) {
    return false;
  }
  const segments = path
    .toLowerCase()
    .split(/[._-]/u)
    .filter((segment) => segment.length > 0);
  return (
    !segments.some((segment) => sensitivePathSegments.has(segment)) &&
    !segments.some((segment, index) => segment === "api" && segments[index + 1] === "key")
  );
}

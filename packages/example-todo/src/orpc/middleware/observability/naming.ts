import type { Attributes } from "../../host-adapters/telemetry/opentelemetry";
import type { BaseMetadata } from "../../baseline/types";
import type { ObservabilityFields } from "./types";

export function prefixAttributes(
  prefix: string,
  fields: ObservabilityFields | undefined,
): Attributes {
  const attributes: Attributes = {};

  if (!fields) {
    return attributes;
  }

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      attributes[`${prefix}.${key}`] = value;
    }
  }

  return attributes;
}

export function deriveServiceNames(baseMetadata: BaseMetadata) {
  const domain = baseMetadata.domain ?? "service";

  return {
    domain,
    loggerEvent: `${domain}.procedure`,
    startedEvent: `${domain}.procedure.started`,
    succeededEvent: `${domain}.procedure.succeeded`,
    failedEvent: `${domain}.procedure.failed`,
    attributePrefix: `rawr.${domain}`,
  };
}

function inferEntity(segment?: string) {
  if (!segment) {
    return undefined;
  }

  return segment.endsWith("s") ? segment.slice(0, -1) : segment;
}

export function getMetadataAudit(meta: BaseMetadata) {
  const candidate = (meta as BaseMetadata & { audit?: unknown }).audit;
  return typeof candidate === "string" ? candidate : undefined;
}

export function getMetadataEntity(meta: BaseMetadata, path: readonly string[]) {
  const candidate = (meta as BaseMetadata & { entity?: unknown }).entity;
  return typeof candidate === "string" ? candidate : inferEntity(path[0]);
}

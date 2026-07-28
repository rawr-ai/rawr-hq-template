import type { Attributes } from "@opentelemetry/api";
import type { BaseMetadata } from "../../metadata";
import type { ObservabilityFields } from "./types";

/** Qualifies service-owned observability fields beneath their stable namespace. */
export function prefixAttributes(
  prefix: string,
  fields: ObservabilityFields | undefined
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

/** Derives stable signal names from the service metadata domain. */
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

/** Returns the service's explicit audit classification when one is declared. */
export function getMetadataAudit(meta: BaseMetadata) {
  const candidate = meta.audit;
  return typeof candidate === "string" ? candidate : undefined;
}

/** Resolves the operation entity from metadata, falling back to its router path. */
export function getMetadataEntity(meta: BaseMetadata, path: readonly string[]) {
  const candidate = meta.entity;
  return typeof candidate === "string" ? candidate : inferEntity(path[0]);
}

/**
 * Stable JSON helpers.
 *
 * Purpose: allow deterministic equality checks for JSON-shaped data without
 * importing host-specific helpers like `node:util` into service code.
 *
 * This is intentionally narrow and only supports values that are JSON-ish
 * (plain objects, arrays, primitives). It is not a general deep-equality
 * library.
 */

function normalizeForStableJson(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return null;

  if (Array.isArray(value)) {
    return value.map(normalizeForStableJson);
  }

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Set) return [...value].map(normalizeForStableJson);
  if (value instanceof Map) {
    return [...value.entries()]
      .map(([k, v]) => [String(k), normalizeForStableJson(v)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
      const v = record[key];
      if (v === undefined) continue;
      out[key] = normalizeForStableJson(v);
    }
    return out;
  }

  return String(value);
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(normalizeForStableJson(value));
}

export function stableJsonEqual(a: unknown, b: unknown): boolean {
  return stableJsonStringify(a) === stableJsonStringify(b);
}

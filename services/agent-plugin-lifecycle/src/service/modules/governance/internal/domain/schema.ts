import { isExactRecord } from "./canonical";
import { issue, type PromotionIssue, type PromotionResult } from "./result";

export function exactRecord(
  value: unknown,
  keys: readonly string[],
  path: string,
  issues: PromotionIssue[],
): Record<string, unknown> | undefined {
  if (!isExactRecord(value, keys)) {
    issues.push(issue("INVALID_SCHEMA", path, `Expected exactly: ${keys.join(", ")}`));
    return undefined;
  }
  return value;
}

export function collect<T>(
  result: PromotionResult<T>,
  issues: PromotionIssue[],
): T | undefined {
  if (result.ok) return result.value;
  issues.push(...result.issues);
  return undefined;
}

export function boundedArray(
  value: unknown,
  path: string,
  max: number,
  issues: PromotionIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    issues.push(issue("INVALID_SCHEMA", path, "Expected an array"));
    return undefined;
  }
  if (value.length === 0) {
    issues.push(issue("MISSING_BINDING", path, "Expected at least one binding"));
    return undefined;
  }
  if (value.length > max) {
    issues.push(issue("COUNT_LIMIT_EXCEEDED", path, `Binding count exceeds ${max}`));
    return undefined;
  }
  return value;
}

export function parseBoundedInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  issues: PromotionIssue[],
): number | undefined {
  if (!Number.isSafeInteger(value) || typeof value !== "number" || value < minimum || value > maximum) {
    issues.push(issue("INVALID_CANONICAL_VALUE", path, `Expected an integer from ${minimum} through ${maximum}`));
    return undefined;
  }
  return value;
}

export function reportDuplicateOrOrder<T>(
  values: readonly T[],
  key: (value: T) => string,
  path: string,
  issues: PromotionIssue[],
): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = key(values[index - 1]!);
    const current = key(values[index]!);
    if (previous === current) {
      issues.push(issue("DUPLICATE_BINDING", `${path}[${index}]`, "Duplicate canonical binding"));
      return;
    }
    if (previous > current) {
      issues.push(issue("NON_CANONICAL_ENVELOPE", path, "Bindings are not in canonical order"));
      return;
    }
  }
}

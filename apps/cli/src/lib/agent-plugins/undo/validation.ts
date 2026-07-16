import path from "node:path";
import { posix } from "node:path";

import { compareCanonicalText } from "./canonical";
import type { CapsuleFailureCode, TargetStateBindingV1 } from "./contract";

const CAPSULE_INPUT_FAILURE_CODES = [
  "InvalidInput",
  "UnknownOwnerProtocol",
  "InvalidOwnerAction",
  "InvalidObservedPost",
  "ActionDigestMismatch",
  "CapsuleBoundExceeded",
] as const satisfies readonly CapsuleFailureCode[];

export type CapsuleInputFailureCode = (typeof CAPSULE_INPUT_FAILURE_CODES)[number];

export class CapsuleInputValidationError extends Error {
  readonly failureCode: CapsuleInputFailureCode;

  constructor(failureCode: CapsuleInputFailureCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "CapsuleInputValidationError";
    this.failureCode = failureCode;
  }
}

export function capsuleInputValidationError(
  failureCode: CapsuleInputFailureCode,
  message: string,
  cause?: unknown,
): CapsuleInputValidationError {
  return new CapsuleInputValidationError(failureCode, message, cause);
}

export function withCapsuleInputFailure<T>(
  failureCode: CapsuleInputFailureCode,
  operation: () => T,
): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof CapsuleInputValidationError) throw error;
    throw capsuleInputValidationError(failureCode, errorMessage(error), error);
  }
}

export function capsuleInputFailureCode(error: unknown): CapsuleInputFailureCode {
  return error instanceof CapsuleInputValidationError ? error.failureCode : "InvalidInput";
}

export function requireExactRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} must be a plain object`);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort(compareCanonicalText);
  const expected = [...keys].sort(compareCanonicalText);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has missing or extra fields`);
  }
  return record;
}

export function requireString(
  value: unknown,
  label: string,
  options: Readonly<{ min?: number; max?: number; pattern?: RegExp }> = {},
): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  const min = options.min ?? 1;
  const max = options.max ?? 4_096;
  if (value.length < min || value.length > max || value.includes("\0")) {
    throw new Error(`${label} has invalid length or NUL`);
  }
  if (options.pattern !== undefined && !options.pattern.test(value)) {
    throw new Error(`${label} has invalid syntax`);
  }
  return value;
}

export function requireSafeInteger(
  value: unknown,
  label: string,
  minimum = 0,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${label} must be a safe integer >= ${minimum}`);
  }
  return value as number;
}

export function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

export function requireOwner(value: unknown, label = "owner"): string {
  return requireString(value, label, {
    max: 64,
    pattern: /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
  });
}

export function requireGeneration(value: unknown, label = "generation"): `cg1_${string}` {
  return requireString(value, label, {
    pattern: /^cg1_[a-f0-9]{64}$/,
    max: 68,
  }) as `cg1_${string}`;
}

export function requireToken(value: unknown, label = "token"): string & { readonly __capsuleToken: "CapsuleTokenV1" } {
  return requireString(value, label, {
    pattern: /^ct1_[a-f0-9]{64}$/,
    max: 68,
  }) as string & { readonly __capsuleToken: "CapsuleTokenV1" };
}

export function requireCanonicalTarget(value: unknown, label: string): string {
  const target = requireString(value, label, { max: 16_384 });
  if (!path.isAbsolute(target) || path.normalize(target) !== target || path.resolve(target) !== target) {
    throw new Error(`${label} must be an absolute normalized path`);
  }
  return target;
}

export function requireRelativePath(value: unknown, label: string): string {
  const relative = requireString(value, label, { max: 4_096 });
  if (
    relative.includes("\\")
    || relative.startsWith("/")
    || posix.normalize(relative) !== relative
    || relative === "."
    || relative.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`${label} must be a safe normalized relative path`);
  }
  return relative;
}

export function parseTargetBindings(value: unknown, label: string): readonly TargetStateBindingV1[] {
  const result = requireArray(value, label).map((entry, index) => {
    const record = requireExactRecord(
      entry,
      ["authorityDigest", "authorityGeneration", "canonicalTarget"],
      `${label}[${index}]`,
    );
    return Object.freeze({
      canonicalTarget: requireCanonicalTarget(record.canonicalTarget, `${label}[${index}].canonicalTarget`),
      authorityGeneration: requireString(record.authorityGeneration, `${label}[${index}].authorityGeneration`, {
        max: 512,
        pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
      }),
      authorityDigest: requireString(record.authorityDigest, `${label}[${index}].authorityDigest`, {
        max: 512,
        pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
      }),
    });
  });
  if (result.length === 0) throw new Error(`${label} must not be empty`);
  const sorted = [...result].sort((left, right) => compareCanonicalText(left.canonicalTarget, right.canonicalTarget));
  for (let index = 0; index < result.length; index += 1) {
    if (result[index]!.canonicalTarget !== sorted[index]!.canonicalTarget) {
      throw new Error(`${label} must be in canonical target order`);
    }
    if (index > 0 && result[index - 1]!.canonicalTarget === result[index]!.canonicalTarget) {
      throw new Error(`${label} contains a duplicate canonical target`);
    }
  }
  return Object.freeze(result);
}

export function addBounded(left: number, right: number, maximum: number, label: string): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left < 0 || right < 0) {
    throw capsuleInputValidationError("CapsuleBoundExceeded", `${label} contains an unsafe count`);
  }
  if (right > maximum - left) {
    throw capsuleInputValidationError("CapsuleBoundExceeded", `${label} exceeds ${maximum}`);
  }
  return left + right;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

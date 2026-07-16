import { createHash } from "node:crypto";

import { failure, success, type ControllerResult } from "./result";
import { issue, type ControllerIssue } from "./issues";

declare const sha256DigestBrand: unique symbol;
declare const controllerDigestBrand: unique symbol;
declare const releaseRelativePathBrand: unique symbol;

export type Sha256Digest = string & { readonly [sha256DigestBrand]: "Sha256Digest" };
export type ControllerDigest = string & { readonly [controllerDigestBrand]: "ControllerDigest" };
export type ReleaseRelativePath = string & { readonly [releaseRelativePathBrand]: "ReleaseRelativePath" };

export const CONTROLLER_PAYLOAD_SCHEMA_VERSION = 1 as const;
export const CONTROLLER_RELEASE_ENVELOPE_SCHEMA_VERSION = 1 as const;
export const SHA256_HEX_LENGTH = 64;
export const MAX_RELEASE_RELATIVE_PATH_BYTES = 1_024;

export type ControllerPayloadSchemaVersion = typeof CONTROLLER_PAYLOAD_SCHEMA_VERSION;
export type ControllerReleaseEnvelopeSchemaVersion = typeof CONTROLLER_RELEASE_ENVELOPE_SCHEMA_VERSION;
export type ControllerPlatform = "darwin" | "linux" | "win32";
export type ControllerArchitecture = "arm64" | "x64";

const encoder = new TextEncoder();
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export function parseSha256Digest(value: unknown, path = "digest"): ControllerResult<Sha256Digest, ControllerIssue> {
  if (typeof value !== "string") {
    return failure([issue("EXPECTED_STRING", path, "SHA-256 digest must be a string")]);
  }
  if (!SHA256_PATTERN.test(value)) {
    return failure([
      issue("INVALID_SHA256_DIGEST", path, "SHA-256 digest must be exactly 64 lowercase hexadecimal characters"),
    ]);
  }
  return success(value as Sha256Digest);
}

export function parseControllerDigest(value: unknown, path = "controllerDigest"): ControllerResult<ControllerDigest, ControllerIssue> {
  const parsed = parseSha256Digest(value, path);
  if (!parsed.ok) {
    return failure(parsed.issues.map((entry) => ({ ...entry, code: "INVALID_CONTROLLER_DIGEST" })) as [ControllerIssue, ...ControllerIssue[]]);
  }
  return success(parsed.value as string as ControllerDigest);
}

export function sha256(value: Uint8Array | string): Sha256Digest {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return createHash("sha256").update(bytes).digest("hex") as Sha256Digest;
}

export function controllerDigestFromSha256(value: Sha256Digest): ControllerDigest {
  return value as string as ControllerDigest;
}

export function parseReleaseRelativePath(
  value: unknown,
  path = "path",
): ControllerResult<ReleaseRelativePath, ControllerIssue> {
  return parseRelativePath(value, path, "INVALID_RELEASE_RELATIVE_PATH", (parsed) => parsed as ReleaseRelativePath);
}

export function parseControllerPlatform(value: unknown, path = "platform"): ControllerResult<ControllerPlatform, ControllerIssue> {
  return value === "darwin" || value === "linux" || value === "win32"
    ? success(value)
    : failure([issue("INVALID_PLATFORM", path, "Controller platform must be darwin, linux, or win32")]);
}

export function parseControllerArchitecture(
  value: unknown,
  path = "architecture",
): ControllerResult<ControllerArchitecture, ControllerIssue> {
  return value === "arm64" || value === "x64"
    ? success(value)
    : failure([issue("INVALID_ARCHITECTURE", path, "Controller architecture must be arm64 or x64")]);
}

function parseRelativePath<T extends string>(
  value: unknown,
  path: string,
  code: "INVALID_RELEASE_RELATIVE_PATH",
  brand: (value: string) => T,
): ControllerResult<T, ControllerIssue> {
  if (typeof value !== "string") {
    return failure([issue("EXPECTED_STRING", path, "Relative path must be a string")]);
  }
  if (
    value.length === 0
    || value.startsWith("/")
    || value.endsWith("/")
    || value.includes("\\")
    || value.includes(":")
    || CONTROL_CHARACTER_PATTERN.test(value)
    || value.normalize("NFC") !== value
  ) {
    return failure([issue(code, path, "Path must be a non-empty canonical POSIX relative path")]);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return failure([issue(code, path, "Path must not contain empty, current-directory, or parent-directory segments")]);
  }
  if (encoder.encode(value).byteLength > MAX_RELEASE_RELATIVE_PATH_BYTES) {
    return failure([
      issue(code, path, `Path exceeds ${MAX_RELEASE_RELATIVE_PATH_BYTES} UTF-8 bytes`, {
        expected: MAX_RELEASE_RELATIVE_PATH_BYTES,
        actual: encoder.encode(value).byteLength,
      }),
    ]);
  }
  return success(brand(value));
}

export function compareCanonicalText(left: string, right: string): number {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const delta = leftBytes[index]! - rightBytes[index]!;
    if (delta !== 0) return delta;
  }
  return leftBytes.length - rightBytes.length;
}

export function parseBoundedCanonicalString(
  value: unknown,
  path: string,
  options: { readonly minBytes?: number; readonly maxBytes: number; readonly pattern?: RegExp } = { maxBytes: 512 },
): ControllerResult<string, ControllerIssue> {
  if (typeof value !== "string") {
    return failure([issue("EXPECTED_STRING", path, "Value must be a string")]);
  }
  const byteLength = encoder.encode(value).byteLength;
  const minBytes = options.minBytes ?? 1;
  if (
    byteLength < minBytes
    || byteLength > options.maxBytes
    || CONTROL_CHARACTER_PATTERN.test(value)
    || value.normalize("NFC") !== value
    || (options.pattern !== undefined && !options.pattern.test(value))
  ) {
    return failure([
      issue("INVALID_STRING", path, `Value must be canonical UTF-8 between ${minBytes} and ${options.maxBytes} bytes`),
    ]);
  }
  return success(value);
}

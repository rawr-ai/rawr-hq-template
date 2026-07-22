import { type ControllerIssue, issue } from "./issues";
import {
  type ControllerPayloadManifest,
  type ControllerPayloadManifestInput,
  canonicalStringifyControllerPayloadManifest,
  computeControllerDigest,
  createControllerPayloadManifest,
} from "./manifest";
import {
  CONTROLLER_RELEASE_ENVELOPE_SCHEMA_VERSION,
  type ControllerDigest,
  type ControllerReleaseEnvelopeSchemaVersion,
  parseControllerDigest,
} from "./primitives";
import { asNonEmpty, type ControllerResult, failure, success } from "./result";

declare const controllerReleaseEnvelopeBrand: unique symbol;

export const MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES = 64 * 1024 * 1024;

export interface ControllerReleaseEnvelopeInput {
  readonly schemaVersion: ControllerReleaseEnvelopeSchemaVersion;
  readonly controllerDigest: string;
  readonly manifest: ControllerPayloadManifestInput;
}

export type ControllerReleaseEnvelope = Readonly<{
  schemaVersion: ControllerReleaseEnvelopeSchemaVersion;
  controllerDigest: ControllerDigest;
  manifest: ControllerPayloadManifest;
  [controllerReleaseEnvelopeBrand]: "ControllerReleaseEnvelope";
}>;

export interface ControllerReleaseExpectations {
  readonly controllerDigest?: unknown;
  readonly releaseDirectoryName?: unknown;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function createControllerReleaseEnvelope(
  manifest: ControllerPayloadManifest
): ControllerReleaseEnvelope {
  return Object.freeze({
    schemaVersion: CONTROLLER_RELEASE_ENVELOPE_SCHEMA_VERSION,
    controllerDigest: computeControllerDigest(manifest),
    manifest,
  }) as ControllerReleaseEnvelope;
}

export function verifyControllerReleaseEnvelope(
  input: unknown,
  expectations: ControllerReleaseExpectations = {}
): ControllerResult<ControllerReleaseEnvelope, ControllerIssue> {
  const issues: ControllerIssue[] = [];
  if (!isExactEnvelope(input, issues)) return failure(asNonEmpty(issues)!);
  if (input.schemaVersion !== CONTROLLER_RELEASE_ENVELOPE_SCHEMA_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        "envelope.schemaVersion",
        "Unsupported controller release envelope version",
        {
          expected: CONTROLLER_RELEASE_ENVELOPE_SCHEMA_VERSION,
          actual:
            typeof input.schemaVersion === "number"
              ? input.schemaVersion
              : String(input.schemaVersion),
        }
      )
    );
  }
  const claimedDigest = parseControllerDigest(input.controllerDigest, "envelope.controllerDigest");
  if (!claimedDigest.ok) issues.push(...claimedDigest.issues);
  const manifest = createControllerPayloadManifest(input.manifest);
  if (!manifest.ok) issues.push(...manifest.issues);

  if (claimedDigest.ok && manifest.ok) {
    const computedDigest = computeControllerDigest(manifest.value);
    if (computedDigest !== claimedDigest.value) {
      issues.push(
        issue(
          "CONTROLLER_DIGEST_MISMATCH",
          "envelope.controllerDigest",
          "Claimed controller digest does not match the canonical payload manifest",
          {
            expected: computedDigest,
            actual: claimedDigest.value,
          }
        )
      );
    }
  }

  checkExpectedDigest(
    expectations.controllerDigest,
    "expectations.controllerDigest",
    "CONTROLLER_DIGEST_MISMATCH",
    claimedDigest,
    issues
  );
  checkExpectedDigest(
    expectations.releaseDirectoryName,
    "expectations.releaseDirectoryName",
    "RELEASE_DIRECTORY_MISMATCH",
    claimedDigest,
    issues
  );

  const nonEmpty = asNonEmpty(issues);
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (!claimedDigest.ok || !manifest.ok) {
    return failure([
      issue("EXPECTED_OBJECT", "envelope", "Envelope validation did not produce a complete value"),
    ]);
  }
  return success(
    Object.freeze({
      schemaVersion: CONTROLLER_RELEASE_ENVELOPE_SCHEMA_VERSION,
      controllerDigest: claimedDigest.value,
      manifest: manifest.value,
    }) as ControllerReleaseEnvelope
  );
}

export function canonicalStringifyControllerReleaseEnvelope(
  envelope: ControllerReleaseEnvelope
): string {
  return `{"schemaVersion":${envelope.schemaVersion},"controllerDigest":${JSON.stringify(envelope.controllerDigest)},"manifest":${canonicalStringifyControllerPayloadManifest(envelope.manifest)}}`;
}

export function canonicalSerializeControllerReleaseEnvelope(
  envelope: ControllerReleaseEnvelope
): Uint8Array {
  return encoder.encode(canonicalStringifyControllerReleaseEnvelope(envelope));
}

export function decodeControllerReleaseEnvelope(
  bytes: unknown,
  expectations: ControllerReleaseExpectations = {}
): ControllerResult<ControllerReleaseEnvelope, ControllerIssue> {
  if (!(bytes instanceof Uint8Array)) {
    return failure([
      issue("EXPECTED_BYTES", "envelope", "Controller release envelope must be a Uint8Array"),
    ]);
  }
  if (bytes.byteLength > MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES) {
    return failure([
      issue(
        "ENVELOPE_TOO_LARGE",
        "envelope",
        "Controller release envelope exceeds its decode bound",
        {
          expected: MAX_CONTROLLER_RELEASE_ENVELOPE_BYTES,
          actual: bytes.byteLength,
        }
      ),
    ]);
  }
  let text: string;
  try {
    text = decoder.decode(bytes);
  } catch {
    return failure([
      issue("INVALID_UTF8", "envelope", "Controller release envelope is not valid UTF-8"),
    ]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return failure([
      issue("INVALID_JSON", "envelope", "Controller release envelope is not valid JSON"),
    ]);
  }
  const verified = verifyControllerReleaseEnvelope(parsed, expectations);
  if (!verified.ok) return verified;
  const canonical = canonicalSerializeControllerReleaseEnvelope(verified.value);
  if (!equalBytes(bytes, canonical)) {
    return failure([
      issue(
        "NON_CANONICAL_ENVELOPE",
        "envelope",
        "Envelope bytes are not the unique canonical representation"
      ),
    ]);
  }
  return verified;
}

function checkExpectedDigest(
  value: unknown,
  path: string,
  mismatchCode: "CONTROLLER_DIGEST_MISMATCH" | "RELEASE_DIRECTORY_MISMATCH",
  claimed: ReturnType<typeof parseControllerDigest>,
  issues: ControllerIssue[]
): void {
  if (value === undefined) return;
  const expected = parseControllerDigest(value, path);
  if (!expected.ok) {
    issues.push(...expected.issues);
    return;
  }
  if (claimed.ok && expected.value !== claimed.value) {
    issues.push(
      issue(mismatchCode, path, "Expected controller identity differs from the release envelope", {
        expected: expected.value,
        actual: claimed.value,
      })
    );
  }
}

function isExactEnvelope(
  value: unknown,
  issues: ControllerIssue[]
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    issues.push(issue("EXPECTED_OBJECT", "envelope", "Envelope must be an object"));
    return false;
  }
  const keys = ["controllerDigest", "manifest", "schemaVersion"];
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key))
      issues.push(
        issue("UNKNOWN_FIELD", `envelope.${key}`, "Field is not part of the closed schema")
      );
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key))
      issues.push(issue("UNKNOWN_FIELD", `envelope.${key}`, "Required field is missing"));
  }
  return true;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let different = 0;
  for (let index = 0; index < left.byteLength; index += 1)
    different |= left[index]! ^ right[index]!;
  return different === 0;
}

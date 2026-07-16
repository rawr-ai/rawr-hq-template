import { isAbsolute, normalize, resolve } from "node:path";

import { compareCanonicalText } from "@rawr/agent-plugin-release";

import {
  KNOWN_NATIVE_HOMES_PROTOCOL_VERSION,
  type ExportFailure,
  type KnownNativeHomeV1,
  type KnownNativeHomesSnapshotDigest,
  type KnownNativeHomesSnapshotV1,
} from "./contract";
import { jsonLine, sha256, type JsonValue } from "./canonical";

const DIGEST_PATTERN = /^nh1_[0-9a-f]{64}$/u;

export type NativeHomesVerification =
  | Readonly<{ ok: true; snapshot: KnownNativeHomesSnapshotV1 }>
  | Readonly<{ ok: false; failure: ExportFailure }>;

export function verifyKnownNativeHomesSnapshot(input: unknown): NativeHomesVerification {
  try {
    if (!exactRecord(input, ["completeness", "homes", "protocolVersion", "snapshotDigest"])) {
      return invalid("Known-native-home snapshot must be a closed object");
    }
    if (input.protocolVersion !== KNOWN_NATIVE_HOMES_PROTOCOL_VERSION || input.completeness !== "complete") {
      return invalid("Known-native-home snapshot is not a complete protocol-v1 read model");
    }
    if (typeof input.snapshotDigest !== "string" || !DIGEST_PATTERN.test(input.snapshotDigest)) {
      return invalid("Known-native-home snapshot digest has the wrong domain");
    }
    if (!Array.isArray(input.homes) || input.homes.length > 64) {
      return invalid("Known-native-home snapshot must contain a bounded home list");
    }
    const homes: KnownNativeHomeV1[] = [];
    for (const [index, candidate] of input.homes.entries()) {
      if (!exactRecord(candidate, ["canonicalPath", "provider"])) {
        return invalid(`Known native home ${index} is not closed`);
      }
      if (candidate.provider !== "codex" && candidate.provider !== "claude") {
        return invalid(`Known native home ${index} has an unsupported provider`);
      }
      if (!isCanonicalAbsolutePath(candidate.canonicalPath)) {
        return invalid(`Known native home ${index} is not an absolute canonical path`);
      }
      homes.push(Object.freeze({ provider: candidate.provider, canonicalPath: candidate.canonicalPath }));
    }
    const canonicalHomes = [...homes].sort((left, right) =>
      compareCanonicalText(left.canonicalPath, right.canonicalPath)
      || compareCanonicalText(left.provider, right.provider));
    if (homes.some((home, index) =>
      home.canonicalPath !== canonicalHomes[index]?.canonicalPath
      || home.provider !== canonicalHomes[index]?.provider)) {
      return invalid("Known-native-home snapshot homes are not canonically ordered");
    }
    for (let index = 1; index < homes.length; index += 1) {
      if (homes[index - 1]!.canonicalPath === homes[index]!.canonicalPath) {
        return invalid("Known-native-home snapshot contains a duplicate canonical home");
      }
    }
    const snapshot = Object.freeze({
      protocolVersion: KNOWN_NATIVE_HOMES_PROTOCOL_VERSION,
      completeness: "complete",
      homes: Object.freeze(canonicalHomes),
      snapshotDigest: input.snapshotDigest as KnownNativeHomesSnapshotDigest,
    }) satisfies KnownNativeHomesSnapshotV1;
    const expected = knownNativeHomesSnapshotDigest(snapshot.homes);
    if (expected !== snapshot.snapshotDigest) return invalid("Known-native-home snapshot digest does not bind its complete body");
    return { ok: true, snapshot };
  } catch (error) {
    return invalid(error instanceof Error ? error.message : String(error));
  }
}

export function createKnownNativeHomesSnapshot(
  homesInput: readonly KnownNativeHomeV1[],
): NativeHomesVerification {
  const homes = Object.freeze([...homesInput]
    .map((home) => Object.freeze({ ...home }))
    .sort((left, right) => compareCanonicalText(left.canonicalPath, right.canonicalPath)
      || compareCanonicalText(left.provider, right.provider)));
  return verifyKnownNativeHomesSnapshot(Object.freeze({
    protocolVersion: KNOWN_NATIVE_HOMES_PROTOCOL_VERSION,
    completeness: "complete",
    homes,
    snapshotDigest: knownNativeHomesSnapshotDigest(homes),
  }));
}

export function knownNativeHomesSnapshotDigest(
  homes: readonly KnownNativeHomeV1[],
): KnownNativeHomesSnapshotDigest {
  return sha256("nh1_", jsonLine(knownNativeHomesBodyValue(homes))) as KnownNativeHomesSnapshotDigest;
}

export function pathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function knownNativeHomesBodyValue(homes: readonly KnownNativeHomeV1[]): JsonValue {
  return {
    protocolVersion: KNOWN_NATIVE_HOMES_PROTOCOL_VERSION,
    completeness: "complete",
    homes: homes.map((home) => ({ provider: home.provider, canonicalPath: home.canonicalPath })),
  };
}

function isCanonicalAbsolutePath(value: unknown): value is string {
  return typeof value === "string"
    && isAbsolute(value)
    && value === normalize(value)
    && value === resolve(value)
    && value !== "/";
}

function exactRecord(input: unknown, keys: readonly string[]): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const actual = Object.keys(input).sort(compareCanonicalText);
  const expected = [...keys].sort(compareCanonicalText);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function invalid(message: string): NativeHomesVerification {
  return {
    ok: false,
    failure: Object.freeze({
      code: "NativeHomesInvalid",
      phase: "native-homes",
      message,
    }),
  };
}

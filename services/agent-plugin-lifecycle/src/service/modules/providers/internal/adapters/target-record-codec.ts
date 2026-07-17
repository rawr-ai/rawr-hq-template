import {
  byteDigest,
  canonicalBytes,
  canonicalDigest,
  equalBytes,
  type CanonicalValue,
} from "../domain/canonical";
import { exactRecord } from "../domain/parse";
import {
  createTargetIdentitySidecar,
  type TargetIdentitySidecar,
} from "../domain/state";
import {
  failure,
  firstIssue,
  issue,
  success,
  type DeploymentResult,
  type ProviderDeploymentIssue,
} from "../domain/result";
import { parseProviderTarget } from "../domain/target";
import type {
  TargetRecordKey,
  TargetRecordMutation,
  TargetRecordObservation,
  TargetRecordPlanDigest,
} from "../ports/target-record-storage";

const MAX_IDENTITY_BYTES = 64 * 1024;

export function canonicalSerializeTargetIdentitySidecar(
  sidecar: TargetIdentitySidecar,
): Uint8Array {
  return canonicalBytes(targetIdentitySidecarValue(sidecar));
}

export function decodeTargetIdentitySidecar(
  bytes: unknown,
): DeploymentResult<TargetIdentitySidecar> {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_IDENTITY_BYTES) {
    return identityFailure("Target identity bytes must be bounded canonical JSON");
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return identityFailure("Target identity bytes are not valid UTF-8 JSON");
  }

  const issues: ProviderDeploymentIssue[] = [];
  if (!exactRecord(
    input,
    ["canonicalHome", "identityDigest", "provider", "schemaVersion", "targetDigest"],
    "target.identity",
    issues,
  )) {
    return failure(firstIssue(issues, issue(
      "INVALID_TARGET",
      "target.identity",
      "Target identity sidecar must be a closed record",
    )));
  }
  if (input.schemaVersion !== 1) {
    issues.push(issue(
      "INVALID_TARGET",
      "target.identity.schemaVersion",
      "Target identity sidecar schema is unsupported",
      "1",
      String(input.schemaVersion),
    ));
  }
  if (input.provider !== "codex" && input.provider !== "claude") {
    issues.push(issue(
      "INVALID_TARGET",
      "target.identity.provider",
      "Target identity sidecar provider is unsupported",
      "codex|claude",
      String(input.provider),
    ));
  }
  if (issues.length > 0 || (input.provider !== "codex" && input.provider !== "claude")) {
    return failure(firstIssue(issues, issue(
      "INVALID_TARGET",
      "target.identity",
      "Target identity sidecar is invalid",
    )));
  }

  const parsedTarget = parseProviderTarget({
    provider: input.provider,
    home: input.canonicalHome,
  }, "target.identity");
  if (!parsedTarget.ok) {
    return identityFailure("Target identity sidecar contains an invalid provider home");
  }
  const expected = createTargetIdentitySidecar(parsedTarget.value);
  if (
    input.targetDigest !== expected.targetDigest
    || input.identityDigest !== expected.identityDigest
  ) {
    return identityFailure("Target identity digests do not bind the canonical provider home");
  }
  if (!equalBytes(bytes, canonicalSerializeTargetIdentitySidecar(expected))) {
    return identityFailure("Target identity bytes are not the unique canonical representation");
  }
  return success(expected);
}

export function targetRecordPlanDigest(
  key: TargetRecordKey,
  expected: TargetRecordObservation,
  mutation: TargetRecordMutation,
): TargetRecordPlanDigest {
  return canonicalDigest("trp1_", {
    key: targetRecordKeyValue(key),
    expected: targetRecordObservationValue(expected),
    mutation: targetRecordMutationValue(mutation),
  }) as TargetRecordPlanDigest;
}

export function sameTargetRecordObservation(
  left: TargetRecordObservation,
  right: TargetRecordObservation,
): boolean {
  return left.kind === "absent"
    ? right.kind === "absent"
    : right.kind === "present" && equalBytes(left.bytes, right.bytes);
}

function targetIdentitySidecarValue(sidecar: TargetIdentitySidecar): CanonicalValue {
  return {
    schemaVersion: sidecar.schemaVersion,
    provider: sidecar.provider,
    canonicalHome: sidecar.canonicalHome,
    targetDigest: sidecar.targetDigest,
    identityDigest: sidecar.identityDigest,
  };
}

function targetRecordKeyValue(key: TargetRecordKey): CanonicalValue {
  return { kind: key.kind, targetDigest: key.targetDigest };
}

function targetRecordObservationValue(observation: TargetRecordObservation): CanonicalValue {
  return observation.kind === "absent"
    ? { kind: "absent" }
    : { kind: "present", byteDigest: byteDigest(observation.bytes) };
}

function targetRecordMutationValue(mutation: TargetRecordMutation): CanonicalValue {
  return mutation.kind === "remove"
    ? { kind: "remove" }
    : { kind: "put", byteDigest: byteDigest(mutation.bytes) };
}

function identityFailure(message: string): DeploymentResult<never> {
  return failure([issue("INVALID_TARGET", "target.identity", message)]);
}

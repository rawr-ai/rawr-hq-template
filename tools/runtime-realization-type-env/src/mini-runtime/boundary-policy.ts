import type { Exit } from "effect";
import type {
  ExecutionDescriptorRef,
  ProviderEffectBoundaryKind,
} from "../spine/artifacts";
import { Cause } from "../vendor/effect/runtime";
import {
  redactRuntimeRecordAttributes,
  type RuntimeRecordAttributes,
} from "./catalog";

/**
 * Boundary policies are keyed to the exact matrix cells:
 * service.procedure, plugin.server-api, plugin.server-internal,
 * plugin.async-step, plugin.cli-command, plugin.web-surface,
 * plugin.agent-tool, plugin.desktop-background, provider.acquire, and
 * provider.release. A generic string here would let proof records drift away
 * from the cells they are meant to cover.
 */
export type RuntimeBoundaryPolicyBoundary =
  | ExecutionDescriptorRef["boundary"]
  | ProviderEffectBoundaryKind;

export type RuntimeBoundaryExitClass =
  | "success"
  | "failure"
  | "defect"
  | "interrupted";

export interface RuntimeBoundaryRetryPolicy {
  readonly maxAttempts: number;
  readonly attempt: number;
}

export interface RuntimeBoundaryInterruptionPolicy {
  readonly source: "abort-signal" | "runtime";
  readonly requested: boolean;
}

/**
 * Declarative policy snapshot used by the lab runtime proof. Timeout/retry are
 * recorded as policy intent only; this snapshot does not implement scheduling,
 * retry loops, or public telemetry emission.
 */
export interface RuntimeBoundaryPolicy {
  readonly kind: "runtime.boundary-policy";
  readonly policyId: string;
  readonly boundary: RuntimeBoundaryPolicyBoundary;
  readonly subjectId: string;
  readonly timeoutMs?: number;
  readonly retry?: RuntimeBoundaryRetryPolicy;
  readonly interruption?: RuntimeBoundaryInterruptionPolicy;
  readonly telemetry: "record-only";
  readonly metadata: RuntimeRecordAttributes;
}

export interface RuntimeBoundaryPolicyInput {
  readonly policyId: string;
  readonly boundary: RuntimeBoundaryPolicyBoundary;
  readonly subjectId: string;
  readonly timeoutMs?: number;
  readonly retry?: RuntimeBoundaryRetryPolicy;
  readonly interruption?: {
    readonly signal?: AbortSignal;
    readonly requested?: boolean;
    readonly source?: RuntimeBoundaryInterruptionPolicy["source"];
  };
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimeBoundaryPolicyResolution {
  readonly policy: RuntimeBoundaryPolicy;
  readonly signal?: AbortSignal;
}

/**
 * Collapses Effect's richer exit/cause model into the matrix classes this
 * workstream proves. It is not the final public error payload contract.
 */
export interface RuntimeBoundaryExitClassification {
  readonly kind: "runtime.boundary-exit-classification";
  readonly exit: RuntimeBoundaryExitClass;
  readonly exitTag: "Success" | "Failure";
  readonly cause: "none" | "failure" | "defect" | "interrupted" | "unknown";
}

export interface RuntimeBoundaryPolicyRecord {
  readonly kind: "runtime.boundary-policy-record";
  readonly policyId: string;
  readonly boundary: RuntimeBoundaryPolicyBoundary;
  readonly subjectId: string;
  readonly phase: "boundary.policy.enter" | "boundary.policy.exit";
  readonly timeoutMs?: number;
  readonly retry?: RuntimeBoundaryRetryPolicy;
  readonly interruption?: RuntimeBoundaryInterruptionPolicy;
  readonly exit?: RuntimeBoundaryExitClassification;
  readonly attributes: RuntimeRecordAttributes;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function normalizeInterruptionPolicy(
  interruption: RuntimeBoundaryPolicyInput["interruption"],
): RuntimeBoundaryInterruptionPolicy | undefined {
  if (!interruption) return undefined;

  return {
    source: interruption.source ?? (interruption.signal ? "abort-signal" : "runtime"),
    requested: interruption.requested ?? interruption.signal?.aborted ?? false,
  };
}

/**
 * Creates a lab-local, record-only policy snapshot from live inputs.
 * AbortSignal state is collapsed into primitive interruption policy; the signal
 * handle itself is never retained in the policy or record attributes.
 */
export function createRuntimeBoundaryPolicy(
  input: RuntimeBoundaryPolicyInput,
): RuntimeBoundaryPolicy {
  if (input.timeoutMs !== undefined) {
    assertPositiveInteger(input.timeoutMs, "boundary timeoutMs");
  }
  if (input.retry) {
    assertPositiveInteger(input.retry.maxAttempts, "boundary retry.maxAttempts");
    assertPositiveInteger(input.retry.attempt, "boundary retry.attempt");
    if (input.retry.attempt > input.retry.maxAttempts) {
      throw new Error("boundary retry.attempt cannot exceed retry.maxAttempts");
    }
  }

  const interruptionPolicy = normalizeInterruptionPolicy(input.interruption);

  return {
    kind: "runtime.boundary-policy",
    policyId: input.policyId,
    boundary: input.boundary,
    subjectId: input.subjectId,
    telemetry: "record-only",
    metadata: redactRuntimeRecordAttributes(input.metadata),
    ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
    ...(input.retry ? { retry: input.retry } : {}),
    ...(interruptionPolicy ? { interruption: interruptionPolicy } : {}),
  };
}

/**
 * Keeps live AbortSignal propagation separate from the durable policy snapshot.
 * Callers may pass the signal straight through to the effect runner, while
 * records only carry the primitive interruption policy.
 */
export function createRuntimeBoundaryPolicyResolution(
  input: RuntimeBoundaryPolicyInput,
): RuntimeBoundaryPolicyResolution {
  return {
    policy: createRuntimeBoundaryPolicy(input),
    ...(input.interruption?.signal ? { signal: input.interruption.signal } : {}),
  };
}

export function classifyRuntimeBoundaryExit(
  exit: Exit.Exit<unknown, unknown>,
): RuntimeBoundaryExitClassification {
  if (exit._tag === "Success") {
    return {
      kind: "runtime.boundary-exit-classification",
      exit: "success",
      exitTag: "Success",
      cause: "none",
    };
  }

  if (Cause.isInterrupted(exit.cause)) {
    return {
      kind: "runtime.boundary-exit-classification",
      exit: "interrupted",
      exitTag: "Failure",
      cause: "interrupted",
    };
  }

  if (Cause.isDie(exit.cause)) {
    return {
      kind: "runtime.boundary-exit-classification",
      exit: "defect",
      exitTag: "Failure",
      cause: "defect",
    };
  }

  if (Cause.isFailure(exit.cause)) {
    return {
      kind: "runtime.boundary-exit-classification",
      exit: "failure",
      exitTag: "Failure",
      cause: "failure",
    };
  }

  return {
    kind: "runtime.boundary-exit-classification",
    exit: "failure",
    exitTag: "Failure",
    cause: "unknown",
  };
}

/**
 * Policy records are proof traces for runtime boundaries. They are shaped like
 * future telemetry/export data, but this workstream keeps them as in-memory
 * records and emits no external telemetry side effects.
 */
export function createRuntimeBoundaryPolicyRecord(input: {
  readonly policy: RuntimeBoundaryPolicy;
  readonly phase: RuntimeBoundaryPolicyRecord["phase"];
  readonly exit?: Exit.Exit<unknown, unknown>;
  readonly attributes?: Record<string, unknown>;
}): RuntimeBoundaryPolicyRecord {
  const record: RuntimeBoundaryPolicyRecord = {
    kind: "runtime.boundary-policy-record",
    policyId: input.policy.policyId,
    boundary: input.policy.boundary,
    subjectId: input.policy.subjectId,
    phase: input.phase,
    attributes: redactRuntimeRecordAttributes({
      ...input.policy.metadata,
      ...input.attributes,
    }),
  };

  return {
    ...record,
    ...(input.policy.timeoutMs !== undefined
      ? { timeoutMs: input.policy.timeoutMs }
      : {}),
    ...(input.policy.retry ? { retry: input.policy.retry } : {}),
    ...(input.policy.interruption
      ? { interruption: input.policy.interruption }
      : {}),
    ...(input.exit ? { exit: classifyRuntimeBoundaryExit(input.exit) } : {}),
  };
}

export function runtimeBoundaryPolicyRecordAttributes(
  record: RuntimeBoundaryPolicyRecord,
): RuntimeRecordAttributes {
  const attributes: Record<string, unknown> = {
    policyId: record.policyId,
    boundaryPolicy: record.boundary,
    subjectId: record.subjectId,
    attributes: record.attributes,
  };

  if (record.timeoutMs !== undefined) attributes.timeoutMs = record.timeoutMs;
  if (record.retry) attributes.retry = record.retry;
  if (record.interruption) attributes.interruption = record.interruption;
  if (record.exit) attributes.exit = record.exit;

  return redactRuntimeRecordAttributes(attributes);
}

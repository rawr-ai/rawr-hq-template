import { compareCanonical } from "../domain/canonical";
import {
  canonicalSerializeTargetReceipt,
  decodeTargetReceipt,
  verifyTargetReceipt,
  type TargetReceipt,
} from "../domain/receipt";
import {
  failure,
  firstIssue,
  issue,
  success,
  type DeploymentResult,
  type ProviderDeploymentIssue,
  type ProviderDeploymentIssueCode,
} from "../domain/result";
import {
  createTargetIdentitySidecar,
  type ReceiptObservation,
  type TargetIdentityObservation,
  type TargetIdentitySidecar,
} from "../domain/state";
import { parseProviderTarget, type ProviderTarget } from "../domain/target";
import type {
  PathlessTargetRecordCollection,
  TargetRecordCapture,
  TargetRecordKey,
  TargetRecordMutation,
  TargetRecordObservation,
  TargetRecordPlanInput,
} from "../ports/target-record-storage";
import type {
  CompleteTargetIdentityReader,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "../ports/state";
import {
  canonicalSerializeTargetIdentitySidecar,
  decodeTargetIdentitySidecar,
  sameTargetRecordObservation,
  targetRecordPlanDigest,
} from "./target-record-codec";

export interface PathlessTargetState {
  readonly identities: TargetIdentityReader & TargetIdentityWriter;
  readonly completeIdentities: CompleteTargetIdentityReader;
  readonly receipts: TargetReceiptReader & TargetReceiptWriter;
}

interface OperationContext {
  readonly code: Extract<
    ProviderDeploymentIssueCode,
    "INVALID_TARGET" | "MUTATION_FAILED" | "RECEIPT_FAILED"
  >;
  readonly path: string;
}

interface TargetRecordTransition<T> {
  readonly records: PathlessTargetRecordCollection;
  readonly key: TargetRecordKey;
  readonly expected: TargetRecordObservation;
  readonly desired: TargetRecordObservation;
  readonly result: T;
  readonly operation: OperationContext;
  readonly validate: (observation: TargetRecordObservation) => DeploymentResult<null>;
}

/**
 * Interprets generic target-record storage as the provider lifecycle's exact
 * identity and receipt state. The adapter owns codecs and transitions while
 * the collection owns only capture, mutation, restore, and settlement.
 */
export function createPathlessTargetState(
  records: PathlessTargetRecordCollection,
): PathlessTargetState {
  const identities: TargetIdentityReader & TargetIdentityWriter = Object.freeze({
    async read(target: ProviderTarget): Promise<DeploymentResult<TargetIdentityObservation>> {
      const canonical = canonicalTarget(target, IDENTITY_READ);
      if (!canonical.ok) return canonical;
      const key = recordKey("identity", canonical.value);
      const observed = await records.read(key);
      if (!observed.ok) return remapFailure(observed, IDENTITY_READ);
      return decodeIdentityObservation(observed.value, canonical.value, IDENTITY_READ);
    },

    async admit(
      target: ProviderTarget,
      sidecar: TargetIdentitySidecar,
    ): Promise<DeploymentResult<TargetIdentitySidecar>> {
      const canonical = canonicalTarget(target, IDENTITY_ADMIT);
      if (!canonical.ok) return canonical;
      const expectedSidecar = createTargetIdentitySidecar(canonical.value);
      if (!sameSidecar(expectedSidecar, sidecar)) {
        return operationFailure(
          IDENTITY_ADMIT,
          "Target identity admission does not bind the selected canonical home",
        );
      }
      const key = recordKey("identity", canonical.value);
      return await transitionTargetRecord({
        records,
        key,
        expected: ABSENT_RECORD,
        desired: presentRecord(canonicalSerializeTargetIdentitySidecar(expectedSidecar)),
        result: expectedSidecar,
        operation: IDENTITY_ADMIT,
        validate: (observation) => validateIdentityRecord(observation, canonical.value, IDENTITY_ADMIT),
      });
    },
  });

  const completeIdentities: CompleteTargetIdentityReader = Object.freeze({
    async readAll(): Promise<DeploymentResult<readonly TargetIdentitySidecar[]>> {
      const scanned = await records.scan("identity");
      if (!scanned.ok) return remapFailure(scanned, IDENTITY_SCAN);
      const seen = new Set<string>();
      const sidecars: TargetIdentitySidecar[] = [];
      for (const entry of scanned.value) {
        if (entry.key.kind !== "identity") {
          return operationFailure(
            IDENTITY_SCAN,
            "Target identity scan returned a foreign record kind",
            "identity",
            entry.key.kind,
          );
        }
        if (seen.has(entry.key.targetDigest)) {
          return operationFailure(
            IDENTITY_SCAN,
            "Target identity scan returned a duplicate semantic key",
            "distinct target digests",
            entry.key.targetDigest,
          );
        }
        seen.add(entry.key.targetDigest);
        if (entry.observation.kind === "absent") {
          return operationFailure(
            IDENTITY_SCAN,
            "Target identity scan returned an absent entry",
            "present identity record",
            "absent",
          );
        }
        const decoded = decodeTargetIdentitySidecar(entry.observation.bytes);
        if (!decoded.ok) return remapFailure(decoded, IDENTITY_SCAN);
        if (decoded.value.targetDigest !== entry.key.targetDigest) {
          return operationFailure(
            IDENTITY_SCAN,
            "Target identity scan key does not bind its sidecar",
            entry.key.targetDigest,
            decoded.value.targetDigest,
          );
        }
        sidecars.push(decoded.value);
      }
      sidecars.sort((left, right) => compareCanonical(left.targetDigest, right.targetDigest));
      return success(Object.freeze(sidecars));
    },
  });

  const receipts: TargetReceiptReader & TargetReceiptWriter = Object.freeze({
    async read(target: ProviderTarget): Promise<DeploymentResult<ReceiptObservation>> {
      const canonical = canonicalTarget(target, RECEIPT_READ);
      if (!canonical.ok) return canonical;
      const key = recordKey("receipt", canonical.value);
      const observed = await records.read(key);
      if (!observed.ok) return remapFailure(observed, RECEIPT_READ);
      return decodeReceiptObservation(observed.value, canonical.value, RECEIPT_READ);
    },

    async publish(
      target: ProviderTarget,
      prior: ReceiptObservation,
      receipt: TargetReceipt,
    ): Promise<DeploymentResult<TargetReceipt>> {
      const canonical = canonicalTarget(target, RECEIPT_PUBLISH);
      if (!canonical.ok) return canonical;
      const normalizedPrior = normalizeReceiptObservation(prior, canonical.value, RECEIPT_PUBLISH);
      if (!normalizedPrior.ok) return normalizedPrior;
      const normalizedReceipt = normalizeReceipt(receipt, canonical.value, RECEIPT_PUBLISH);
      if (!normalizedReceipt.ok) return normalizedReceipt;
      const lineage = validateReceiptSuccessor(normalizedPrior.value, normalizedReceipt.value);
      if (!lineage.ok) return remapFailure(lineage, RECEIPT_PUBLISH);
      const key = recordKey("receipt", canonical.value);
      return await transitionTargetRecord({
        records,
        key,
        expected: receiptRecordObservation(normalizedPrior.value),
        desired: presentRecord(canonicalSerializeTargetReceipt(normalizedReceipt.value)),
        result: normalizedReceipt.value,
        operation: RECEIPT_PUBLISH,
        validate: (observation) => validateReceiptRecord(observation, canonical.value, RECEIPT_PUBLISH),
      });
    },

    async remove(
      target: ProviderTarget,
      prior: TargetReceipt,
    ): Promise<DeploymentResult<null>> {
      const canonical = canonicalTarget(target, RECEIPT_REMOVE);
      if (!canonical.ok) return canonical;
      const normalizedPrior = normalizeReceipt(prior, canonical.value, RECEIPT_REMOVE);
      if (!normalizedPrior.ok) return normalizedPrior;
      const key = recordKey("receipt", canonical.value);
      return await transitionTargetRecord({
        records,
        key,
        expected: presentRecord(canonicalSerializeTargetReceipt(normalizedPrior.value)),
        desired: ABSENT_RECORD,
        result: null,
        operation: RECEIPT_REMOVE,
        validate: (observation) => validateReceiptRecord(observation, canonical.value, RECEIPT_REMOVE),
      });
    },
  });

  return Object.freeze({ identities, completeIdentities, receipts });
}

async function transitionTargetRecord<T>(
  input: TargetRecordTransition<T>,
): Promise<DeploymentResult<T>> {
  const captured = await input.records.capture(input.key);
  if (!captured.ok) return remapFailure(captured, input.operation);
  const capture = captured.value;
  if (!sameRecordKey(capture.key, input.key)) {
    return await failAndRelease(
      input.records,
      capture,
      input.operation,
      [mappedIssue(
        input.operation,
        "Target record capture returned a foreign semantic key",
        recordKeyText(input.key),
        recordKeyText(capture.key),
      )],
    );
  }
  const valid = input.validate(capture.observation);
  if (!valid.ok) {
    return await failAndRelease(
      input.records,
      capture,
      input.operation,
      [...valid.issues],
    );
  }
  if (sameTargetRecordObservation(capture.observation, input.desired)) {
    const released = await input.records.release(capture);
    if (!released.ok) {
      input.records.retainUnreleased(capture);
      return remapFailure(released, input.operation);
    }
    return success(input.result);
  }
  if (!sameTargetRecordObservation(capture.observation, input.expected)) {
    return await failAndRelease(
      input.records,
      capture,
      input.operation,
      [mappedIssue(
        input.operation,
        "Target record changed after lifecycle planning",
        recordObservationText(input.expected),
        recordObservationText(capture.observation),
      )],
    );
  }

  const mutation: TargetRecordMutation = input.desired.kind === "absent"
    ? Object.freeze({ kind: "remove" })
    : Object.freeze({ kind: "put", bytes: input.desired.bytes });
  const plan: TargetRecordPlanInput = Object.freeze({
    capture,
    planDigest: targetRecordPlanDigest(input.key, input.expected, mutation),
  });
  const written = await input.records.write(Object.freeze({ ...plan, mutation }));
  if (!written.ok) {
    return await failAndRestore(
      input.records,
      plan,
      input.operation,
      mappedIssues(written.issues, input.operation),
    );
  }
  const settled = await input.records.settle(plan);
  if (!settled.ok) {
    return await failAndRestore(
      input.records,
      plan,
      input.operation,
      mappedIssues(settled.issues, input.operation),
    );
  }
  return success(input.result);
}

async function failAndRelease(
  records: PathlessTargetRecordCollection,
  capture: TargetRecordCapture,
  operation: OperationContext,
  primary: readonly ProviderDeploymentIssue[],
): Promise<DeploymentResult<never>> {
  const released = await records.release(capture);
  if (!released.ok) records.retainUnreleased(capture);
  const issues = released.ok
    ? primary
    : [...primary, ...mappedIssues(released.issues, operation)];
  return failure(firstIssue(issues, mappedIssue(operation, "Target record release failed")));
}

async function failAndRestore(
  records: PathlessTargetRecordCollection,
  plan: TargetRecordPlanInput,
  operation: OperationContext,
  primary: readonly ProviderDeploymentIssue[],
): Promise<DeploymentResult<never>> {
  const restored = await records.restore(plan);
  if (!restored.ok) {
    records.retainUnsettled(plan);
    const issues = [...primary, ...mappedIssues(restored.issues, operation)];
    return failure(firstIssue(issues, mappedIssue(operation, "Target record restore failed")));
  }
  const settled = await records.settle(plan);
  if (!settled.ok) records.retainUnsettled(plan);
  const issues = settled.ok
    ? primary
    : [...primary, ...mappedIssues(settled.issues, operation)];
  return failure(firstIssue(issues, mappedIssue(operation, "Target record settlement failed")));
}

function decodeIdentityObservation(
  observation: TargetRecordObservation,
  target: ProviderTarget,
  operation: OperationContext,
): DeploymentResult<TargetIdentityObservation> {
  if (observation.kind === "absent") return success(ABSENT_IDENTITY);
  const decoded = decodeTargetIdentitySidecar(observation.bytes);
  if (!decoded.ok) return remapFailure(decoded, operation);
  if (!sameSidecar(decoded.value, createTargetIdentitySidecar(target))) {
    return operationFailure(
      operation,
      "Target identity sidecar belongs to another provider home",
      target.targetDigest,
      decoded.value.targetDigest,
    );
  }
  return success(Object.freeze({ kind: "present", sidecar: decoded.value }));
}

function decodeReceiptObservation(
  observation: TargetRecordObservation,
  target: ProviderTarget,
  operation: OperationContext,
): DeploymentResult<ReceiptObservation> {
  if (observation.kind === "absent") return success(ABSENT_RECEIPT);
  const decoded = decodeTargetReceipt(observation.bytes);
  if (!decoded.ok) return remapFailure(decoded, operation);
  const receipt = normalizeReceipt(decoded.value, target, operation);
  return receipt.ok
    ? success(Object.freeze({ kind: "present", receipt: receipt.value }))
    : receipt;
}

function validateIdentityRecord(
  observation: TargetRecordObservation,
  target: ProviderTarget,
  operation: OperationContext,
): DeploymentResult<null> {
  const decoded = decodeIdentityObservation(observation, target, operation);
  return decoded.ok ? success(null) : decoded;
}

function validateReceiptRecord(
  observation: TargetRecordObservation,
  target: ProviderTarget,
  operation: OperationContext,
): DeploymentResult<null> {
  const decoded = decodeReceiptObservation(observation, target, operation);
  return decoded.ok ? success(null) : decoded;
}

function normalizeReceiptObservation(
  observation: ReceiptObservation,
  target: ProviderTarget,
  operation: OperationContext,
): DeploymentResult<ReceiptObservation> {
  if (observation.kind === "absent") return success(ABSENT_RECEIPT);
  const receipt = normalizeReceipt(observation.receipt, target, operation);
  return receipt.ok
    ? success(Object.freeze({ kind: "present", receipt: receipt.value }))
    : receipt;
}

function normalizeReceipt(
  receipt: TargetReceipt,
  target: ProviderTarget,
  operation: OperationContext,
): DeploymentResult<TargetReceipt> {
  const verified = verifyTargetReceipt(receipt);
  if (!verified.ok) return remapFailure(verified, operation);
  if (
    verified.value.body.provider !== target.provider
    || verified.value.body.targetDigest !== target.targetDigest
  ) {
    return operationFailure(
      operation,
      "Target receipt belongs to another provider home",
      target.targetDigest,
      verified.value.body.targetDigest,
    );
  }
  return verified;
}

function validateReceiptSuccessor(
  prior: ReceiptObservation,
  receipt: TargetReceipt,
): DeploymentResult<null> {
  if (prior.kind === "absent") {
    return receipt.body.generation === 1 && receipt.body.lineage.kind === "initial"
      ? success(null)
      : failure([issue(
        "INVALID_RECEIPT",
        "target.receipt.lineage",
        "First target receipt must use initial generation one",
        "generation=1,lineage=initial",
        receiptLineageText(receipt),
      )]);
  }
  return (
    receipt.body.generation === prior.receipt.body.generation + 1
    && receipt.body.lineage.kind === "successor"
    && receipt.body.lineage.priorReceiptDigest === prior.receipt.receiptDigest
  )
    ? success(null)
    : failure([issue(
      "INVALID_RECEIPT",
      "target.receipt.lineage",
      "Target receipt successor does not bind the exact prior generation and digest",
      `${prior.receipt.body.generation + 1}:${prior.receipt.receiptDigest}`,
      receiptLineageText(receipt),
    )]);
}

function canonicalTarget(
  target: ProviderTarget,
  operation: OperationContext,
): DeploymentResult<ProviderTarget> {
  const parsed = parseProviderTarget({ provider: target.provider, home: target.home });
  if (!parsed.ok) return remapFailure(parsed, operation);
  if (parsed.value.targetDigest !== target.targetDigest) {
    return operationFailure(
      operation,
      "Provider target digest does not bind its canonical home",
      parsed.value.targetDigest,
      target.targetDigest,
    );
  }
  return parsed;
}

function receiptRecordObservation(observation: ReceiptObservation): TargetRecordObservation {
  return observation.kind === "absent"
    ? ABSENT_RECORD
    : presentRecord(canonicalSerializeTargetReceipt(observation.receipt));
}

function recordKey(kind: TargetRecordKey["kind"], target: ProviderTarget): TargetRecordKey {
  return Object.freeze({ kind, targetDigest: target.targetDigest });
}

function presentRecord(bytes: Uint8Array): TargetRecordObservation {
  return Object.freeze({ kind: "present", bytes });
}

function sameRecordKey(left: TargetRecordKey, right: TargetRecordKey): boolean {
  return left.kind === right.kind && left.targetDigest === right.targetDigest;
}

function sameSidecar(left: TargetIdentitySidecar, right: TargetIdentitySidecar): boolean {
  return left.schemaVersion === right.schemaVersion
    && left.provider === right.provider
    && left.canonicalHome === right.canonicalHome
    && left.targetDigest === right.targetDigest
    && left.identityDigest === right.identityDigest;
}

function remapFailure<T>(
  result: DeploymentResult<T>,
  operation: OperationContext,
): DeploymentResult<T> {
  if (result.ok) return result;
  return failure(firstIssue(
    mappedIssues(result.issues, operation),
    mappedIssue(operation, "Target record operation failed"),
  ));
}

function mappedIssues(
  issues: readonly ProviderDeploymentIssue[],
  operation: OperationContext,
): readonly ProviderDeploymentIssue[] {
  return issues.map((entry) => issue(
    operation.code,
    operation.path,
    `${entry.path}: ${entry.message}`,
    entry.expected,
    entry.actual,
  ));
}

function mappedIssue(
  operation: OperationContext,
  message: string,
  expected = "",
  actual = "",
): ProviderDeploymentIssue {
  return issue(operation.code, operation.path, message, expected, actual);
}

function operationFailure(
  operation: OperationContext,
  message: string,
  expected = "",
  actual = "",
): DeploymentResult<never> {
  return failure([mappedIssue(operation, message, expected, actual)]);
}

function recordKeyText(key: TargetRecordKey): string {
  return `${key.kind}:${key.targetDigest}`;
}

function recordObservationText(observation: TargetRecordObservation): string {
  return observation.kind;
}

function receiptLineageText(receipt: TargetReceipt): string {
  return receipt.body.lineage.kind === "initial"
    ? `${receipt.body.generation}:initial`
    : `${receipt.body.generation}:${receipt.body.lineage.priorReceiptDigest}`;
}

const ABSENT_RECORD = Object.freeze({ kind: "absent" } as const);
const ABSENT_IDENTITY = Object.freeze({ kind: "absent" } as const);
const ABSENT_RECEIPT = Object.freeze({ kind: "absent" } as const);

const IDENTITY_READ: OperationContext = Object.freeze({
  code: "INVALID_TARGET",
  path: "target.identity",
});
const IDENTITY_SCAN: OperationContext = Object.freeze({
  code: "INVALID_TARGET",
  path: "targetIdentities",
});
const IDENTITY_ADMIT: OperationContext = Object.freeze({
  code: "MUTATION_FAILED",
  path: "target.identity.admit",
});
const RECEIPT_READ: OperationContext = Object.freeze({
  code: "RECEIPT_FAILED",
  path: "target.receipt",
});
const RECEIPT_PUBLISH: OperationContext = Object.freeze({
  code: "RECEIPT_FAILED",
  path: "target.receipt.publish",
});
const RECEIPT_REMOVE: OperationContext = Object.freeze({
  code: "RECEIPT_FAILED",
  path: "target.receipt.remove",
});

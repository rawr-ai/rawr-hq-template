import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalBytes, compareCanonical, equalBytes } from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  canonicalSerializeTargetReceipt,
  decodeTargetReceipt,
  type TargetReceipt,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import { failure, issue, success, type DeploymentResult } from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  createTargetIdentitySidecar,
  type ReceiptObservation,
  type TargetIdentityObservation,
  type TargetIdentitySidecar,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  compareTargets,
  parseProviderTarget,
  type ProviderId,
  type ProviderTarget,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type {
  CompleteTargetIdentityReader,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { NodeRuntimeLayout } from "./filesystem";
import {
  isMissing,
  publishImmutableFile,
  readOptionalRegularFile,
  replaceFileWhileLocked,
  unlinkExactFile,
  withExactLock,
} from "./filesystem";

export interface NodeTargetStateStore {
  readonly receipts: TargetReceiptReader & TargetReceiptWriter;
  readonly identities: TargetIdentityReader & TargetIdentityWriter;
  readonly completeIdentities: CompleteTargetIdentityReader;
  restoreReceiptExact(
    target: ProviderTarget,
    expected: ReceiptObservation,
    prior: ReceiptObservation,
  ): Promise<DeploymentResult<null>>;
  removeAdmittedIdentityExact(
    target: ProviderTarget,
    expected: TargetIdentitySidecar,
  ): Promise<DeploymentResult<null>>;
}

export interface ProviderTargetLocator {
  readonly provider: ProviderId;
  readonly home: string;
}

export function createNodeTargetStateStore(layout: NodeRuntimeLayout): NodeTargetStateStore {
  const readReceipt = async (target: ProviderTarget): Promise<DeploymentResult<ReceiptObservation>> => {
    try {
      await requireCanonicalTarget(target);
      return await readReceiptUnchecked(layout, target);
    } catch (error) {
      return failure([stateFailure("RECEIPT_FAILED", "target.receipt", error)]);
    }
  };

  const publishReceipt = async (
    target: ProviderTarget,
    prior: ReceiptObservation,
    receipt: TargetReceipt,
  ): Promise<DeploymentResult<TargetReceipt>> => {
    try {
      await requireCanonicalTarget(target);
      requireReceiptBinding(target, receipt);
      requireSuccessor(prior, receipt);
      const destination = receiptPath(layout, target);
      await withExactLock(layout.targetState, `${target.targetDigest}.receipt`, async () => {
        const current = await readReceiptUncheckedOrThrow(layout, target);
        requireSameReceiptObservation(current, prior);
        const bytes = canonicalSerializeTargetReceipt(receipt);
        if (current.kind === "absent") {
          await publishImmutableFile(layout.targetState, destination, bytes);
        } else {
          await replaceFileWhileLocked(layout.targetState, destination, bytes);
        }
      });
      return success(receipt);
    } catch (error) {
      return failure([stateFailure("RECEIPT_FAILED", "target.receipt.publish", error)]);
    }
  };

  const removeReceipt = async (
    target: ProviderTarget,
    prior: TargetReceipt,
  ): Promise<DeploymentResult<null>> => {
    try {
      await requireCanonicalTarget(target);
      requireReceiptBinding(target, prior);
      await withExactLock(layout.targetState, `${target.targetDigest}.receipt`, async () => {
        const current = await readReceiptUncheckedOrThrow(layout, target);
        requireSameReceiptObservation(current, Object.freeze({ kind: "present", receipt: prior }));
        await unlinkExactFile(receiptPath(layout, target));
      });
      return success(null);
    } catch (error) {
      return failure([stateFailure("RECEIPT_FAILED", "target.receipt.remove", error)]);
    }
  };

  const readIdentity = async (
    target: ProviderTarget,
  ): Promise<DeploymentResult<TargetIdentityObservation>> => {
    try {
      await requireCanonicalTarget(target);
      return await readIdentityUnchecked(layout, target);
    } catch (error) {
      return failure([stateFailure("INVALID_TARGET", "target.identity", error)]);
    }
  };

  const admitIdentity = async (
    target: ProviderTarget,
    sidecar: TargetIdentitySidecar,
  ): Promise<DeploymentResult<TargetIdentitySidecar>> => {
    try {
      await requireCanonicalTarget(target);
      const expected = createTargetIdentitySidecar(target);
      if (!sameSidecar(expected, sidecar)) {
        throw new Error("Target identity admission does not bind the selected canonical home");
      }
      await publishImmutableFile(layout.targetState, identityPath(layout, target), serializeSidecar(sidecar));
      return success(sidecar);
    } catch (error) {
      return failure([stateFailure("MUTATION_FAILED", "target.identity.admit", error)]);
    }
  };

  const readAll = async (): Promise<DeploymentResult<readonly TargetIdentitySidecar[]>> => {
    try {
      let entries;
      try {
        entries = await readdir(layout.targetState.identities, { withFileTypes: true });
      } catch (error) {
        if (isMissing(error)) return success(Object.freeze([]));
        throw error;
      }
      entries.sort((left, right) => compareCanonical(left.name, right.name));
      const sidecars: TargetIdentitySidecar[] = [];
      for (const entry of entries) {
        if (!entry.isFile() || !/^pt1_[0-9a-f]{64}\.json$/u.test(entry.name)) {
          throw new Error(`Malformed target-identity snapshot entry: ${entry.name}`);
        }
        const bytes = await readOptionalRegularFile(path.join(layout.targetState.identities, entry.name));
        if (bytes === null) throw new Error(`Target-identity snapshot entry disappeared: ${entry.name}`);
        const sidecar = decodeSidecar(bytes);
        if (entry.name !== `${sidecar.targetDigest}.json`) {
          throw new Error(`Target-identity snapshot key does not bind its sidecar: ${entry.name}`);
        }
        const parsedTarget = parseProviderTarget({ provider: sidecar.provider, home: sidecar.canonicalHome });
        if (!parsedTarget.ok) throw new Error(`Target-identity snapshot home is invalid: ${entry.name}`);
        await requireCanonicalTarget(parsedTarget.value);
        sidecars.push(sidecar);
      }
      return success(Object.freeze(sidecars));
    } catch (error) {
      return failure([stateFailure("INVALID_TARGET", "targetIdentities", error)]);
    }
  };

  const restoreReceiptExact = async (
    target: ProviderTarget,
    expected: ReceiptObservation,
    prior: ReceiptObservation,
  ): Promise<DeploymentResult<null>> => {
    try {
      await requireCanonicalTarget(target);
      if (expected.kind === "present") requireReceiptBinding(target, expected.receipt);
      if (prior.kind === "present") requireReceiptBinding(target, prior.receipt);
      await withExactLock(layout.targetState, `${target.targetDigest}.receipt`, async () => {
        const current = await readReceiptUncheckedOrThrow(layout, target);
        if (sameReceiptObservation(current, prior)) return;
        requireSameReceiptObservation(current, expected);
        const destination = receiptPath(layout, target);
        if (prior.kind === "absent") {
          await unlinkExactFile(destination);
        } else if (current.kind === "absent") {
          await publishImmutableFile(layout.targetState, destination, canonicalSerializeTargetReceipt(prior.receipt));
        } else {
          await replaceFileWhileLocked(layout.targetState, destination, canonicalSerializeTargetReceipt(prior.receipt));
        }
      });
      return success(null);
    } catch (error) {
      return failure([stateFailure("RECEIPT_FAILED", "target.receipt.restore", error)]);
    }
  };

  const removeAdmittedIdentityExact = async (
    target: ProviderTarget,
    expected: TargetIdentitySidecar,
  ): Promise<DeploymentResult<null>> => {
    try {
      await requireCanonicalTarget(target);
      await withExactLock(layout.targetState, `${target.targetDigest}.identity`, async () => {
        const current = await readIdentityUncheckedOrThrow(layout, target);
        if (current.kind === "absent") return;
        if (!sameSidecar(current.sidecar, expected)) {
          throw new Error("Target identity changed after admission");
        }
        await unlinkExactFile(identityPath(layout, target));
      });
      return success(null);
    } catch (error) {
      return failure([stateFailure("MUTATION_FAILED", "target.identity.restore", error)]);
    }
  };

  return Object.freeze({
    receipts: Object.freeze({ read: readReceipt, publish: publishReceipt, remove: removeReceipt }),
    identities: Object.freeze({ read: readIdentity, admit: admitIdentity }),
    completeIdentities: Object.freeze({ readAll }),
    restoreReceiptExact,
    removeAdmittedIdentityExact,
  });
}

export async function canonicalizeNodeProviderTargets(
  locators: readonly ProviderTargetLocator[],
): Promise<DeploymentResult<readonly ProviderTarget[]>> {
  try {
    if (locators.length === 0) throw new Error("At least one explicit provider target is required");
    const targets = new Map<string, ProviderTarget>();
    for (const [index, locator] of locators.entries()) {
      const home = await realpath(locator.home);
      const status = await lstat(home);
      if (!status.isDirectory() || status.isSymbolicLink()) {
        throw new Error(`Provider home is not a canonical directory: ${locator.home}`);
      }
      const parsed = parseProviderTarget({ provider: locator.provider, home }, `targets[${index}]`);
      if (!parsed.ok) throw new Error(parsed.issues.map((entry) => entry.message).join("; "));
      const key = `${parsed.value.provider}\0${parsed.value.home}`;
      if (targets.has(key)) {
        return failure([issue(
          "DUPLICATE_TARGET",
          `targets[${index}]`,
          "Provider target resolves to a duplicate canonical home",
          "distinct canonical provider home",
          parsed.value.home,
        )]);
      }
      targets.set(key, parsed.value);
    }
    return success(Object.freeze([...targets.values()].sort(compareTargets)));
  } catch (error) {
    return failure([stateFailure("INVALID_TARGET", "targets", error)]);
  }
}

export function serializeSidecar(sidecar: TargetIdentitySidecar): Uint8Array {
  return canonicalBytes({
    schemaVersion: sidecar.schemaVersion,
    provider: sidecar.provider,
    canonicalHome: sidecar.canonicalHome,
    targetDigest: sidecar.targetDigest,
    identityDigest: sidecar.identityDigest,
  });
}

export function decodeSidecar(bytes: Uint8Array): TargetIdentitySidecar {
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("Target identity sidecar is not UTF-8 JSON");
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Target identity sidecar must be an object");
  }
  const record = input as Record<string, unknown>;
  const keys = Object.keys(record).sort(compareCanonical);
  const expectedKeys = ["canonicalHome", "identityDigest", "provider", "schemaVersion", "targetDigest"];
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error("Target identity sidecar must be a closed record");
  }
  if (record.schemaVersion !== 1 || (record.provider !== "codex" && record.provider !== "claude")) {
    throw new Error("Target identity sidecar protocol is unsupported");
  }
  const parsed = parseProviderTarget({ provider: record.provider, home: record.canonicalHome });
  if (!parsed.ok) throw new Error("Target identity sidecar contains an invalid provider home");
  const expected = createTargetIdentitySidecar(parsed.value);
  if (record.targetDigest !== expected.targetDigest || record.identityDigest !== expected.identityDigest) {
    throw new Error("Target identity sidecar digest does not bind its canonical home");
  }
  if (!equalBytes(bytes, serializeSidecar(expected))) {
    throw new Error("Target identity sidecar is not canonical");
  }
  return expected;
}

async function readReceiptUnchecked(
  layout: NodeRuntimeLayout,
  target: ProviderTarget,
): Promise<DeploymentResult<ReceiptObservation>> {
  try {
    return success(await readReceiptUncheckedOrThrow(layout, target));
  } catch (error) {
    return failure([stateFailure("RECEIPT_FAILED", "target.receipt", error)]);
  }
}

async function readReceiptUncheckedOrThrow(
  layout: NodeRuntimeLayout,
  target: ProviderTarget,
): Promise<ReceiptObservation> {
  const bytes = await readOptionalRegularFile(receiptPath(layout, target));
  if (bytes === null) return Object.freeze({ kind: "absent" });
  const decoded = decodeTargetReceipt(bytes);
  if (!decoded.ok) throw new Error(decoded.issues.map((entry) => entry.message).join("; "));
  requireReceiptBinding(target, decoded.value);
  return Object.freeze({ kind: "present", receipt: decoded.value });
}

async function readIdentityUnchecked(
  layout: NodeRuntimeLayout,
  target: ProviderTarget,
): Promise<DeploymentResult<TargetIdentityObservation>> {
  try {
    return success(await readIdentityUncheckedOrThrow(layout, target));
  } catch (error) {
    return failure([stateFailure("INVALID_TARGET", "target.identity", error)]);
  }
}

async function readIdentityUncheckedOrThrow(
  layout: NodeRuntimeLayout,
  target: ProviderTarget,
): Promise<TargetIdentityObservation> {
  const bytes = await readOptionalRegularFile(identityPath(layout, target));
  if (bytes === null) return Object.freeze({ kind: "absent" });
  const sidecar = decodeSidecar(bytes);
  if (sidecar.targetDigest !== target.targetDigest) throw new Error("Target identity sidecar belongs to another home");
  return Object.freeze({ kind: "present", sidecar });
}

async function requireCanonicalTarget(target: ProviderTarget): Promise<void> {
  const parsed = parseProviderTarget({ provider: target.provider, home: target.home });
  if (!parsed.ok || parsed.value.targetDigest !== target.targetDigest) {
    throw new Error("Provider target digest does not bind its home");
  }
  const canonical = await realpath(target.home);
  if (canonical !== target.home) throw new Error("Provider target home is an alias; canonicalize it before use");
  const status = await lstat(canonical);
  if (!status.isDirectory() || status.isSymbolicLink()) throw new Error("Provider target home is not a directory");
}

function requireReceiptBinding(target: ProviderTarget, receipt: TargetReceipt): void {
  if (receipt.body.provider !== target.provider || receipt.body.targetDigest !== target.targetDigest) {
    throw new Error("Target receipt belongs to another provider home");
  }
}

function requireSuccessor(prior: ReceiptObservation, receipt: TargetReceipt): void {
  if (prior.kind === "absent") {
    if (receipt.body.generation !== 1 || receipt.body.lineage.kind !== "initial") {
      throw new Error("First target receipt must use initial generation one");
    }
    return;
  }
  if (
    receipt.body.generation !== prior.receipt.body.generation + 1
    || receipt.body.lineage.kind !== "successor"
    || receipt.body.lineage.priorReceiptDigest !== prior.receipt.receiptDigest
  ) {
    throw new Error("Target receipt successor does not bind the exact prior generation and digest");
  }
}

function requireSameReceiptObservation(left: ReceiptObservation, right: ReceiptObservation): void {
  if (!sameReceiptObservation(left, right)) throw new Error("Target receipt changed after planning");
}

function sameReceiptObservation(left: ReceiptObservation, right: ReceiptObservation): boolean {
  return left.kind === "absent"
    ? right.kind === "absent"
    : right.kind === "present" && left.receipt.receiptDigest === right.receipt.receiptDigest;
}

function sameSidecar(left: TargetIdentitySidecar, right: TargetIdentitySidecar): boolean {
  return left.schemaVersion === right.schemaVersion
    && left.provider === right.provider
    && left.canonicalHome === right.canonicalHome
    && left.targetDigest === right.targetDigest
    && left.identityDigest === right.identityDigest;
}

function receiptPath(layout: NodeRuntimeLayout, target: ProviderTarget): string {
  requireTargetDigest(target.targetDigest);
  return path.join(layout.targetState.receipts, `${target.targetDigest}.json`);
}

function identityPath(layout: NodeRuntimeLayout, target: ProviderTarget): string {
  requireTargetDigest(target.targetDigest);
  return path.join(layout.targetState.identities, `${target.targetDigest}.json`);
}

function requireTargetDigest(value: string): void {
  if (!/^pt1_[0-9a-f]{64}$/u.test(value)) throw new Error("Provider target digest is invalid");
}

function stateFailure(
  code: "INVALID_TARGET" | "MUTATION_FAILED" | "RECEIPT_FAILED",
  pathPrefix: string,
  error: unknown,
) {
  return issue(code, pathPrefix, error instanceof Error ? error.message : String(error));
}

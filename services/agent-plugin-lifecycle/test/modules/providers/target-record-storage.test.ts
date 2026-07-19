import { describe, expect, it } from "vitest";

import {
  CODEX_ADAPTER_PROTOCOL,
  canonicalSerializeTargetIdentitySidecar,
  canonicalSerializeTargetReceipt,
  createPathlessTargetState,
  createProviderMarketplaceRegistration,
  createTargetIdentitySidecar,
  createTargetReceipt,
  decodeTargetIdentitySidecar,
  marketplaceState,
  parseProviderTarget,
  renderCompleteProjection,
  visibleFingerprint,
  type AgentProviderProjection,
  type EvaluationProfile,
  type PathlessTargetRecordCollection,
  type ProviderRequestDigest,
  type ProviderTarget,
  type TargetIdentitySidecar,
  type TargetReceipt,
  type TargetRecordCapture,
  type TargetRecordCaptureHandle,
  type TargetRecordKey,
  type TargetRecordMutation,
  type TargetRecordObservation,
  type TargetRecordPlanInput,
  type TargetRecordReadToken,
  type TargetRecordScanEntry,
} from "../../../src/bindings/providers";
import { failure, issue, success } from "../../../src/service/modules/providers/model/errors/deployment-result";
import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import { productFixture } from "../../shared/release/fixtures";

describe("pathless target-record storage", () => {
  it("reads absence and exact service-owned identity and receipt codecs", async () => {
    const target = mustTarget("/provider/a");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);

    expect(await state.identities.read(target)).toEqual({ ok: true, value: { kind: "absent" } });
    expect(await state.receipts.read(target)).toEqual({ ok: true, value: { kind: "absent" } });

    const sidecar = createTargetIdentitySidecar(target);
    const receipt = receiptFixture(target);
    records.seed(identityKey(target), canonicalSerializeTargetIdentitySidecar(sidecar));
    records.seed(receiptKey(target), canonicalSerializeTargetReceipt(receipt));

    expect(await state.identities.read(target)).toEqual({
      ok: true,
      value: { kind: "present", sidecar },
    });
    expect(await state.receipts.read(target)).toEqual({
      ok: true,
      value: { kind: "present", receipt },
    });
    expect(decodeTargetIdentitySidecar(
      canonicalSerializeTargetIdentitySidecar(sidecar),
    )).toEqual({ ok: true, value: sidecar });

    records.seed(
      identityKey(target),
      new TextEncoder().encode(`${new TextDecoder().decode(
        canonicalSerializeTargetIdentitySidecar(sidecar),
      )}\n`),
    );
    const nonCanonical = await state.identities.read(target);
    expect(nonCanonical.ok).toBe(false);
    if (!nonCanonical.ok) {
      expect(nonCanonical.issues[0]).toMatchObject({
        code: "INVALID_TARGET",
        path: "target.identity",
      });
    }

    records.seed(
      receiptKey(target),
      new TextEncoder().encode(`${new TextDecoder().decode(
        canonicalSerializeTargetReceipt(receipt),
      )}\n`),
    );
    const nonCanonicalReceipt = await state.receipts.read(target);
    expect(nonCanonicalReceipt.ok).toBe(false);
    if (!nonCanonicalReceipt.ok) {
      expect(nonCanonicalReceipt.issues[0]).toMatchObject({
        code: "RECEIPT_FAILED",
        path: "target.receipt",
      });
    }
  });

  it("sorts complete identities and rejects duplicate or foreign scan entries", async () => {
    const targetA = mustTarget("/provider/a");
    const targetB = mustTarget("/provider/b");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);
    records.seed(
      identityKey(targetB),
      canonicalSerializeTargetIdentitySidecar(createTargetIdentitySidecar(targetB)),
    );
    records.seed(
      identityKey(targetA),
      canonicalSerializeTargetIdentitySidecar(createTargetIdentitySidecar(targetA)),
    );

    const complete = await state.completeIdentities.readAll();
    expect(complete.ok && complete.value.map((sidecar) => sidecar.targetDigest)).toEqual(
      [targetA.targetDigest, targetB.targetDigest].sort(),
    );

    records.scanOverride = [
      presentScan(targetA, createTargetIdentitySidecar(targetA)),
      presentScan(targetA, createTargetIdentitySidecar(targetA)),
    ];
    expect((await state.completeIdentities.readAll()).ok).toBe(false);

    records.scanOverride = [Object.freeze({
      key: receiptKey(targetA),
      observation: presentRecord(canonicalSerializeTargetIdentitySidecar(
        createTargetIdentitySidecar(targetA),
      )),
    })];
    expect((await state.completeIdentities.readAll()).ok).toBe(false);

    records.scanOverride = [Object.freeze({
      key: identityKey(targetB),
      observation: presentRecord(canonicalSerializeTargetIdentitySidecar(
        createTargetIdentitySidecar(targetA),
      )),
    })];
    expect((await state.completeIdentities.readAll()).ok).toBe(false);
  });

  it("captures, writes, and settles identity admission and receipt publication/removal", async () => {
    const target = mustTarget("/provider/a");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);
    const sidecar = createTargetIdentitySidecar(target);
    const receipt = receiptFixture(target);

    expect(await state.identities.admit(target, sidecar)).toEqual({ ok: true, value: sidecar });
    expect(records.operations()).toEqual(["capture", "write", "settle"]);
    expect(records.retained).toEqual([]);
    records.clearEvents();

    expect(await state.receipts.publish(target, { kind: "absent" }, receipt)).toEqual({
      ok: true,
      value: receipt,
    });
    expect(records.operations()).toEqual(["capture", "write", "settle"]);
    expect(records.observe(receiptKey(target))).toEqual(canonicalSerializeTargetReceipt(receipt));
    records.clearEvents();

    expect(await state.receipts.remove(target, receipt)).toEqual({ ok: true, value: null });
    expect(records.operations()).toEqual(["capture", "write", "settle"]);
    expect(records.observe(receiptKey(target))).toBeNull();
  });

  it("releases an exact converged capture without writing or settling", async () => {
    const target = mustTarget("/provider/a");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);
    const sidecar = createTargetIdentitySidecar(target);
    const receipt = receiptFixture(target);
    records.seed(identityKey(target), canonicalSerializeTargetIdentitySidecar(sidecar));

    expect(await state.identities.admit(target, sidecar)).toEqual({ ok: true, value: sidecar });
    expect(records.operations()).toEqual(["capture", "release"]);
    expect(records.retained).toEqual([]);
    expect(records.retainedUnreleased).toEqual([]);
    records.clearEvents();

    records.seed(receiptKey(target), canonicalSerializeTargetReceipt(receipt));
    expect(await state.receipts.publish(target, { kind: "absent" }, receipt)).toEqual({
      ok: true,
      value: receipt,
    });
    expect(records.operations()).toEqual(["capture", "release"]);
    expect(records.retainedUnreleased).toEqual([]);
  });

  it("refuses every invalid receipt-lineage transition before capture", async () => {
    const target = mustTarget("/provider/a");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);
    const prior = receiptFixture(target);
    const successor = receiptFixture(target, prior);
    const initialAfterPresent = createTargetReceipt({
      ...successor.body,
      lineage: Object.freeze({ kind: "initial" }),
    });
    const skippedGeneration = createTargetReceipt({
      ...successor.body,
      generation: prior.body.generation + 2,
    });
    const wrongPriorDigest = createTargetReceipt({
      ...successor.body,
      lineage: Object.freeze({
        kind: "successor",
        priorReceiptDigest: `tr1_${"f".repeat(64)}` as TargetReceipt["receiptDigest"],
      }),
    });
    const transitions = [
      { prior: Object.freeze({ kind: "absent" } as const), receipt: successor },
      { prior: presentReceipt(prior), receipt: initialAfterPresent },
      { prior: presentReceipt(prior), receipt: skippedGeneration },
      { prior: presentReceipt(prior), receipt: wrongPriorDigest },
    ];

    for (const transition of transitions) {
      const result = await state.receipts.publish(target, transition.prior, transition.receipt);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]).toMatchObject({
          code: "RECEIPT_FAILED",
          path: "target.receipt.publish",
        });
      }
    }
    expect(records.operations()).toEqual([]);
  });

  it("retains exact unmutated authority when either release path fails", async () => {
    const target = mustTarget("/provider/a");
    const sidecar = createTargetIdentitySidecar(target);
    const convergedRecords = new FakeTargetRecords();
    const convergedState = createPathlessTargetState(convergedRecords);
    convergedRecords.seed(
      identityKey(target),
      canonicalSerializeTargetIdentitySidecar(sidecar),
    );
    convergedRecords.failNextRelease = true;

    expect((await convergedState.identities.admit(target, sidecar)).ok).toBe(false);
    expect(convergedRecords.operations()).toEqual(["capture", "release", "retain-unreleased"]);
    expectRetainedUnreleased(convergedRecords, identityKey(target));

    const mismatchedRecords = new FakeTargetRecords();
    const mismatchedState = createPathlessTargetState(mismatchedRecords);
    const prior = receiptFixture(target);
    const successor = receiptFixture(target, prior);
    mismatchedRecords.seed(receiptKey(target), canonicalSerializeTargetReceipt(successor));
    mismatchedRecords.failNextRelease = true;

    expect((await mismatchedState.receipts.remove(target, prior)).ok).toBe(false);
    expect(mismatchedRecords.operations()).toEqual(["capture", "release", "retain-unreleased"]);
    expectRetainedUnreleased(mismatchedRecords, receiptKey(target));
  });

  it("restores the exact preimage and settles when a write fails after mutation", async () => {
    const target = mustTarget("/provider/a");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);
    const prior = receiptFixture(target);
    const successor = receiptFixture(target, prior);
    const priorBytes = canonicalSerializeTargetReceipt(prior);
    records.seed(receiptKey(target), priorBytes);
    records.failNextWriteAfterMutation = true;

    const result = await state.receipts.publish(
      target,
      { kind: "present", receipt: prior },
      successor,
    );

    expect(result.ok).toBe(false);
    expect(records.operations()).toEqual(["capture", "write", "restore", "settle"]);
    expect(records.observe(receiptKey(target))).toEqual(priorBytes);

    const settleFailureRecords = new FakeTargetRecords();
    const settleFailureState = createPathlessTargetState(settleFailureRecords);
    settleFailureRecords.seed(receiptKey(target), priorBytes);
    settleFailureRecords.failNextSettle = true;
    const settleFailure = await settleFailureState.receipts.publish(
      target,
      { kind: "present", receipt: prior },
      successor,
    );
    expect(settleFailure.ok).toBe(false);
    expect(settleFailureRecords.operations()).toEqual([
      "capture",
      "write",
      "settle",
      "restore",
      "settle",
    ]);
    expect(settleFailureRecords.observe(receiptKey(target))).toEqual(priorBytes);
    expect(settleFailureRecords.retained).toEqual([]);
  });

  it("retains opaque transaction authority when exact restore fails", async () => {
    const target = mustTarget("/provider/a");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);
    const prior = receiptFixture(target);
    const successor = receiptFixture(target, prior);
    records.seed(receiptKey(target), canonicalSerializeTargetReceipt(prior));
    records.failNextWriteAfterMutation = true;
    records.failNextRestore = true;

    const result = await state.receipts.publish(
      target,
      { kind: "present", receipt: prior },
      successor,
    );

    expect(result.ok).toBe(false);
    expect(records.operations()).toEqual(["capture", "write", "restore", "retain"]);
    expectRetainedPlan(records, receiptKey(target), "mutated");
  });

  it("retains restored authority when post-restore settlement fails", async () => {
    const target = mustTarget("/provider/a");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);
    const prior = receiptFixture(target);
    const successor = receiptFixture(target, prior);
    const priorBytes = canonicalSerializeTargetReceipt(prior);
    records.seed(receiptKey(target), priorBytes);
    records.failNextWriteAfterMutation = true;
    records.failNextSettle = true;

    const result = await state.receipts.publish(
      target,
      { kind: "present", receipt: prior },
      successor,
    );

    expect(result.ok).toBe(false);
    expect(records.operations()).toEqual(["capture", "write", "restore", "settle", "retain"]);
    expect(records.observe(receiptKey(target))).toEqual(priorBytes);
    expectRetainedPlan(records, receiptKey(target), "restored");
  });

  it("passes only semantic keys and opaque transaction authority across the port", async () => {
    const target = mustTarget("/provider/a");
    const records = new FakeTargetRecords();
    const state = createPathlessTargetState(records);
    const sidecar = createTargetIdentitySidecar(target);

    expect((await state.identities.admit(target, sidecar)).ok).toBe(true);
    const controlJournal = JSON.stringify(records.events, (_key, value) =>
      value instanceof Uint8Array ? `<${value.byteLength} bytes>` : value);
    expect(controlJournal).not.toContain(target.home);
    expect(controlJournal).not.toMatch(/"(?:address|locator|path)"/u);
    expect(controlJournal).toContain(target.targetDigest);
  });
});

interface CaptureState {
  readonly capture: TargetRecordCapture;
  readonly preimage: TargetRecordObservation;
  state: "captured" | "mutated" | "restored";
}

interface FakeEvent {
  readonly operation:
    | "capture"
    | "release"
    | "restore"
    | "retain"
    | "retain-unreleased"
    | "settle"
    | "write";
  readonly input: unknown;
}

class FakeTargetRecords implements PathlessTargetRecordCollection {
  readonly events: FakeEvent[] = [];
  readonly retainedUnreleased: TargetRecordCapture[] = [];
  readonly retained: TargetRecordPlanInput[] = [];
  scanOverride: readonly TargetRecordScanEntry[] | null = null;
  failNextWriteAfterMutation = false;
  failNextRestore = false;
  failNextRelease = false;
  failNextSettle = false;
  private readonly records = new Map<string, Uint8Array>();
  private readonly captures = new Map<TargetRecordCaptureHandle, CaptureState>();
  private sequence = 0;

  async read(key: TargetRecordKey) {
    return success(this.observation(key));
  }

  async scan(kind: TargetRecordKey["kind"]) {
    if (this.scanOverride !== null) return success(this.scanOverride);
    const entries = [...this.records.entries()]
      .filter(([key]) => key.startsWith(`${kind}:`))
      .map(([key, bytes]) => Object.freeze({
        key: parseRecordKey(key),
        observation: presentRecord(bytes),
      }));
    return success(Object.freeze(entries));
  }

  async capture(key: TargetRecordKey) {
    this.sequence += 1;
    const captureHandle = `capture-${this.sequence}` as TargetRecordCaptureHandle;
    const readToken = `read-${this.sequence}` as TargetRecordReadToken;
    const observation = this.observation(key);
    const capture = Object.freeze({ captureHandle, readToken, key, observation });
    this.captures.set(captureHandle, { capture, preimage: observation, state: "captured" });
    this.events.push(Object.freeze({ operation: "capture", input: captureAuthority(capture) }));
    return success(capture);
  }

  async release(capture: TargetRecordCapture) {
    this.events.push(Object.freeze({ operation: "release", input: captureAuthority(capture) }));
    if (this.failNextRelease) {
      this.failNextRelease = false;
      return transactionFailure("release-before-consumption");
    }
    const state = this.captures.get(capture.captureHandle);
    if (state === undefined || state.state !== "captured") return transactionFailure("release");
    this.captures.delete(capture.captureHandle);
    return success(null);
  }

  async write(input: TargetRecordPlanInput & Readonly<{ mutation: TargetRecordMutation }>) {
    this.events.push(Object.freeze({
      operation: "write",
      input: { ...captureAuthority(input.capture), planDigest: input.planDigest, mutation: input.mutation },
    }));
    const state = this.requireCapture(input.capture, "captured");
    if (!state.ok) return state;
    if (input.mutation.kind === "remove") this.records.delete(recordKeyText(input.capture.key));
    else this.records.set(recordKeyText(input.capture.key), cloneBytes(input.mutation.bytes));
    state.value.state = "mutated";
    if (this.failNextWriteAfterMutation) {
      this.failNextWriteAfterMutation = false;
      return transactionFailure("write-after-mutation");
    }
    return success(Object.freeze({ kind: "applied" as const }));
  }

  async restore(input: TargetRecordPlanInput) {
    this.events.push(Object.freeze({
      operation: "restore",
      input: { ...captureAuthority(input.capture), planDigest: input.planDigest },
    }));
    if (this.failNextRestore) {
      this.failNextRestore = false;
      return transactionFailure("restore-before-mutation");
    }
    const state = this.requireCapture(input.capture, "mutated");
    if (!state.ok) return state;
    const before = this.observation(input.capture.key);
    if (state.value.preimage.kind === "absent") {
      this.records.delete(recordKeyText(input.capture.key));
    } else {
      this.records.set(recordKeyText(input.capture.key), cloneBytes(state.value.preimage.bytes));
    }
    state.value.state = "restored";
    return success(Object.freeze({
      kind: "restored" as const,
      changed: !sameObservation(before, state.value.preimage),
    }));
  }

  async settle(input: TargetRecordPlanInput) {
    this.events.push(Object.freeze({
      operation: "settle",
      input: { ...captureAuthority(input.capture), planDigest: input.planDigest },
    }));
    if (this.failNextSettle) {
      this.failNextSettle = false;
      return transactionFailure("settle-before-consumption");
    }
    const state = this.captures.get(input.capture.captureHandle);
    if (state === undefined || state.state === "captured") return transactionFailure("settle");
    this.captures.delete(input.capture.captureHandle);
    return success(null);
  }

  retainUnsettled(input: TargetRecordPlanInput): void {
    this.events.push(Object.freeze({
      operation: "retain",
      input: { ...captureAuthority(input.capture), planDigest: input.planDigest },
    }));
    this.retained.push(input);
  }

  retainUnreleased(capture: TargetRecordCapture): void {
    this.events.push(Object.freeze({
      operation: "retain-unreleased",
      input: captureAuthority(capture),
    }));
    this.retainedUnreleased.push(capture);
  }

  seed(key: TargetRecordKey, bytes: Uint8Array): void {
    this.records.set(recordKeyText(key), cloneBytes(bytes));
  }

  observe(key: TargetRecordKey): Uint8Array | null {
    const bytes = this.records.get(recordKeyText(key));
    return bytes === undefined ? null : cloneBytes(bytes);
  }

  operations(): readonly FakeEvent["operation"][] {
    return this.events.map((event) => event.operation);
  }

  clearEvents(): void {
    this.events.length = 0;
  }

  liveCaptureState(capture: TargetRecordCapture): CaptureState["state"] | null {
    const state = this.captures.get(capture.captureHandle);
    return state !== undefined
      && state.capture.readToken === capture.readToken
      && recordKeyText(state.capture.key) === recordKeyText(capture.key)
      ? state.state
      : null;
  }

  private observation(key: TargetRecordKey): TargetRecordObservation {
    const bytes = this.records.get(recordKeyText(key));
    return bytes === undefined ? ABSENT_RECORD : presentRecord(bytes);
  }

  private requireCapture(
    capture: TargetRecordCapture,
    expected: CaptureState["state"],
  ) {
    const state = this.captures.get(capture.captureHandle);
    return state === undefined || state.state !== expected
      ? transactionFailure("capture-state")
      : success(state);
  }
}

function receiptFixture(target: ProviderTarget, prior?: TargetReceipt): TargetReceipt {
  const fixture = productFixture();
  const projection = completeProjection();
  const verifiedMembers = projection.members.map((member) => Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
  }));
  const managedMembers = verifiedMembers.map((member) => Object.freeze({
    ...member,
    sourceProjectionDigest: projection.projectionDigest,
  }));
  const registration = createProviderMarketplaceRegistration({
    provider: projection.provider,
    adapterProtocol: projection.adapterProtocol,
    marketplaceIdentity: projection.marketplace.identity,
    members: managedMembers.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: member.sourceProjectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
  return createTargetReceipt({
    schemaVersion: 1,
    provider: target.provider,
    targetDigest: target.targetDigest,
    generation: prior === undefined ? 1 : prior.body.generation + 1,
    lineage: prior === undefined
      ? Object.freeze({ kind: "initial" })
      : Object.freeze({ kind: "successor", priorReceiptDigest: prior.receiptDigest }),
    marketplace: marketplaceState(registration),
    scope: Object.freeze({
      kind: "complete-test",
      requestDigest: `prq1_${"1".repeat(64)}` as ProviderRequestDigest,
      projectionDigest: projection.projectionDigest,
      adapterProtocol: projection.adapterProtocol,
      capabilityProfileDigest: projection.capabilityProfile.capabilityProfileDigest,
      visibleFingerprint: visibleFingerprint(verifiedMembers),
      verifiedMembers,
      releaseSet: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
      evaluationProfile: "provider-smoke@v1" as EvaluationProfile,
    }),
    managedMembers,
  });
}

function completeProjection(): AgentProviderProjection {
  const fixture = productFixture();
  const rendered = renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members: [snapshot(fixture.alphaRelease), snapshot(fixture.betaRelease)],
  });
  if (!rendered.ok) throw new Error(rendered.issues[0].message);
  return rendered.value;
}

function snapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return {
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  };
}

function mustTarget(home: string): ProviderTarget {
  const parsed = parseProviderTarget({ provider: "codex", home });
  if (!parsed.ok) throw new Error(parsed.issues[0].message);
  return parsed.value;
}

function identityKey(target: ProviderTarget): TargetRecordKey {
  return Object.freeze({ kind: "identity", targetDigest: target.targetDigest });
}

function receiptKey(target: ProviderTarget): TargetRecordKey {
  return Object.freeze({ kind: "receipt", targetDigest: target.targetDigest });
}

function presentScan(
  target: ProviderTarget,
  sidecar: TargetIdentitySidecar,
): TargetRecordScanEntry {
  return Object.freeze({
    key: identityKey(target),
    observation: presentRecord(canonicalSerializeTargetIdentitySidecar(sidecar)),
  });
}

function presentRecord(bytes: Uint8Array): TargetRecordObservation {
  return Object.freeze({ kind: "present", bytes: cloneBytes(bytes) });
}

function presentReceipt(receipt: TargetReceipt) {
  return Object.freeze({ kind: "present" as const, receipt });
}

function recordKeyText(key: TargetRecordKey): string {
  return `${key.kind}:${key.targetDigest}`;
}

function parseRecordKey(value: string): TargetRecordKey {
  const separator = value.indexOf(":");
  return Object.freeze({
    kind: value.slice(0, separator) as TargetRecordKey["kind"],
    targetDigest: value.slice(separator + 1) as TargetRecordKey["targetDigest"],
  });
}

function captureAuthority(capture: TargetRecordCapture) {
  return {
    captureHandle: capture.captureHandle,
    readToken: capture.readToken,
    key: capture.key,
  };
}

function expectRetainedPlan(
  records: FakeTargetRecords,
  expectedKey: TargetRecordKey,
  expectedLiveState: CaptureState["state"],
): void {
  expect(records.retained).toHaveLength(1);
  const retained = records.retained[0];
  if (retained === undefined) throw new Error("retained target-record plan missing");
  const capture = captureAuthority(retained.capture);
  const planned = Object.freeze({ ...capture, planDigest: retained.planDigest });
  expect(capture.key).toEqual(expectedKey);
  expect(eventAuthority(records.events[0])).toEqual(capture);
  for (const event of records.events.slice(1)) {
    expect(eventAuthority(event)).toEqual(planned);
  }
  expect(records.liveCaptureState(retained.capture)).toBe(expectedLiveState);
}

function expectRetainedUnreleased(
  records: FakeTargetRecords,
  expectedKey: TargetRecordKey,
): void {
  expect(records.retainedUnreleased).toHaveLength(1);
  const retained = records.retainedUnreleased[0];
  if (retained === undefined) throw new Error("retained unreleased capture missing");
  const authority = captureAuthority(retained);
  expect(authority.key).toEqual(expectedKey);
  for (const event of records.events) expect(eventAuthority(event)).toEqual(authority);
  expect(records.liveCaptureState(retained)).toBe("captured");
}

function eventAuthority(event: FakeEvent | undefined) {
  if (event === undefined || event.input === null || typeof event.input !== "object") {
    throw new Error("target-record transaction event is missing authority");
  }
  const input = event.input as Readonly<Record<string, unknown>>;
  const capture = {
    captureHandle: input.captureHandle,
    readToken: input.readToken,
    key: input.key,
  };
  return Object.hasOwn(input, "planDigest")
    ? Object.freeze({ ...capture, planDigest: input.planDigest })
    : Object.freeze(capture);
}

function cloneBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

function sameObservation(left: TargetRecordObservation, right: TargetRecordObservation): boolean {
  return left.kind === "absent"
    ? right.kind === "absent"
    : right.kind === "present"
      && left.bytes.length === right.bytes.length
      && left.bytes.every((value, index) => value === right.bytes[index]);
}

function transactionFailure(phase: string) {
  return failure([issue(
    "MUTATION_FAILED",
    "targetRecordResource",
    `Synthetic target-record failure during ${phase}`,
  )]);
}

const ABSENT_RECORD = Object.freeze({ kind: "absent" } as const);

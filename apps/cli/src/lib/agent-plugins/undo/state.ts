import {
  canonicalJsonBytes,
  capsuleStateDigest,
  committedCapsuleDigest,
  parseCanonicalJsonBytes,
  type CanonicalJsonValue,
} from "./canonical";
import {
  CAPSULE_PROTOCOL_VERSION,
  CAPSULE_FAILURE_CODES,
  MAX_CAPSULE_ACTIONS,
  MAX_CAPSULE_DECODED_PRIOR_BYTES,
  MAX_CAPSULE_RELATIVE_PATHS,
  MAX_CAPSULE_STATE_BYTES,
  type CapsuleActionDigest,
  type CapsuleDigest,
  type CapsuleFailure,
  type CapsuleFailureCode,
  type CapsuleGeneration,
  type CapsuleStateDigest,
  type CapsuleToken,
  type OwnerActionSequenceModeV1,
  type ReplayActionOutcomeV1,
  type TargetStateBindingV1,
} from "./contract";
import { ClosedOwnerProtocolRegistryV1 } from "./protocol-registry";
import {
  addBounded,
  capsuleInputValidationError,
  parseTargetBindings,
  requireArray,
  requireExactRecord,
  requireGeneration,
  requireOwner,
  requireSafeInteger,
  requireString,
  requireToken,
} from "./validation";

export interface StoredPlannedActionV1 {
  readonly actionDigest: CapsuleActionDigest;
  readonly actionType: string;
  readonly action: CanonicalJsonValue;
  readonly relativePaths: readonly string[];
  readonly decodedPriorBytes: number;
  readonly maximumObservedPostBytes: number;
  readonly phase: "planned" | "staged" | "applied";
  readonly observedPost: CanonicalJsonValue | null;
}

export interface StoredCommittedActionV1 {
  readonly actionDigest: CapsuleActionDigest;
  readonly actionType: string;
  readonly action: CanonicalJsonValue;
  readonly relativePaths: readonly string[];
  readonly decodedPriorBytes: number;
  readonly observedPost: CanonicalJsonValue;
}

export interface CapsuleIdentityV1 {
  readonly owner: string;
  readonly ownerProtocolVersion: number;
  readonly contentAuthority: string;
  readonly targets: readonly TargetStateBindingV1[];
}

export interface CommittedCapsuleBodyV1 extends CapsuleIdentityV1 {
  readonly actions: readonly StoredCommittedActionV1[];
}

export interface CommittedCapsuleV1 {
  readonly capsuleDigest: CapsuleDigest;
  readonly capsule: CommittedCapsuleBodyV1;
}

export interface ApplyingCandidateV1 extends CapsuleIdentityV1 {
  readonly token: CapsuleToken;
  readonly priorGeneration: CapsuleGeneration;
  readonly priorStateDigest: CapsuleStateDigest;
  readonly actions: readonly StoredPlannedActionV1[];
}

export type PersistedReplayOutcomeV1 =
  | Readonly<{ kind: "Pending" }>
  | Readonly<{ kind: "Restored" }>
  | Readonly<{ kind: "AlreadyRestored" }>
  | Readonly<{ kind: "Blocked"; failure: PersistedFailureV1 }>
  | Readonly<{ kind: "Failed"; failure: PersistedFailureV1 }>;

export interface PersistedFailureV1 {
  readonly code: CapsuleFailureCode;
  readonly phase: string;
  readonly message: string;
  readonly path: string | null;
}

export type CapsuleStateVariantV1 =
  | Readonly<{ kind: "idle"; committed: CommittedCapsuleV1 | null }>
  | Readonly<{
    kind: "applying";
    prior: CommittedCapsuleV1 | null;
    candidate: ApplyingCandidateV1;
  }>
  | Readonly<{
    kind: "undoing";
    committed: CommittedCapsuleV1;
    token: CapsuleToken;
    outcomes: readonly PersistedReplayOutcomeV1[];
    verificationFailure: PersistedFailureV1 | null;
  }>;

export interface CapsuleStateBodyV1 {
  readonly generation: CapsuleGeneration;
  readonly state: CapsuleStateVariantV1;
}

export interface CapsuleStateEnvelopeV1 {
  readonly protocolVersion: typeof CAPSULE_PROTOCOL_VERSION;
  readonly stateDigest: CapsuleStateDigest;
  readonly body: CapsuleStateBodyV1;
}

export interface CapsuleStateLimitsV1 {
  readonly actions: number;
  readonly relativePaths: number;
  readonly decodedPriorBytes: number;
  readonly stateBytes: number;
}

export const PRODUCTION_CAPSULE_LIMITS: CapsuleStateLimitsV1 = Object.freeze({
  actions: MAX_CAPSULE_ACTIONS,
  relativePaths: MAX_CAPSULE_RELATIVE_PATHS,
  decodedPriorBytes: MAX_CAPSULE_DECODED_PRIOR_BYTES,
  stateBytes: MAX_CAPSULE_STATE_BYTES,
});

export function normalizeCapsuleLimits(
  limits: CapsuleStateLimitsV1 = PRODUCTION_CAPSULE_LIMITS,
): CapsuleStateLimitsV1 {
  return Object.freeze({
    actions: requireLimit(limits.actions, "actions", MAX_CAPSULE_ACTIONS, 0),
    relativePaths: requireLimit(limits.relativePaths, "relativePaths", MAX_CAPSULE_RELATIVE_PATHS, 0),
    decodedPriorBytes: requireLimit(
      limits.decodedPriorBytes,
      "decodedPriorBytes",
      MAX_CAPSULE_DECODED_PRIOR_BYTES,
      0,
    ),
    stateBytes: requireLimit(limits.stateBytes, "stateBytes", MAX_CAPSULE_STATE_BYTES, 1),
  });
}

export function createInitialCapsuleState(): CapsuleStateEnvelopeV1 {
  return sealCapsuleState(
    "cg1_0000000000000000000000000000000000000000000000000000000000000000",
    Object.freeze({ kind: "idle", committed: null }),
  );
}

export function sealCapsuleState(
  generation: CapsuleGeneration,
  state: CapsuleStateVariantV1,
  limits: CapsuleStateLimitsV1 = PRODUCTION_CAPSULE_LIMITS,
): CapsuleStateEnvelopeV1 {
  const normalizedLimits = normalizeCapsuleLimits(limits);
  const body = Object.freeze({ generation, state });
  const envelope = Object.freeze({
    protocolVersion: CAPSULE_PROTOCOL_VERSION,
    stateDigest: capsuleStateDigest(body),
    body,
  });
  validateStateBounds(envelope, normalizedLimits);
  return envelope;
}

export function encodeCapsuleState(
  state: CapsuleStateEnvelopeV1,
  limits: CapsuleStateLimitsV1 = PRODUCTION_CAPSULE_LIMITS,
): Uint8Array {
  const normalizedLimits = normalizeCapsuleLimits(limits);
  const bytes = canonicalJsonBytes(state);
  if (bytes.byteLength > normalizedLimits.stateBytes) throw new Error("capsule state exceeds serialized byte bound");
  return bytes;
}

export function parseCapsuleStateBytes(
  bytes: Uint8Array,
  registry: ClosedOwnerProtocolRegistryV1,
  limits: CapsuleStateLimitsV1 = PRODUCTION_CAPSULE_LIMITS,
): CapsuleStateEnvelopeV1 {
  const normalizedLimits = normalizeCapsuleLimits(limits);
  if (bytes.byteLength > normalizedLimits.stateBytes) throw new Error("capsule state exceeds serialized byte bound");
  const value = parseCanonicalJsonBytes(bytes);
  const envelopeRecord = requireExactRecord(value, ["body", "protocolVersion", "stateDigest"], "state envelope");
  if (envelopeRecord.protocolVersion !== CAPSULE_PROTOCOL_VERSION) {
    throw new Error("unsupported capsule state protocol");
  }
  const body = parseStateBody(envelopeRecord.body, registry);
  const stateDigest = requireString(envelopeRecord.stateDigest, "stateDigest", {
    pattern: /^cs1_[a-f0-9]{64}$/,
    max: 68,
  }) as CapsuleStateDigest;
  if (stateDigest !== capsuleStateDigest(body)) throw new Error("capsule state digest mismatch");
  const envelope = Object.freeze({ protocolVersion: CAPSULE_PROTOCOL_VERSION, stateDigest, body });
  validateStateBounds(envelope, normalizedLimits);
  if (!equalBytes(bytes, canonicalJsonBytes(envelope))) throw new Error("capsule state is not canonical");
  return envelope;
}

export function sealCommittedCapsule(body: CommittedCapsuleBodyV1): CommittedCapsuleV1 {
  if (body.actions.length === 0) throw new Error("committed capsule must contain an applied action");
  return Object.freeze({ capsuleDigest: committedCapsuleDigest(body), capsule: body });
}

export function persistedFailure(failure: CapsuleFailure): PersistedFailureV1 {
  return Object.freeze({
    code: failure.code,
    phase: failure.phase,
    message: failure.message,
    path: failure.path ?? null,
  });
}

export function publicReplayOutcomes(
  outcomes: readonly PersistedReplayOutcomeV1[],
): readonly ReplayActionOutcomeV1[] {
  return outcomes.map((outcome) => {
    if (outcome.kind === "Blocked" || outcome.kind === "Failed") {
      return Object.freeze({
        kind: outcome.kind,
        failure: Object.freeze({
          code: outcome.failure.code,
          phase: outcome.failure.phase,
          message: outcome.failure.message,
          ...(outcome.failure.path === null ? {} : { path: outcome.failure.path }),
        }),
      });
    }
    return outcome;
  });
}

export function validateStateBounds(
  envelope: CapsuleStateEnvelopeV1,
  limits: CapsuleStateLimitsV1 = PRODUCTION_CAPSULE_LIMITS,
): void {
  const normalizedLimits = normalizeCapsuleLimits(limits);
  const actions = actionsOf(envelope.body.state);
  if (actions.length > normalizedLimits.actions) {
    throw capsuleInputValidationError("CapsuleBoundExceeded", "capsule action count exceeds bound");
  }
  const distinctPaths = new Set<string>();
  let priorBytes = 0;
  for (const action of actions) {
    for (const relativePath of action.relativePaths) distinctPaths.add(relativePath);
    if (distinctPaths.size > normalizedLimits.relativePaths) {
      throw capsuleInputValidationError("CapsuleBoundExceeded", "capsule relative-path count exceeds bound");
    }
    priorBytes = addBounded(
      priorBytes,
      action.decodedPriorBytes,
      normalizedLimits.decodedPriorBytes,
      "capsule decoded prior bytes",
    );
  }
  const bytes = canonicalJsonBytes(envelope);
  if (bytes.byteLength > normalizedLimits.stateBytes) {
    throw capsuleInputValidationError("CapsuleBoundExceeded", "capsule state exceeds serialized byte bound");
  }
  if (envelope.body.state.kind === "applying") {
    let worstCaseBytes = bytes.byteLength;
    for (const action of envelope.body.state.candidate.actions) {
      if (action.observedPost === null) {
        const replacementGrowth = Math.max(0, action.maximumObservedPostBytes - 5);
        worstCaseBytes = addBounded(
          worstCaseBytes,
          replacementGrowth,
          normalizedLimits.stateBytes,
          "capsule worst-case observed-post bytes",
        );
      }
    }
  }
}

function requireLimit(value: number, label: string, maximum: number, minimum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} limit must be a safe integer from ${minimum} through protocol maximum ${maximum}`);
  }
  return value;
}

function parseStateBody(value: unknown, registry: ClosedOwnerProtocolRegistryV1): CapsuleStateBodyV1 {
  const bodyRecord = requireExactRecord(value, ["generation", "state"], "state body");
  const generation = requireGeneration(bodyRecord.generation);
  const stateRecord = bodyRecord.state;
  if (stateRecord === null || typeof stateRecord !== "object" || Array.isArray(stateRecord)) {
    throw new Error("state variant must be an object");
  }
  const kind = (stateRecord as Record<string, unknown>).kind;
  let state: CapsuleStateVariantV1;
  if (kind === "idle") {
    const record = requireExactRecord(stateRecord, ["committed", "kind"], "idle state");
    state = Object.freeze({
      kind: "idle",
      committed: record.committed === null ? null : parseCommitted(record.committed, registry),
    });
  } else if (kind === "applying") {
    const record = requireExactRecord(stateRecord, ["candidate", "kind", "prior"], "applying state");
    state = Object.freeze({
      kind: "applying",
      prior: record.prior === null ? null : parseCommitted(record.prior, registry),
      candidate: parseCandidate(record.candidate, registry),
    });
    const reconstructedPriorDigest = capsuleStateDigest({
      generation: state.candidate.priorGeneration,
      state: { kind: "idle", committed: state.prior },
    });
    if (reconstructedPriorDigest !== state.candidate.priorStateDigest) {
      throw new Error("applying candidate does not bind its exact prior idle state");
    }
    assertApplyingSequence(state.candidate.actions);
  } else if (kind === "undoing") {
    const record = requireExactRecord(
      stateRecord,
      ["committed", "kind", "outcomes", "token", "verificationFailure"],
      "undoing state",
    );
    const committed = parseCommitted(record.committed, registry);
    const outcomes = requireArray(record.outcomes, "undoing.outcomes").map(parseOutcome);
    if (outcomes.length !== committed.capsule.actions.length) {
      throw new Error("undo outcomes do not cover the committed action sequence");
    }
    assertUndoSequence(outcomes);
    const allRestored = outcomes.every((outcome) =>
      outcome.kind === "Restored" || outcome.kind === "AlreadyRestored");
    if (record.verificationFailure !== null && !allRestored) {
      throw new Error("undo final verification failure exists before replay completion");
    }
    state = Object.freeze({
      kind: "undoing",
      committed,
      token: requireToken(record.token),
      outcomes: Object.freeze(outcomes),
      verificationFailure: record.verificationFailure === null
        ? null
        : parsePersistedFailure(record.verificationFailure, "undoing.verificationFailure"),
    });
  } else {
    throw new Error("unknown capsule state variant");
  }
  return Object.freeze({ generation, state });
}

function parseCommitted(value: unknown, registry: ClosedOwnerProtocolRegistryV1): CommittedCapsuleV1 {
  const record = requireExactRecord(value, ["capsule", "capsuleDigest"], "committed capsule");
  const body = parseCapsuleIdentity(record.capsule, registry, true);
  const capsuleDigest = requireString(record.capsuleDigest, "capsuleDigest", {
    pattern: /^cc1_[a-f0-9]{64}$/,
    max: 68,
  }) as CapsuleDigest;
  if (capsuleDigest !== committedCapsuleDigest(body)) throw new Error("committed capsule digest mismatch");
  return Object.freeze({ capsuleDigest, capsule: body });
}

function parseCandidate(value: unknown, registry: ClosedOwnerProtocolRegistryV1): ApplyingCandidateV1 {
  const record = requireExactRecord(
    value,
    [
      "actions",
      "contentAuthority",
      "owner",
      "ownerProtocolVersion",
      "priorGeneration",
      "priorStateDigest",
      "targets",
      "token",
    ],
    "applying candidate",
  );
  const identity = parseIdentityFields(record, registry);
  const actions = requireArray(record.actions, "candidate.actions").map((entry, index) =>
    parsePlannedAction(entry, index, identity.owner, identity.ownerProtocolVersion, registry));
  if (actions.length === 0) throw new Error("applying candidate must contain planned actions");
  requireExactSelectedTargets(identity, actions, registry, "complete");
  return Object.freeze({
    ...identity,
    token: requireToken(record.token),
    priorGeneration: requireGeneration(record.priorGeneration, "candidate.priorGeneration"),
    priorStateDigest: requireString(record.priorStateDigest, "candidate.priorStateDigest", {
      pattern: /^cs1_[a-f0-9]{64}$/,
      max: 68,
    }) as CapsuleStateDigest,
    actions: Object.freeze(actions),
  });
}

function parseCapsuleIdentity(
  value: unknown,
  registry: ClosedOwnerProtocolRegistryV1,
  committed: true,
): CommittedCapsuleBodyV1 {
  const record = requireExactRecord(
    value,
    ["actions", "contentAuthority", "owner", "ownerProtocolVersion", "targets"],
    "committed capsule body",
  );
  const identity = parseIdentityFields(record, registry);
  const actions = requireArray(record.actions, "capsule.actions").map((entry, index) =>
    parseCommittedAction(entry, index, identity.owner, identity.ownerProtocolVersion, registry));
  if (committed && actions.length === 0) throw new Error("committed capsule has no actions");
  requireExactSelectedTargets(identity, actions, registry, "applied-prefix");
  return Object.freeze({ ...identity, actions: Object.freeze(actions) });
}

function parseIdentityFields(
  record: Record<string, unknown>,
  registry: ClosedOwnerProtocolRegistryV1,
): CapsuleIdentityV1 {
  const owner = requireOwner(record.owner);
  const ownerProtocolVersion = requireSafeInteger(record.ownerProtocolVersion, "ownerProtocolVersion", 1);
  const targets = parseTargetBindings(record.targets, "targets");
  return Object.freeze({
    owner,
    ownerProtocolVersion,
    contentAuthority: requireString(record.contentAuthority, "contentAuthority", { max: 4_096 }),
    targets,
  });
}

function requireExactSelectedTargets(
  identity: CapsuleIdentityV1,
  actions: readonly Readonly<{ action: CanonicalJsonValue; actionDigest: CapsuleActionDigest }>[],
  registry: ClosedOwnerProtocolRegistryV1,
  mode: OwnerActionSequenceModeV1,
): void {
  const parsedActions = actions.map((action, index) => registry.parseAction(
    identity.owner,
    identity.ownerProtocolVersion,
    action.action,
    action.actionDigest,
    index,
  ).action);
  registry.validateActionSequence(
    identity.owner,
    identity.ownerProtocolVersion,
    parsedActions,
    mode,
  );
  const selected = registry.selectTargetBindings(
    identity.owner,
    identity.ownerProtocolVersion,
    identity.targets,
    parsedActions,
  );
  if (
    selected.length !== identity.targets.length
    || selected.some((binding, index) => {
      const expected = identity.targets[index];
      return expected === undefined
        || binding.canonicalTarget !== expected.canonicalTarget
        || binding.authorityGeneration !== expected.authorityGeneration
        || binding.authorityDigest !== expected.authorityDigest;
    })
  ) throw new Error("capsule actions do not exhaust their exact target bindings");
}

function parsePlannedAction(
  value: unknown,
  index: number,
  owner: string,
  ownerProtocolVersion: number,
  registry: ClosedOwnerProtocolRegistryV1,
): StoredPlannedActionV1 {
  const label = `candidate.actions[${index}]`;
  const record = requireExactRecord(
    value,
    [
      "action",
      "actionDigest",
      "actionType",
      "decodedPriorBytes",
      "maximumObservedPostBytes",
      "observedPost",
      "phase",
      "relativePaths",
    ],
    label,
  );
  const parsed = registry.parseAction(owner, ownerProtocolVersion, record.action, record.actionDigest, index);
  assertStoredInspection(record, parsed.inspection, label);
  const phase = requireString(record.phase, `${label}.phase`);
  if (phase !== "planned" && phase !== "staged" && phase !== "applied") {
    throw new Error(`${label}.phase is invalid`);
  }
  let observedPost: CanonicalJsonValue | null = null;
  if (phase === "applied") {
    if (record.observedPost === null) throw new Error(`${label} applied action lacks observed post`);
    observedPost = registry.parseObservedPost(
      owner,
      ownerProtocolVersion,
      parsed.action,
      record.observedPost,
      parsed.inspection.maximumObservedPostBytes,
    ).encoded;
  } else if (record.observedPost !== null) {
    throw new Error(`${label} unapplied action carries observed post`);
  }
  return Object.freeze({
    actionDigest: parsed.actionDigest,
    actionType: parsed.inspection.actionType,
    action: parsed.encodedAction,
    relativePaths: parsed.inspection.relativePaths,
    decodedPriorBytes: parsed.inspection.decodedPriorBytes,
    maximumObservedPostBytes: parsed.inspection.maximumObservedPostBytes,
    phase,
    observedPost,
  });
}

function parseCommittedAction(
  value: unknown,
  index: number,
  owner: string,
  ownerProtocolVersion: number,
  registry: ClosedOwnerProtocolRegistryV1,
): StoredCommittedActionV1 {
  const label = `capsule.actions[${index}]`;
  const record = requireExactRecord(
    value,
    ["action", "actionDigest", "actionType", "decodedPriorBytes", "observedPost", "relativePaths"],
    label,
  );
  const parsed = registry.parseAction(owner, ownerProtocolVersion, record.action, record.actionDigest, index);
  assertStoredInspection(record, parsed.inspection, label);
  const observedPost = registry.parseObservedPost(
    owner,
    ownerProtocolVersion,
    parsed.action,
    record.observedPost,
    parsed.inspection.maximumObservedPostBytes,
  ).encoded;
  return Object.freeze({
    actionDigest: parsed.actionDigest,
    actionType: parsed.inspection.actionType,
    action: parsed.encodedAction,
    relativePaths: parsed.inspection.relativePaths,
    decodedPriorBytes: parsed.inspection.decodedPriorBytes,
    observedPost,
  });
}

function assertStoredInspection(
  record: Record<string, unknown>,
  inspection: Readonly<{
    actionType: string;
    relativePaths: readonly string[];
    decodedPriorBytes: number;
    maximumObservedPostBytes: number;
  }>,
  label: string,
): void {
  if (record.actionType !== inspection.actionType) throw new Error(`${label}.actionType mismatch`);
  if (record.decodedPriorBytes !== inspection.decodedPriorBytes) {
    throw new Error(`${label}.decodedPriorBytes mismatch`);
  }
  if (
    "maximumObservedPostBytes" in record
    && record.maximumObservedPostBytes !== inspection.maximumObservedPostBytes
  ) {
    throw new Error(`${label}.maximumObservedPostBytes mismatch`);
  }
  const paths = requireArray(record.relativePaths, `${label}.relativePaths`);
  if (
    paths.length !== inspection.relativePaths.length
    || paths.some((entry, index) => entry !== inspection.relativePaths[index])
  ) {
    throw new Error(`${label}.relativePaths mismatch`);
  }
}

function parseOutcome(value: unknown, index: number): PersistedReplayOutcomeV1 {
  const label = `undoing.outcomes[${index}]`;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "Pending" || kind === "Restored" || kind === "AlreadyRestored") {
    requireExactRecord(value, ["kind"], label);
    return Object.freeze({ kind });
  }
  if (kind === "Blocked" || kind === "Failed") {
    const record = requireExactRecord(value, ["failure", "kind"], label);
    return Object.freeze({ kind, failure: parsePersistedFailure(record.failure, `${label}.failure`) });
  }
  throw new Error(`${label}.kind is invalid`);
}

function parsePersistedFailure(value: unknown, label: string): PersistedFailureV1 {
  const record = requireExactRecord(value, ["code", "message", "path", "phase"], label);
  const code = requireString(record.code, `${label}.code`, { max: 128 });
  if (!(CAPSULE_FAILURE_CODES as readonly string[]).includes(code)) {
    throw new Error(`${label}.code is unknown`);
  }
  return Object.freeze({
    code: code as CapsuleFailureCode,
    phase: requireString(record.phase, `${label}.phase`, { max: 256 }),
    message: requireString(record.message, `${label}.message`, { max: 16_384 }),
    path: record.path === null ? null : requireString(record.path, `${label}.path`, { max: 16_384 }),
  });
}

function assertApplyingSequence(actions: readonly StoredPlannedActionV1[]): void {
  let position: "applied" | "staged-or-planned" | "planned" = "applied";
  for (const action of actions) {
    if (position === "applied") {
      if (action.phase === "applied") continue;
      if (action.phase === "staged") {
        position = "planned";
        continue;
      }
      position = "staged-or-planned";
      continue;
    }
    if (action.phase !== "planned") throw new Error("applying action phases are not a single ordered frontier");
    position = "planned";
  }
}

function assertUndoSequence(outcomes: readonly PersistedReplayOutcomeV1[]): void {
  let encounteredFrontier = false;
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    const outcome = outcomes[index]!;
    const restored = outcome.kind === "Restored" || outcome.kind === "AlreadyRestored";
    if (!encounteredFrontier && restored) continue;
    if (!encounteredFrontier) {
      encounteredFrontier = true;
      continue;
    }
    if (outcome.kind !== "Pending") {
      throw new Error("undo outcomes are not an exact reverse replay frontier");
    }
  }
}

function actionsOf(
  state: CapsuleStateVariantV1,
): readonly (StoredPlannedActionV1 | StoredCommittedActionV1)[] {
  if (state.kind === "applying") return state.candidate.actions;
  if (state.kind === "undoing") return state.committed.capsule.actions;
  return state.committed?.capsule.actions ?? [];
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

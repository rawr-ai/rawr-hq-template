import { createHash } from "node:crypto";

import {
  canonicalJsonBytes,
  capsuleStateDigest,
  committedCapsuleDigest,
  ownerActionDigest,
  parseCanonicalJsonBytes,
  type CanonicalJsonValue,
} from "./canonical";
import {
  MAX_CAPSULE_ACTIONS,
  MAX_CAPSULE_DECODED_PRIOR_BYTES,
  MAX_CAPSULE_RELATIVE_PATHS,
  MAX_CAPSULE_STATE_BYTES,
  type CapsuleGeneration,
  type CapsuleStateDigest,
  type TargetStateBindingV1,
} from "./contract";
import {
  addBounded,
  parseTargetBindings,
  requireArray,
  requireExactRecord,
  requireGeneration,
  requireRelativePath,
  requireSafeInteger,
  requireString,
} from "./validation";

const LEGACY_PROVIDER_OWNER = "agent-provider-deployment";
const LEGACY_PROVIDER_OWNER_PROTOCOL_VERSION = 1;
const LEGACY_PROVIDER_ACTION_TYPE = "ProviderMutationActionV1";
const LEGACY_PROVIDER_OBSERVATION_PROTOCOL = "agent-provider-owner-observation@v1";
const LEGACY_PROVIDER_OBSERVED_POST_MAX_BYTES = 4 * 1024 * 1024 + 64 * 1024;

export interface LegacyProviderIdleCapsuleV1 {
  readonly generation: CapsuleGeneration;
  readonly stateDigest: CapsuleStateDigest;
}

/**
 * Decodes only the persisted capsule envelope needed to retire shipped provider
 * state. Provider action meaning is deliberately opaque and never reconstructed.
 */
export function decodeLegacyProviderIdleCapsuleV1(
  bytes: Uint8Array,
): LegacyProviderIdleCapsuleV1 {
  if (bytes.byteLength > MAX_CAPSULE_STATE_BYTES) {
    throw new Error("legacy provider capsule exceeds the persisted state byte bound");
  }
  const envelope = requireExactRecord(
    parseCanonicalJsonBytes(bytes),
    ["body", "protocolVersion", "stateDigest"],
    "legacy provider state envelope",
  );
  if (envelope.protocolVersion !== 1) throw new Error("legacy provider capsule protocol is not v1");
  const body = requireExactRecord(envelope.body, ["generation", "state"], "legacy provider state body");
  const state = requireExactRecord(body.state, ["committed", "kind"], "legacy provider state");
  if (state.kind !== "idle" || state.committed === null) {
    throw new Error("legacy provider capsule is not idle with one committed provider operation");
  }
  const committed = requireExactRecord(
    state.committed,
    ["capsule", "capsuleDigest"],
    "legacy provider committed capsule",
  );
  const capsule = requireExactRecord(
    committed.capsule,
    ["actions", "contentAuthority", "owner", "ownerProtocolVersion", "targets"],
    "legacy provider committed capsule body",
  );
  if (
    capsule.owner !== LEGACY_PROVIDER_OWNER
    || capsule.ownerProtocolVersion !== LEGACY_PROVIDER_OWNER_PROTOCOL_VERSION
  ) {
    throw new Error("persisted capsule is not the retired provider owner protocol");
  }
  requireString(capsule.contentAuthority, "legacy provider content authority", { max: 4_096 });
  const targets = parseTargetBindings(capsule.targets, "legacy provider targets");
  const actions = requireArray(capsule.actions, "legacy provider actions");
  if (actions.length === 0 || actions.length > MAX_CAPSULE_ACTIONS) {
    throw new Error("legacy provider capsule action count is outside the landed bound");
  }
  validateOpaqueActions(actions, targets);

  const capsuleDigest = requireString(committed.capsuleDigest, "legacy provider capsule digest", {
    max: 68,
    pattern: /^cc1_[a-f0-9]{64}$/u,
  });
  if (capsuleDigest !== committedCapsuleDigest(capsule)) {
    throw new Error("legacy provider committed capsule digest mismatch");
  }
  const generation = requireGeneration(body.generation);
  const stateDigest = requireCapsuleStateDigest(envelope.stateDigest);
  if (stateDigest !== capsuleStateDigest(body)) {
    throw new Error("legacy provider state digest mismatch");
  }
  return Object.freeze({ generation, stateDigest });
}

function validateOpaqueActions(
  actions: readonly unknown[],
  targets: readonly TargetStateBindingV1[],
): void {
  const targetKeys = new Set(targets.map(targetBindingKey));
  const observedTargetKeys = new Set<string>();
  const relativePaths = new Set<string>();
  let decodedPriorBytes = 0;

  for (const [sequence, entry] of actions.entries()) {
    const stored = requireExactRecord(
      entry,
      ["action", "actionDigest", "actionType", "decodedPriorBytes", "observedPost", "relativePaths"],
      `legacy provider actions[${sequence}]`,
    );
    requireOpaqueAction(stored.action, sequence);
    const actionDigest = requireString(stored.actionDigest, `legacy provider actions[${sequence}].actionDigest`, {
      max: 68,
      pattern: /^ca1_[a-f0-9]{64}$/u,
    });
    const expectedActionDigest = ownerActionDigest({
      action: stored.action,
      owner: LEGACY_PROVIDER_OWNER,
      protocolVersion: LEGACY_PROVIDER_OWNER_PROTOCOL_VERSION,
      sequence,
    });
    if (actionDigest !== expectedActionDigest) {
      throw new Error(`legacy provider actions[${sequence}] digest mismatch`);
    }
    if (stored.actionType !== LEGACY_PROVIDER_ACTION_TYPE) {
      throw new Error(`legacy provider actions[${sequence}] type is not the landed provider action type`);
    }
    decodedPriorBytes = addBounded(
      decodedPriorBytes,
      requireSafeInteger(stored.decodedPriorBytes, `legacy provider actions[${sequence}].decodedPriorBytes`),
      MAX_CAPSULE_DECODED_PRIOR_BYTES,
      "legacy provider decoded prior bytes",
    );

    const opaqueActionDigest = taggedDigest("poa1_", stored.action);
    const paths = requireArray(stored.relativePaths, `legacy provider actions[${sequence}].relativePaths`);
    if (paths.length !== 1) throw new Error("landed provider actions bind exactly one private relative path");
    const relativePath = requireRelativePath(paths[0], `legacy provider actions[${sequence}].relativePaths[0]`);
    if (!new RegExp(`^targets/pt1_[a-f0-9]{64}/actions/${opaqueActionDigest}$`, "u").test(relativePath)) {
      throw new Error("legacy provider action path does not bind its opaque action digest");
    }
    relativePaths.add(relativePath);
    if (relativePaths.size > MAX_CAPSULE_RELATIVE_PATHS) {
      throw new Error("legacy provider capsule relative paths exceed the landed bound");
    }

    const observedPost = requireExactRecord(
      stored.observedPost,
      ["actionDigest", "post", "protocol", "target"],
      `legacy provider actions[${sequence}].observedPost`,
    );
    if (
      observedPost.protocol !== LEGACY_PROVIDER_OBSERVATION_PROTOCOL
      || observedPost.actionDigest !== opaqueActionDigest
    ) {
      throw new Error("legacy provider observed post does not bind its opaque action");
    }
    if (canonicalJsonBytes(observedPost).byteLength > LEGACY_PROVIDER_OBSERVED_POST_MAX_BYTES) {
      throw new Error("legacy provider observed post exceeds the landed byte bound");
    }
    const observedTarget = parseTargetBindings(
      [observedPost.target],
      `legacy provider actions[${sequence}].observedPost.target`,
    )[0];
    if (observedTarget === undefined || !targetKeys.has(targetBindingKey(observedTarget))) {
      throw new Error("legacy provider observed post selects an unbound target");
    }
    observedTargetKeys.add(targetBindingKey(observedTarget));
  }

  if (observedTargetKeys.size !== targetKeys.size) {
    throw new Error("legacy provider capsule actions do not exhaust their target bindings");
  }
}

function requireOpaqueAction(value: unknown, sequence: number): asserts value is CanonicalJsonValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`legacy provider actions[${sequence}].action is not an encoded action object`);
  }
}

function targetBindingKey(binding: TargetStateBindingV1): string {
  return `${binding.canonicalTarget}\0${binding.authorityGeneration}\0${binding.authorityDigest}`;
}

function taggedDigest(prefix: "poa1_", value: CanonicalJsonValue): string {
  return `${prefix}${createHash("sha256").update(canonicalJsonBytes(value)).digest("hex")}`;
}

function requireCapsuleStateDigest(value: unknown): CapsuleStateDigest {
  if (!isCapsuleStateDigest(value)) throw new Error("legacy provider state digest is invalid");
  return value;
}

function isCapsuleStateDigest(value: unknown): value is CapsuleStateDigest {
  return typeof value === "string" && /^cs1_[a-f0-9]{64}$/u.test(value);
}

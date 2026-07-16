import {
  canonicalJsonBytes,
  compareCanonicalText,
  ownerActionDigest,
  parseCanonicalJsonBytes,
  type CanonicalJsonValue,
} from "./canonical";
import type {
  CapsuleActionDigest,
  OwnerActionSequenceModeV1,
  OwnerActionInspectionV1,
  OwnerProtocolRegistrationV1,
  TargetStateBindingV1,
} from "./contract";
import {
  capsuleInputValidationError,
  requireOwner,
  requireRelativePath,
  requireSafeInteger,
  requireString,
  withCapsuleInputFailure,
} from "./validation";

export interface ParsedOwnerActionV1 {
  readonly action: unknown;
  readonly encodedAction: CanonicalJsonValue;
  readonly actionDigest: CapsuleActionDigest;
  readonly inspection: OwnerActionInspectionV1;
}

interface ErasedRegistration {
  readonly codec: OwnerProtocolRegistrationV1["codec"];
  readonly applyingRecovery: OwnerProtocolRegistrationV1["applyingRecovery"];
  readonly replay: OwnerProtocolRegistrationV1["replay"];
}

export class ClosedOwnerProtocolRegistryV1 {
  readonly #registrations: ReadonlyMap<string, ErasedRegistration>;

  constructor(registrations: readonly OwnerProtocolRegistrationV1[]) {
    if (registrations.length === 0) throw new Error("owner protocol registry must not be empty");
    const entries = new Map<string, ErasedRegistration>();
    for (const registration of registrations) {
      const owner = requireOwner(registration.codec.owner, "codec.owner");
      const version = requireSafeInteger(registration.codec.protocolVersion, "codec.protocolVersion", 1);
      if (
        registration.applyingRecovery.owner !== owner
        || registration.applyingRecovery.protocolVersion !== version
        || registration.replay.owner !== owner
        || registration.replay.protocolVersion !== version
      ) {
        throw new Error(`owner protocol registration does not close ${owner}@${version}`);
      }
      const key = protocolKey(owner, version);
      if (entries.has(key)) throw new Error(`duplicate owner protocol ${key}`);
      entries.set(key, Object.freeze({
        codec: registration.codec,
        applyingRecovery: registration.applyingRecovery,
        replay: registration.replay,
      }));
    }
    this.#registrations = entries;
    Object.freeze(this);
  }

  require(owner: string, protocolVersion: number): ErasedRegistration {
    const key = protocolKey(
      requireOwner(owner),
      requireSafeInteger(protocolVersion, "ownerProtocolVersion", 1),
    );
    const registration = this.#registrations.get(key);
    if (registration === undefined) {
      throw capsuleInputValidationError("UnknownOwnerProtocol", `unknown owner protocol ${key}`);
    }
    return registration;
  }

  parseAction(
    owner: string,
    protocolVersion: number,
    input: unknown,
    claimedDigest: unknown,
    sequence: number,
  ): ParsedOwnerActionV1 {
    const registration = this.require(owner, protocolVersion);
    return withCapsuleInputFailure("InvalidOwnerAction", () => {
      const parsed = registration.codec.parseAction(input);
      const encodedAction = canonicalValue(registration.codec.encodeAction(parsed));
      const actionDigest = ownerActionDigest({
        action: encodedAction,
        owner,
        protocolVersion,
        sequence,
      });
      if (claimedDigest !== actionDigest) {
        throw capsuleInputValidationError("ActionDigestMismatch", "owner action digest mismatch");
      }
      const rawInspection = registration.codec.inspectAction(parsed);
      const actionType = requireString(rawInspection.actionType, "inspection.actionType", {
        max: 128,
        pattern: /^[A-Z][A-Za-z0-9]*V[1-9][0-9]*$/,
      });
      const relativePaths = rawInspection.relativePaths.map((value, index) =>
        requireRelativePath(value, `inspection.relativePaths[${index}]`));
      const sortedPaths = [...relativePaths].sort(compareCanonicalText);
      if (relativePaths.some((value, index) => value !== sortedPaths[index])) {
        throw new Error("owner action paths must be in canonical order");
      }
      if (new Set(relativePaths).size !== relativePaths.length) {
        throw new Error("owner action paths must be distinct");
      }
      const inspection = Object.freeze({
        actionType,
        relativePaths: Object.freeze(relativePaths),
        decodedPriorBytes: requireSafeInteger(rawInspection.decodedPriorBytes, "inspection.decodedPriorBytes"),
        maximumObservedPostBytes: requireSafeInteger(
          rawInspection.maximumObservedPostBytes,
          "inspection.maximumObservedPostBytes",
          2,
        ),
      });
      return Object.freeze({ action: parsed, encodedAction, actionDigest, inspection });
    });
  }

  admitAction(
    owner: string,
    protocolVersion: number,
    input: unknown,
    sequence: number,
  ): ParsedOwnerActionV1 {
    const registration = this.require(owner, protocolVersion);
    return withCapsuleInputFailure("InvalidOwnerAction", () => {
      const parsed = registration.codec.parseAction(input);
      const encodedAction = canonicalValue(registration.codec.encodeAction(parsed));
      const digest = ownerActionDigest({ action: encodedAction, owner, protocolVersion, sequence });
      return this.parseAction(owner, protocolVersion, encodedAction, digest, sequence);
    });
  }

  validateActionSequence(
    owner: string,
    protocolVersion: number,
    actions: readonly unknown[],
    mode: OwnerActionSequenceModeV1,
  ): void {
    const registration = this.require(owner, protocolVersion);
    withCapsuleInputFailure("InvalidOwnerAction", () => {
      registration.codec.validateActionSequence({ actions, mode });
    });
  }

  parseObservedPost(
    owner: string,
    protocolVersion: number,
    action: unknown,
    input: unknown,
    maximumBytes: number,
  ): Readonly<{ parsed: unknown; encoded: CanonicalJsonValue }> {
    const registration = this.require(owner, protocolVersion);
    return withCapsuleInputFailure("InvalidObservedPost", () => {
      const parsed = registration.codec.parseObservedPost(action, input);
      const encoded = canonicalValue(registration.codec.encodeObservedPost(action, parsed));
      if (canonicalJsonBytes(encoded).byteLength > maximumBytes) {
        throw new Error("observed-post binding exceeds its preflight byte budget");
      }
      return Object.freeze({ parsed, encoded });
    });
  }

  selectTargetBindings(
    owner: string,
    protocolVersion: number,
    bindings: readonly TargetStateBindingV1[],
    actions: readonly unknown[],
  ): readonly TargetStateBindingV1[] {
    const registration = this.require(owner, protocolVersion);
    return withCapsuleInputFailure("InvalidOwnerAction", () => {
      const selected = registration.codec.selectTargetBindings({ bindings, actions });
      if (!Array.isArray(selected) || selected.length === 0) {
        throw new Error("owner action sequence must select at least one target binding");
      }
      const available = new Map(bindings.map((binding) => [targetBindingKey(binding), binding]));
      const normalized = selected.map((binding) => {
        const exact = available.get(targetBindingKey(binding));
        if (exact === undefined) throw new Error("owner selected a target outside the admitted binding set");
        return exact;
      });
      const sorted = [...normalized].sort((left, right) =>
        compareCanonicalText(left.canonicalTarget, right.canonicalTarget));
      if (
        normalized.some((binding, index) => binding !== sorted[index])
        || new Set(normalized.map(targetBindingKey)).size !== normalized.length
      ) {
        throw new Error("owner-selected target bindings must be distinct and canonically ordered");
      }
      return Object.freeze(normalized);
    });
  }
}

function protocolKey(owner: string, protocolVersion: number): string {
  return `${owner}@${protocolVersion}`;
}

function targetBindingKey(binding: TargetStateBindingV1): string {
  return `${binding.canonicalTarget}\0${binding.authorityGeneration}\0${binding.authorityDigest}`;
}

function canonicalValue(value: unknown): CanonicalJsonValue {
  return parseCanonicalJsonBytes(canonicalJsonBytes(value));
}

import {
  parseContentAuthority,
  parseGitCommitId,
  parsePluginId,
  type ContentAuthority,
  type PluginId,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";

import { canonicalDigest, compareCanonical, type CanonicalValue } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import {
  createProviderMarketplaceRegistration,
  marketplaceObservationValue,
  marketplaceState,
  marketplaceStateValue,
  sameMarketplaceState,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
  type ProviderMarketplaceState,
  type MarketplaceProjectionDigest,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import {
  PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
  parseAdapterProtocol,
  parseProjectionDigest,
  type ProviderArtifactAuthority,
  type ProviderMemberFingerprint,
  type ProviderProjectionMember,
  type ProviderSourceDigest,
  type ProviderSourceIdentity,
  type ProjectionDigest,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import {
  receiptBodyValue,
  verifyTargetReceipt,
  type TargetReceipt,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { failure, issue, success, type DeploymentResult } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import {
  createTargetIdentitySidecar,
  type NativeMemberObservation,
  type ProviderMutationAction,
  type ProviderMutationPostState,
  type ReceiptObservation,
  type TargetIdentityObservation,
  type TargetIdentitySidecar,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { parseProviderTarget, type ProviderTarget } from "@rawr/agent-plugin-lifecycle/bindings/providers";
import type { ProviderMemberRestoreContext, ProviderOwnerRuntime } from "@rawr/agent-plugin-lifecycle/ports/providers";

export type { ProviderOwnerRuntime } from "@rawr/agent-plugin-lifecycle/ports/providers";

export const PROVIDER_OWNER = "agent-provider-deployment" as const;
export const PROVIDER_OWNER_PROTOCOL_VERSION = 1 as const;
export const PROVIDER_OWNER_OBSERVATION_PROTOCOL = "agent-provider-owner-observation@v1" as const;

export interface ProviderOwnerTargetBinding {
  readonly canonicalTarget: string;
  readonly authorityGeneration: string;
  readonly authorityDigest: string;
}

interface OwnerMember {
  readonly pluginId: PluginId;
  readonly nativeIdentity: string;
  readonly artifactAuthority: ProviderArtifactAuthority;
  readonly providerSourceIdentity: ProviderSourceIdentity;
  readonly memberFingerprint: ProviderMemberFingerprint;
  readonly visibleSkills: readonly string[];
  readonly visibleHooks: readonly string[];
}

export type ProviderOwnerAction =
  | Readonly<{ kind: "AdmitTargetIdentity"; target: ProviderTarget; sidecar: TargetIdentitySidecar }>
  | Readonly<{ kind: "SetMarketplace"; role: "transition" | "final"; target: ProviderTarget; prior: ProviderMarketplaceObservation; priorRegistration: ProviderMarketplaceRegistration | null; registration: ProviderMarketplaceRegistration | null }>
  | Readonly<{ kind: "InstallMember"; target: ProviderTarget; priorMarketplace: null; activeMarketplace: ProviderMarketplaceRegistration | null; projectionDigest: ProjectionDigest; member: OwnerMember }>
  | Readonly<{ kind: "EnableMember"; target: ProviderTarget; priorMarketplace: ProviderMarketplaceRegistration | null; activeMarketplace: ProviderMarketplaceRegistration | null; priorProjectionDigest: ProjectionDigest; prior: NativeMemberObservation; member: OwnerMember }>
  | Readonly<{ kind: "RetireMember"; target: ProviderTarget; priorMarketplace: ProviderMarketplaceRegistration | null; activeMarketplace: ProviderMarketplaceRegistration | null; priorProjectionDigest: ProjectionDigest; prior: NativeMemberObservation; proof: "receipt" }>
  | Readonly<{ kind: "PublishReceipt"; target: ProviderTarget; prior: ReceiptObservation; receipt: TargetReceipt }>
  | Readonly<{ kind: "NormalizeReceipt"; target: ProviderTarget; prior: TargetReceipt; receipt: TargetReceipt }>
  | Readonly<{ kind: "RemoveReceipt"; target: ProviderTarget; prior: TargetReceipt }>;

export type ProviderOwnerPostState = ProviderMutationPostState;

export interface ProviderOwnerObservedPost {
  readonly protocol: typeof PROVIDER_OWNER_OBSERVATION_PROTOCOL;
  readonly actionDigest: string;
  readonly target: ProviderOwnerTargetBinding;
  readonly post: ProviderOwnerPostState;
}

export interface ProviderOwnerFailure {
  readonly code: "ReplayBlocked" | "ReplayFailed" | "StateInvalid";
  readonly phase: string;
  readonly message: string;
  readonly path?: string;
}

export interface ProviderOwnerProtocolRegistration {
  readonly codec: {
    readonly owner: typeof PROVIDER_OWNER;
    readonly protocolVersion: typeof PROVIDER_OWNER_PROTOCOL_VERSION;
    parseAction(value: unknown): ProviderOwnerAction;
    encodeAction(action: ProviderOwnerAction): CanonicalValue;
    inspectAction(action: ProviderOwnerAction): Readonly<{
      actionType: "ProviderMutationActionV1";
      relativePaths: readonly string[];
      decodedPriorBytes: number;
      maximumObservedPostBytes: number;
    }>;
    parseObservedPost(action: ProviderOwnerAction, value: unknown): ProviderOwnerObservedPost;
    encodeObservedPost(action: ProviderOwnerAction, observed: ProviderOwnerObservedPost): CanonicalValue;
    validateActionSequence(input: Readonly<{
      actions: readonly ProviderOwnerAction[];
      mode: "complete" | "applied-prefix";
    }>): void;
    selectTargetBindings(input: Readonly<{
      bindings: readonly ProviderOwnerTargetBinding[];
      actions: readonly ProviderOwnerAction[];
    }>): readonly ProviderOwnerTargetBinding[];
  };
  readonly applyingRecovery: {
    readonly owner: typeof PROVIDER_OWNER;
    readonly protocolVersion: typeof PROVIDER_OWNER_PROTOCOL_VERSION;
    classifyStaged(input: Readonly<{
      action: ProviderOwnerAction;
      targets: readonly ProviderOwnerTargetBinding[];
    }>): Promise<
      | Readonly<{ kind: "NotApplied" }>
      | Readonly<{ kind: "Applied"; observedPost: ProviderOwnerObservedPost }>
      | Readonly<{ kind: "Ambiguous"; failure: ProviderOwnerFailure }>
    >;
  };
  readonly replay: {
    readonly owner: typeof PROVIDER_OWNER;
    readonly protocolVersion: typeof PROVIDER_OWNER_PROTOCOL_VERSION;
    classify(input: Readonly<{
      action: ProviderOwnerAction;
      observedPost: ProviderOwnerObservedPost;
      targets: readonly ProviderOwnerTargetBinding[];
    }>): Promise<
      | Readonly<{ kind: "ExpectedPost"; observedPost: ProviderOwnerObservedPost }>
      | Readonly<{ kind: "Prior" }>
      | Readonly<{ kind: "Ambiguous"; failure: ProviderOwnerFailure }>
    >;
    restore(input: Readonly<{
      action: ProviderOwnerAction;
      observedPost: ProviderOwnerObservedPost;
      targets: readonly ProviderOwnerTargetBinding[];
    }>): Promise<
      | Readonly<{ kind: "Restored" }>
      | Readonly<{ kind: "AlreadyRestored" }>
      | Readonly<{ kind: "Blocked"; failure: ProviderOwnerFailure }>
      | Readonly<{ kind: "Failed"; failure: ProviderOwnerFailure }>
    >;
    verifyPrior(input: Readonly<{
      actions: readonly Readonly<{ action: ProviderOwnerAction; observedPost: ProviderOwnerObservedPost }>[];
      targets: readonly ProviderOwnerTargetBinding[];
    }>): Promise<Readonly<{ kind: "Verified" }> | Readonly<{ kind: "Blocked"; failure: ProviderOwnerFailure }>>;
  };
}

export function createProviderOwnerAction(action: ProviderMutationAction): ProviderOwnerAction {
  switch (action.kind) {
    case "AdmitTargetIdentity":
      return Object.freeze({ kind: action.kind, target: action.target, sidecar: action.sidecar });
    case "SetMarketplace": {
      requireRegistrationMatchesObservation(action.prior, action.priorRegistration);
      return Object.freeze({ kind: action.kind, role: action.role, target: action.target, prior: action.prior, priorRegistration: action.priorRegistration, registration: action.registration });
    }
    case "InstallMember":
      return Object.freeze({ kind: action.kind, target: action.target, priorMarketplace: action.priorMarketplace, activeMarketplace: action.activeMarketplace, projectionDigest: action.projectionDigest, member: ownerMember(action.member) });
    case "EnableMember":
      return Object.freeze({ kind: action.kind, target: action.target, priorMarketplace: action.priorMarketplace, activeMarketplace: action.activeMarketplace, priorProjectionDigest: action.priorProjectionDigest, prior: action.prior, member: ownerMember(action.member) });
    case "RetireMember":
      return Object.freeze({ kind: action.kind, target: action.target, priorMarketplace: action.priorMarketplace, activeMarketplace: action.activeMarketplace, priorProjectionDigest: action.priorProjectionDigest, prior: action.prior, proof: action.proof });
    case "PublishReceipt":
      return Object.freeze({ kind: action.kind, target: action.target, prior: action.prior, receipt: action.receipt });
    case "NormalizeReceipt":
      return Object.freeze({ kind: action.kind, target: action.target, prior: action.prior, receipt: action.receipt });
    case "RemoveReceipt":
      return Object.freeze({ kind: action.kind, target: action.target, prior: action.prior });
  }
}

export function providerOwnerActionDigest(action: ProviderOwnerAction): string {
  return canonicalDigest("poa1_", encodeAction(action));
}

export function providerOwnerTargetBinding(
  target: ProviderTarget,
  prior: ReceiptObservation,
): ProviderOwnerTargetBinding {
  return prior.kind === "absent"
    ? Object.freeze({
      canonicalTarget: target.home,
      authorityGeneration: "receipt-absent:v1",
      authorityDigest: canonicalDigest("ra1_", { targetDigest: target.targetDigest }),
    })
    : Object.freeze({
      canonicalTarget: target.home,
      authorityGeneration: `receipt-generation-${prior.receipt.body.generation}`,
      authorityDigest: prior.receipt.receiptDigest,
    });
}

export function createProviderOwnerObservedPost(
  action: ProviderOwnerAction,
  target: ProviderOwnerTargetBinding,
  post: ProviderOwnerPostState,
): ProviderOwnerObservedPost {
  assertBinding(action, target);
  if (!stateMatches(post, expectedState(action))) {
    throw new Error("Provider observed post does not match the action's exact expected state");
  }
  return Object.freeze({
    protocol: PROVIDER_OWNER_OBSERVATION_PROTOCOL,
    actionDigest: providerOwnerActionDigest(action),
    target,
    post,
  });
}

export function createExpectedProviderOwnerObservedPost(
  action: ProviderOwnerAction,
  target: ProviderOwnerTargetBinding,
): ProviderOwnerObservedPost {
  return createProviderOwnerObservedPost(action, target, expectedState(action));
}

export function createProviderOwnerProtocolRegistration(
  runtime: ProviderOwnerRuntime,
): ProviderOwnerProtocolRegistration {
  const classifyStaged: ProviderOwnerProtocolRegistration["applyingRecovery"]["classifyStaged"] = async ({ action, targets }) => {
    try {
      const binding = requireActionBinding(action, targets);
      const current = await readActionState(runtime, action);
      if (!current.ok) return ambiguous("applying-classify", current.issues[0].message);
      if (stateMatches(current.value, priorState(action))) return Object.freeze({ kind: "NotApplied" });
      if (stateMatches(current.value, expectedState(action))) {
        return Object.freeze({
          kind: "Applied",
          observedPost: createProviderOwnerObservedPost(action, binding, current.value),
        });
      }
      return ambiguous("applying-classify", "Live provider state matches neither staged prior nor expected post");
    } catch (error) {
      return ambiguous("applying-classify", errorMessage(error));
    }
  };

  const classify: ProviderOwnerProtocolRegistration["replay"]["classify"] = async ({ action, observedPost, targets }) => {
    try {
      const binding = requireActionBinding(action, targets);
      requireObservedPost(action, observedPost, binding);
      const current = await readActionState(runtime, action);
      if (!current.ok) return ambiguous("replay-classify", current.issues[0].message);
      if (stateMatches(current.value, observedPost.post)) {
        return Object.freeze({ kind: "ExpectedPost", observedPost });
      }
      if (stateMatches(current.value, priorState(action))) return Object.freeze({ kind: "Prior" });
      return ambiguous("replay-classify", "Live provider state was substituted after the recorded mutation");
    } catch (error) {
      return ambiguous("replay-classify", errorMessage(error));
    }
  };

  const restore: ProviderOwnerProtocolRegistration["replay"]["restore"] = async ({ action, observedPost, targets }) => {
    const classification = await classify({ action, observedPost, targets });
    if (classification.kind === "Prior") {
      if (!isMemberAction(action)) return Object.freeze({ kind: "AlreadyRestored" });
      const normalized = await restoreAction(runtime, action, observedPost.post);
      return normalized.ok
        ? Object.freeze({ kind: "Restored" })
        : Object.freeze({ kind: "Failed", failure: ownerFailure("ReplayFailed", "replay-restore", normalized.issues[0].message) });
    }
    if (classification.kind === "Ambiguous") return Object.freeze({ kind: "Blocked", failure: classification.failure });
    const restored = await restoreAction(runtime, action, observedPost.post);
    return restored.ok
      ? Object.freeze({ kind: "Restored" })
      : Object.freeze({ kind: "Failed", failure: ownerFailure("ReplayFailed", "replay-restore", restored.issues[0].message) });
  };

  const verifyPrior: ProviderOwnerProtocolRegistration["replay"]["verifyPrior"] = async ({ actions, targets }) => {
    try {
      validateProviderOwnerActionSequence({ actions: actions.map((entry) => entry.action), mode: "applied-prefix" });
      for (const entry of actions) {
        const binding = requireActionBinding(entry.action, targets);
        requireObservedPost(entry.action, entry.observedPost, binding);
      }
      const earliest = new Map<string, ProviderOwnerAction>();
      for (const { action } of actions) {
        if (!earliest.has(resourceKey(action))) earliest.set(resourceKey(action), action);
      }
      for (const action of earliest.values()) {
        const current = await readActionState(runtime, action);
        if (!current.ok || !stateMatches(current.value, priorState(action))) {
          return Object.freeze({ kind: "Blocked", failure: ownerFailure("ReplayBlocked", "prior-verify", current.ok ? "Restored provider state does not match its exact prior" : current.issues[0].message) });
        }
      }
      return Object.freeze({ kind: "Verified" });
    } catch (error) {
      return Object.freeze({ kind: "Blocked", failure: ownerFailure("ReplayBlocked", "prior-verify", errorMessage(error)) });
    }
  };

  return Object.freeze({
    codec: Object.freeze({
      owner: PROVIDER_OWNER,
      protocolVersion: PROVIDER_OWNER_PROTOCOL_VERSION,
      parseAction,
      encodeAction,
      inspectAction: (action: ProviderOwnerAction) => Object.freeze({
        actionType: "ProviderMutationActionV1" as const,
        relativePaths: Object.freeze([`targets/${action.target.targetDigest}/actions/${providerOwnerActionDigest(action)}`]),
        decodedPriorBytes: JSON.stringify(stateValue(priorState(action))).length,
        maximumObservedPostBytes: 4 * 1024 * 1024 + 64 * 1024,
      }),
      parseObservedPost: (action: ProviderOwnerAction, value: unknown) => parseObservedPost(action, value),
      encodeObservedPost: (_action: ProviderOwnerAction, observed: ProviderOwnerObservedPost) => observedPostValue(observed),
      validateActionSequence: validateProviderOwnerActionSequence,
      selectTargetBindings: selectProviderOwnerTargetBindings,
    }),
    applyingRecovery: Object.freeze({
      owner: PROVIDER_OWNER,
      protocolVersion: PROVIDER_OWNER_PROTOCOL_VERSION,
      classifyStaged,
    }),
    replay: Object.freeze({
      owner: PROVIDER_OWNER,
      protocolVersion: PROVIDER_OWNER_PROTOCOL_VERSION,
      classify,
      restore,
      verifyPrior,
    }),
  });
}

export function validateProviderOwnerActionSequence(input: Readonly<{
  actions: readonly ProviderOwnerAction[];
  mode: "complete" | "applied-prefix";
}>): void {
  if (input.actions.length === 0) throw new Error("Provider owner action sequence must not be empty");
  let priorTarget = "";
  let currentTarget = "";
  let currentHasReceipt = false;
  let currentTransition: Extract<ProviderOwnerAction, { kind: "SetMarketplace" }> | null = null;
  let currentHasFinalMarketplace = false;
  const seenTargets = new Set<string>();
  const digests = new Set<string>();
  for (const [index, action] of input.actions.entries()) {
    const target = action.target.targetDigest;
    const digest = providerOwnerActionDigest(action);
    if (digests.has(digest)) throw new Error("Provider owner action sequence contains a duplicate action");
    digests.add(digest);
    if (target !== currentTarget) {
      if (currentTarget !== "" && input.mode === "complete" && !currentHasReceipt) {
        throw new Error("Every complete provider target sequence must end with a receipt action");
      }
      if (currentTarget !== "" && input.mode === "complete" && currentTransition !== null && !currentHasFinalMarketplace) {
        throw new Error("Every complete marketplace transition must reach a final registration action");
      }
      if (seenTargets.has(target) || (priorTarget !== "" && compareCanonical(priorTarget, target) >= 0)) {
        throw new Error("Provider owner targets must be distinct, contiguous, and canonically ordered");
      }
      seenTargets.add(target);
      priorTarget = target;
      currentTarget = target;
      currentHasReceipt = false;
      currentTransition = null;
      currentHasFinalMarketplace = false;
    }
    if (currentHasReceipt) throw new Error("Provider receipt action must be final for its target");
    if (action.kind === "AdmitTargetIdentity" && index > 0 && input.actions[index - 1]?.target.targetDigest === target) {
      throw new Error("Target identity admission must be the first action for its target");
    }
    if (action.kind === "SetMarketplace") {
      if (action.role === "transition") {
        if (currentTransition !== null || currentHasFinalMarketplace) {
          throw new Error("Marketplace transition must be unique and precede final registration for its target");
        }
        currentTransition = action;
      } else {
        if (currentHasFinalMarketplace) {
          throw new Error("Marketplace final registration must be unique for its target");
        }
        if (currentTransition !== null && !stateMatches(priorState(action), expectedState(currentTransition))) {
          throw new Error("Marketplace final registration must continue the exact transition post-state");
        }
        currentHasFinalMarketplace = true;
      }
    }
    if (isReceiptAction(action)) currentHasReceipt = true;
  }
  if (input.mode === "complete" && !currentHasReceipt) {
    throw new Error("Every complete provider target sequence must end with a receipt action");
  }
  if (input.mode === "complete" && currentTransition !== null && !currentHasFinalMarketplace) {
    throw new Error("Every complete marketplace transition must reach a final registration action");
  }
}

export function selectProviderOwnerTargetBindings(input: Readonly<{
  bindings: readonly ProviderOwnerTargetBinding[];
  actions: readonly ProviderOwnerAction[];
}>): readonly ProviderOwnerTargetBinding[] {
  const available = new Map(input.bindings.map((binding) => [binding.canonicalTarget, binding]));
  const selected = new Map<string, ProviderOwnerTargetBinding>();
  for (const action of input.actions) {
    const binding = available.get(action.target.home);
    if (binding === undefined) throw new Error("Provider action has no admitted target binding");
    const receiptAction = isReceiptAction(action) ? action : undefined;
    if (receiptAction !== undefined) {
      const expected = providerOwnerTargetBinding(action.target, receiptPrior(receiptAction));
      if (!sameBinding(binding, expected)) throw new Error("Provider target generation/digest binding does not match the exact prior receipt");
    }
    selected.set(binding.canonicalTarget, binding);
  }
  return Object.freeze([...selected.values()].sort((left, right) => compareCanonical(left.canonicalTarget, right.canonicalTarget)));
}

function parseAction(input: unknown): ProviderOwnerAction {
  const record = requireRecord(input, "provider action");
  const kind = requireString(record.kind, "action.kind");
  const target = parseTarget(record.target);
  switch (kind) {
    case "AdmitTargetIdentity": {
      requireKeys(record, ["kind", "sidecar", "target"]);
      const sidecar = parseSidecar(record.sidecar, target);
      return Object.freeze({ kind, target, sidecar });
    }
    case "SetMarketplace": {
      requireKeys(record, ["kind", "prior", "priorRegistration", "registration", "role", "target"]);
      if (record.role !== "transition" && record.role !== "final") {
        throw new Error("Provider marketplace action role is invalid");
      }
      const prior = parseMarketplaceObservation(record.prior, target);
      const priorRegistration = parseOptionalMarketplaceRegistration(record.priorRegistration, target);
      requireRegistrationMatchesObservation(prior, priorRegistration);
      return Object.freeze({
        kind,
        role: record.role,
        target,
        prior,
        priorRegistration,
        registration: record.registration === null ? null : parseMarketplaceRegistration(record.registration, target),
      });
    }
    case "InstallMember":
      requireKeys(record, ["activeMarketplace", "kind", "member", "priorMarketplace", "projectionDigest", "target"]);
      return Object.freeze({
        kind,
        target,
        priorMarketplace: requireNull(record.priorMarketplace, "InstallMember.priorMarketplace"),
        activeMarketplace: parseOptionalMarketplaceRegistration(record.activeMarketplace, target),
        projectionDigest: parseProjection(record.projectionDigest),
        member: parseOwnerMember(record.member),
      });
    case "EnableMember":
      requireKeys(record, ["activeMarketplace", "kind", "member", "prior", "priorMarketplace", "priorProjectionDigest", "target"]);
      return Object.freeze({
        kind,
        target,
        priorMarketplace: parseOptionalMarketplaceRegistration(record.priorMarketplace, target),
        activeMarketplace: parseOptionalMarketplaceRegistration(record.activeMarketplace, target),
        priorProjectionDigest: parseProjection(record.priorProjectionDigest),
        member: parseOwnerMember(record.member),
        prior: parseNativeMember(record.prior),
      });
    case "RetireMember": {
      requireKeys(record, ["activeMarketplace", "kind", "prior", "priorMarketplace", "priorProjectionDigest", "proof", "target"]);
      if (record.proof !== "receipt") throw new Error("Provider retirement proof is invalid");
      return Object.freeze({
        kind,
        target,
        priorMarketplace: parseOptionalMarketplaceRegistration(record.priorMarketplace, target),
        activeMarketplace: parseOptionalMarketplaceRegistration(record.activeMarketplace, target),
        priorProjectionDigest: parseProjection(record.priorProjectionDigest),
        prior: parseNativeMember(record.prior),
        proof: record.proof,
      });
    }
    case "PublishReceipt":
      requireKeys(record, ["kind", "prior", "receipt", "target"]);
      return Object.freeze({ kind, target, prior: parseReceiptObservation(record.prior, target), receipt: parseReceipt(record.receipt, target) });
    case "NormalizeReceipt":
      requireKeys(record, ["kind", "prior", "receipt", "target"]);
      return Object.freeze({ kind, target, prior: parseReceipt(record.prior, target), receipt: parseReceipt(record.receipt, target) });
    case "RemoveReceipt":
      requireKeys(record, ["kind", "prior", "target"]);
      return Object.freeze({ kind, target, prior: parseReceipt(record.prior, target) });
    default:
      throw new Error(`Unsupported provider owner action: ${kind}`);
  }
}

function encodeAction(action: ProviderOwnerAction): CanonicalValue {
  const common = { kind: action.kind, target: targetValue(action.target) };
  switch (action.kind) {
    case "AdmitTargetIdentity": return { ...common, sidecar: sidecarValue(action.sidecar) };
    case "SetMarketplace": return { ...common, role: action.role, prior: marketplaceObservationValue(action.prior), priorRegistration: nullableMarketplaceRegistrationValue(action.priorRegistration), registration: nullableMarketplaceRegistrationValue(action.registration) };
    case "InstallMember": return { ...common, priorMarketplace: null, activeMarketplace: nullableMarketplaceRegistrationValue(action.activeMarketplace), projectionDigest: action.projectionDigest, member: ownerMemberValue(action.member) };
    case "EnableMember": return { ...common, priorMarketplace: nullableMarketplaceRegistrationValue(action.priorMarketplace), activeMarketplace: nullableMarketplaceRegistrationValue(action.activeMarketplace), priorProjectionDigest: action.priorProjectionDigest, prior: nativeMemberValue(action.prior), member: ownerMemberValue(action.member) };
    case "RetireMember": return { ...common, priorMarketplace: nullableMarketplaceRegistrationValue(action.priorMarketplace), activeMarketplace: nullableMarketplaceRegistrationValue(action.activeMarketplace), priorProjectionDigest: action.priorProjectionDigest, prior: nativeMemberValue(action.prior), proof: action.proof };
    case "PublishReceipt": return { ...common, prior: receiptObservationValue(action.prior), receipt: receiptValue(action.receipt) };
    case "NormalizeReceipt": return { ...common, prior: receiptValue(action.prior), receipt: receiptValue(action.receipt) };
    case "RemoveReceipt": return { ...common, prior: receiptValue(action.prior) };
  }
}

function parseObservedPost(action: ProviderOwnerAction, input: unknown): ProviderOwnerObservedPost {
  const record = requireRecord(input, "provider observed post");
  requireKeys(record, ["actionDigest", "post", "protocol", "target"]);
  if (record.protocol !== PROVIDER_OWNER_OBSERVATION_PROTOCOL) throw new Error("Provider observation protocol is invalid");
  const target = parseBinding(record.target);
  const post = parsePostState(record.post, action.target);
  const observed = Object.freeze({ protocol: PROVIDER_OWNER_OBSERVATION_PROTOCOL, actionDigest: requireString(record.actionDigest, "observation.actionDigest"), target, post });
  requireObservedPost(action, observed, target);
  return observed;
}

async function readActionState(
  runtime: ProviderOwnerRuntime,
  action: ProviderOwnerAction,
): Promise<DeploymentResult<ProviderOwnerPostState>> {
  if (action.kind === "AdmitTargetIdentity") {
    const result = await runtime.readIdentity(action.target);
    return result.ok ? success(Object.freeze({ kind: "identity", observation: result.value })) : result;
  }
  if (action.kind === "SetMarketplace") {
    const result = await runtime.readMarketplace(action.target, actionContentAuthority(action));
    return result.ok ? success(Object.freeze({ kind: "marketplace", observation: result.value })) : result;
  }
  if (isReceiptAction(action)) {
    const result = await runtime.readReceipt(action.target);
    return result.ok ? success(Object.freeze({ kind: "receipt", observation: result.value })) : result;
  }
  const result = await runtime.readMember(
    action.target,
    actionNativeIdentity(action),
    actionContentAuthority(action),
  );
  return result.ok ? success(Object.freeze({ kind: "member", member: result.value })) : result;
}

async function restoreAction(
  runtime: ProviderOwnerRuntime,
  action: ProviderOwnerAction,
  expected: ProviderOwnerPostState,
): Promise<DeploymentResult<null>> {
  const prior = priorState(action);
  if (expected.kind !== prior.kind) return failure([issue("MUTATION_FAILED", "owner.restore", "Provider owner state species changed")]);
  if (action.kind === "AdmitTargetIdentity" && expected.kind === "identity") {
    return runtime.removeIdentityExact({ target: action.target, expected: action.sidecar });
  }
  if (action.kind === "SetMarketplace" && expected.kind === "marketplace" && prior.kind === "marketplace") {
    return runtime.restoreMarketplaceExact({
      target: action.target,
      contentAuthority: actionContentAuthority(action),
      expected: expected.observation,
      prior: prior.observation,
      priorRegistration: action.priorRegistration,
    });
  }
  if (isReceiptAction(action) && expected.kind === "receipt" && prior.kind === "receipt") {
    return runtime.restoreReceiptExact({ target: action.target, expected: expected.observation, prior: prior.observation });
  }
  if (expected.kind === "member" && prior.kind === "member") {
    if (!isMemberAction(action)) {
      return failure([issue("MUTATION_FAILED", "owner.restore", "Provider member post-state has no member action")]);
    }
    return runtime.restoreMemberExact({
      context: memberRestoreContext(action),
      target: action.target,
      contentAuthority: actionContentAuthority(action),
      expected: expected.member,
      prior: prior.member,
    });
  }
  return failure([issue("MUTATION_FAILED", "owner.restore", "Provider owner action reached an invalid restore port")]);
}

function priorState(action: ProviderOwnerAction): ProviderOwnerPostState {
  switch (action.kind) {
    case "AdmitTargetIdentity": return Object.freeze({ kind: "identity", observation: Object.freeze({ kind: "absent" }) });
    case "SetMarketplace": return Object.freeze({ kind: "marketplace", observation: action.prior });
    case "InstallMember": return Object.freeze({ kind: "member", member: null });
    case "RetireMember": return Object.freeze({ kind: "member", member: action.prior });
    case "EnableMember": return Object.freeze({ kind: "member", member: action.prior });
    case "PublishReceipt": return Object.freeze({ kind: "receipt", observation: action.prior });
    case "NormalizeReceipt": return Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "present", receipt: action.prior }) });
    case "RemoveReceipt": return Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "present", receipt: action.prior }) });
  }
}

function expectedState(action: ProviderOwnerAction): ProviderOwnerPostState {
  switch (action.kind) {
    case "AdmitTargetIdentity": return Object.freeze({ kind: "identity", observation: Object.freeze({ kind: "present", sidecar: action.sidecar }) });
    case "SetMarketplace": return Object.freeze({
      kind: "marketplace",
      observation: action.registration === null
        ? Object.freeze({ kind: "absent" })
        : Object.freeze({ kind: "present", state: marketplaceState(action.registration) }),
    });
    case "InstallMember": return Object.freeze({ kind: "member", member: expectedNativeMember(action.member, "enabled") });
    case "EnableMember": return Object.freeze({ kind: "member", member: Object.freeze({ ...action.prior, enablement: "enabled" }) });
    case "RetireMember": return Object.freeze({ kind: "member", member: null });
    case "PublishReceipt":
    case "NormalizeReceipt": return Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "present", receipt: action.receipt }) });
    case "RemoveReceipt": return Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "absent" }) });
  }
}

function stateMatches(left: ProviderOwnerPostState, right: ProviderOwnerPostState): boolean {
  return JSON.stringify(stateValue(left)) === JSON.stringify(stateValue(right));
}

function stateValue(state: ProviderOwnerPostState): CanonicalValue {
  switch (state.kind) {
    case "identity": return { kind: state.kind, observation: identityObservationValue(state.observation) };
    case "marketplace": return { kind: state.kind, observation: marketplaceObservationValue(state.observation) };
    case "member": return { kind: state.kind, member: state.member === null ? null : nativeMemberValue(state.member) };
    case "receipt": return { kind: state.kind, observation: receiptObservationValue(state.observation) };
  }
}

function observedPostValue(observed: ProviderOwnerObservedPost): CanonicalValue {
  return {
    protocol: observed.protocol,
    actionDigest: observed.actionDigest,
    target: bindingValue(observed.target),
    post: stateValue(observed.post),
  };
}

function parsePostState(input: unknown, target: ProviderTarget): ProviderOwnerPostState {
  const record = requireRecord(input, "provider post state");
  const kind = requireString(record.kind, "post.kind");
  if (kind === "identity") {
    requireKeys(record, ["kind", "observation"]);
    return Object.freeze({ kind, observation: parseIdentityObservation(record.observation, target) });
  }
  if (kind === "receipt") {
    requireKeys(record, ["kind", "observation"]);
    return Object.freeze({ kind, observation: parseReceiptObservation(record.observation, target) });
  }
  if (kind === "marketplace") {
    requireKeys(record, ["kind", "observation"]);
    return Object.freeze({ kind, observation: parseMarketplaceObservation(record.observation, target) });
  }
  if (kind === "member") {
    requireKeys(record, ["kind", "member"]);
    return Object.freeze({ kind, member: record.member === null ? null : parseNativeMember(record.member) });
  }
  throw new Error("Provider post state kind is invalid");
}

function ownerMember(member: ProviderProjectionMember): OwnerMember {
  return Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: Object.freeze({ ...member.artifactAuthority }),
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    visibleSkills: Object.freeze([...member.visible.skills].sort(compareCanonical)),
    visibleHooks: Object.freeze([...member.visible.hooks].sort(compareCanonical)),
  });
}

function parseOwnerMember(input: unknown): OwnerMember {
  const record = requireRecord(input, "provider member");
  requireKeys(record, ["artifactAuthority", "memberFingerprint", "nativeIdentity", "pluginId", "providerSourceIdentity", "visibleHooks", "visibleSkills"]);
  const artifactAuthority = parseArtifactAuthority(record.artifactAuthority);
  return Object.freeze({
    pluginId: parsePlugin(record.pluginId),
    nativeIdentity: requireIdentity(record.nativeIdentity),
    artifactAuthority,
    providerSourceIdentity: parseSourceIdentity(record.providerSourceIdentity, artifactAuthority),
    memberFingerprint: parseMemberFingerprint(record.memberFingerprint),
    visibleSkills: parseNames(record.visibleSkills),
    visibleHooks: parseNames(record.visibleHooks),
  });
}

function parseNativeMember(input: unknown): NativeMemberObservation {
  const record = requireRecord(input, "native member");
  requireKeys(record, ["artifactAuthority", "enablement", "memberFingerprint", "nativeIdentity", "pluginId", "providerSourceIdentity", "visibleHooks", "visibleSkills"]);
  if (record.enablement !== "enabled" && record.enablement !== "disabled") throw new Error("Native member enablement is invalid");
  const artifactAuthority = parseArtifactAuthority(record.artifactAuthority);
  return Object.freeze({
    pluginId: parsePlugin(record.pluginId),
    nativeIdentity: requireIdentity(record.nativeIdentity),
    artifactAuthority,
    providerSourceIdentity: parseSourceIdentity(record.providerSourceIdentity, artifactAuthority),
    memberFingerprint: parseMemberFingerprint(record.memberFingerprint),
    enablement: record.enablement,
    visibleSkills: parseNames(record.visibleSkills),
    visibleHooks: parseNames(record.visibleHooks),
  });
}

function parseTarget(input: unknown): ProviderTarget {
  const record = requireRecord(input, "provider target");
  requireKeys(record, ["home", "provider", "targetDigest"]);
  const parsed = parseProviderTarget({ provider: record.provider, home: record.home });
  if (!parsed.ok || parsed.value.targetDigest !== record.targetDigest) throw new Error("Provider owner target is invalid");
  return parsed.value;
}

function parseSidecar(input: unknown, target: ProviderTarget): TargetIdentitySidecar {
  const record = requireRecord(input, "target identity sidecar");
  requireKeys(record, ["canonicalHome", "identityDigest", "provider", "schemaVersion", "targetDigest"]);
  const expected = createTargetIdentitySidecar(target);
  if (record.schemaVersion !== 1
    || record.provider !== expected.provider
    || record.canonicalHome !== expected.canonicalHome
    || record.targetDigest !== expected.targetDigest
    || record.identityDigest !== expected.identityDigest) {
    throw new Error("Provider owner sidecar does not bind its target");
  }
  return expected;
}

function parseReceipt(input: unknown, target: ProviderTarget): TargetReceipt {
  const parsed = verifyTargetReceipt(input);
  if (!parsed.ok
    || parsed.value.body.provider !== target.provider
    || parsed.value.body.targetDigest !== target.targetDigest) {
    throw new Error("Provider owner receipt is invalid or belongs to another target");
  }
  return parsed.value;
}

function parseReceiptObservation(input: unknown, target?: ProviderTarget): ReceiptObservation {
  const record = requireRecord(input, "receipt observation");
  const kind = requireString(record.kind, "receipt observation.kind");
  if (kind === "absent") {
    requireKeys(record, ["kind"]);
    return Object.freeze({ kind });
  }
  if (kind === "present" && target !== undefined) {
    requireKeys(record, ["kind", "receipt"]);
    return Object.freeze({ kind, receipt: parseReceipt(record.receipt, target) });
  }
  throw new Error("Provider receipt observation is invalid");
}

function parseIdentityObservation(input: unknown, target: ProviderTarget): TargetIdentityObservation {
  const record = requireRecord(input, "identity observation");
  const kind = requireString(record.kind, "identity observation.kind");
  if (kind === "absent") {
    requireKeys(record, ["kind"]);
    return Object.freeze({ kind });
  }
  if (kind === "present") {
    requireKeys(record, ["kind", "sidecar"]);
    return Object.freeze({ kind, sidecar: parseSidecar(record.sidecar, target) });
  }
  throw new Error("Provider identity observation is invalid");
}

function parseOptionalMarketplaceRegistration(
  input: unknown,
  target: ProviderTarget,
): ProviderMarketplaceRegistration | null {
  return input === null ? null : parseMarketplaceRegistration(input, target);
}

function parseMarketplaceRegistration(
  input: unknown,
  target: ProviderTarget,
): ProviderMarketplaceRegistration {
  const record = requireRecord(input, "marketplace registration");
  requireKeys(record, [
    "adapterProtocol",
    "marketplaceIdentity",
    "members",
    "projectionDigest",
    "provider",
    "sourceDigest",
  ]);
  if (record.provider !== target.provider) throw new Error("Marketplace registration belongs to another provider");
  const adapterProtocol = parseAdapterProtocol(record.adapterProtocol);
  const marketplaceIdentity = parseContentAuthority(record.marketplaceIdentity, "marketplace.marketplaceIdentity");
  if (!adapterProtocol.ok || !marketplaceIdentity.ok || !Array.isArray(record.members)) {
    throw new Error("Marketplace registration identity is invalid");
  }
  const members = record.members.map((entry) => {
    const member = requireRecord(entry, "marketplace member");
    requireKeys(member, [
      "memberFingerprint",
      "nativeIdentity",
      "pluginId",
      "providerSourceIdentity",
      "sourceProjectionDigest",
    ]);
    const pluginId = parsePluginId(member.pluginId, "marketplace.member.pluginId");
    const providerSourceIdentity = parseContentAuthority(
      member.providerSourceIdentity,
      "marketplace.member.providerSourceIdentity",
    );
    const sourceProjectionDigest = parseProjectionDigest(
      member.sourceProjectionDigest,
      "marketplace.member.sourceProjectionDigest",
    );
    if (
      !pluginId.ok
      || !providerSourceIdentity.ok
      || providerSourceIdentity.value !== marketplaceIdentity.value
      || !sourceProjectionDigest.ok
      || member.nativeIdentity !== `rawr:${pluginId.value}`
      || typeof member.memberFingerprint !== "string"
      || !/^pm1_[0-9a-f]{64}$/u.test(member.memberFingerprint)
    ) {
      throw new Error("Marketplace registration member is invalid");
    }
    return Object.freeze({
      pluginId: pluginId.value,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: providerSourceIdentity.value,
      sourceProjectionDigest: sourceProjectionDigest.value,
      memberFingerprint: member.memberFingerprint as ProviderMemberFingerprint,
    });
  });
  const registration = createProviderMarketplaceRegistration({
    provider: target.provider,
    adapterProtocol: adapterProtocol.value,
    marketplaceIdentity: marketplaceIdentity.value,
    members,
  });
  if (
    record.projectionDigest !== registration.projectionDigest
    || record.sourceDigest !== registration.sourceDigest
  ) {
    throw new Error("Marketplace registration digests are invalid");
  }
  return registration;
}

function parseMarketplaceObservation(
  input: unknown,
  target: ProviderTarget,
): ProviderMarketplaceObservation {
  const record = requireRecord(input, "marketplace observation");
  const kind = requireString(record.kind, "marketplace observation.kind");
  if (kind === "absent") {
    requireKeys(record, ["kind"]);
    return Object.freeze({ kind });
  }
  if (kind !== "present") throw new Error("Marketplace observation kind is invalid");
  requireKeys(record, ["kind", "state"]);
  return Object.freeze({ kind, state: parseMarketplaceState(record.state, target) });
}

function parseMarketplaceState(input: unknown, target: ProviderTarget): ProviderMarketplaceState {
  const record = requireRecord(input, "marketplace state");
  requireKeys(record, [
    "adapterProtocol",
    "marketplaceIdentity",
    "projectionDigest",
    "provider",
    "sourceDigest",
  ]);
  const adapterProtocol = parseAdapterProtocol(record.adapterProtocol);
  const marketplaceIdentity = parseContentAuthority(record.marketplaceIdentity, "marketplace.marketplaceIdentity");
  if (
    record.provider !== target.provider
    || !adapterProtocol.ok
    || !marketplaceIdentity.ok
    || typeof record.projectionDigest !== "string"
    || !/^mp1_[0-9a-f]{64}$/u.test(record.projectionDigest)
    || typeof record.sourceDigest !== "string"
    || !/^ps1_[0-9a-f]{64}$/u.test(record.sourceDigest)
  ) {
    throw new Error("Marketplace observation state is invalid");
  }
  return Object.freeze({
    provider: target.provider,
    adapterProtocol: adapterProtocol.value,
    marketplaceIdentity: marketplaceIdentity.value,
    projectionDigest: record.projectionDigest as MarketplaceProjectionDigest,
    sourceDigest: record.sourceDigest as ProviderSourceDigest,
  });
}

function requireRegistrationMatchesObservation(
  observation: ProviderMarketplaceObservation,
  registration: ProviderMarketplaceRegistration | null,
): void {
  if (observation.kind === "absent") {
    if (registration !== null) throw new Error("Absent marketplace cannot carry a prior registration");
    return;
  }
  if (registration === null || !sameMarketplaceState(observation.state, marketplaceState(registration))) {
    throw new Error("Prior marketplace registration does not match the observed state");
  }
}

function parseProjection(input: unknown): ProjectionDigest {
  const parsed = parseProjectionDigest(input, "projectionDigest");
  if (!parsed.ok) throw new Error("Provider owner projection digest is invalid");
  return parsed.value;
}

function parseBinding(input: unknown): ProviderOwnerTargetBinding {
  const record = requireRecord(input, "provider target binding");
  requireKeys(record, ["authorityDigest", "authorityGeneration", "canonicalTarget"]);
  return Object.freeze({
    canonicalTarget: requireCanonicalTarget(record.canonicalTarget),
    authorityGeneration: requireString(record.authorityGeneration, "binding.authorityGeneration"),
    authorityDigest: requireString(record.authorityDigest, "binding.authorityDigest"),
  });
}

function requireObservedPost(action: ProviderOwnerAction, observed: ProviderOwnerObservedPost, binding: ProviderOwnerTargetBinding): void {
  if (observed.protocol !== PROVIDER_OWNER_OBSERVATION_PROTOCOL
    || observed.actionDigest !== providerOwnerActionDigest(action)
    || !sameBinding(observed.target, binding)
    || !stateMatches(observed.post, expectedState(action))) {
    throw new Error("Provider observed post does not bind the exact action, target, and expected state");
  }
}

function requireActionBinding(action: ProviderOwnerAction, targets: readonly ProviderOwnerTargetBinding[]): ProviderOwnerTargetBinding {
  const selected = targets.filter((target) => target.canonicalTarget === action.target.home);
  if (selected.length !== 1) throw new Error("Provider action must select exactly one target binding");
  return selected[0]!;
}

function assertBinding(action: ProviderOwnerAction, binding: ProviderOwnerTargetBinding): void {
  if (binding.canonicalTarget !== action.target.home) throw new Error("Provider target binding belongs to another action target");
}

function expectedNativeMember(member: OwnerMember, enablement: "disabled" | "enabled"): NativeMemberObservation {
  return Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement,
    visibleSkills: member.visibleSkills,
    visibleHooks: member.visibleHooks,
  });
}

function receiptPrior(action: Extract<ProviderOwnerAction, { kind: "PublishReceipt" | "NormalizeReceipt" | "RemoveReceipt" }>): ReceiptObservation {
  return action.kind === "PublishReceipt"
    ? action.prior
    : Object.freeze({ kind: "present", receipt: action.prior });
}

function resourceKey(action: ProviderOwnerAction): string {
  if (action.kind === "AdmitTargetIdentity") return `${action.target.targetDigest}\0identity`;
  if (action.kind === "SetMarketplace") return `${action.target.targetDigest}\0marketplace`;
  if (isReceiptAction(action)) return `${action.target.targetDigest}\0receipt`;
  return `${action.target.targetDigest}\0member\0${actionNativeIdentity(action)}`;
}

function actionNativeIdentity(action: Extract<ProviderOwnerAction, { kind: "EnableMember" | "InstallMember" | "RetireMember" }>): string {
  return action.kind === "RetireMember" ? action.prior.nativeIdentity : action.member.nativeIdentity;
}

function actionContentAuthority(
  action: Extract<ProviderOwnerAction, { kind: "SetMarketplace" | "EnableMember" | "InstallMember" | "RetireMember" }>,
): ContentAuthority {
  if (action.kind === "SetMarketplace") {
    const authority = action.registration?.marketplaceIdentity
      ?? action.priorRegistration?.marketplaceIdentity;
    if (authority === undefined) {
      throw new Error("Provider marketplace action does not persist a content authority");
    }
    if (
      action.registration !== null
      && action.priorRegistration !== null
      && action.registration.marketplaceIdentity !== action.priorRegistration.marketplaceIdentity
    ) {
      throw new Error("Provider marketplace action crosses content authorities");
    }
    return authority;
  }
  return action.kind === "RetireMember"
    ? action.prior.artifactAuthority.contentAuthority
    : action.member.artifactAuthority.contentAuthority;
}

function isMemberAction(
  action: ProviderOwnerAction,
): action is Extract<ProviderOwnerAction, { kind: "EnableMember" | "InstallMember" | "RetireMember" }> {
  return action.kind === "EnableMember"
    || action.kind === "InstallMember"
    || action.kind === "RetireMember";
}

function memberRestoreContext(
  action: Extract<ProviderOwnerAction, { kind: "EnableMember" | "InstallMember" | "RetireMember" }>,
): ProviderMemberRestoreContext {
  return action.kind === "InstallMember"
    ? Object.freeze({ kind: action.kind, priorMarketplace: null, activeMarketplace: action.activeMarketplace })
    : Object.freeze({
        kind: action.kind,
        priorMarketplace: action.priorMarketplace,
        activeMarketplace: action.activeMarketplace,
        priorProjectionDigest: action.priorProjectionDigest,
      });
}

function isReceiptAction(action: ProviderOwnerAction): action is Extract<ProviderOwnerAction, { kind: "PublishReceipt" | "NormalizeReceipt" | "RemoveReceipt" }> {
  return action.kind === "PublishReceipt" || action.kind === "NormalizeReceipt" || action.kind === "RemoveReceipt";
}

function nullableMarketplaceRegistrationValue(
  registration: ProviderMarketplaceRegistration | null,
): CanonicalValue {
  return registration === null ? null : marketplaceRegistrationValue(registration);
}

function marketplaceRegistrationValue(
  registration: ProviderMarketplaceRegistration,
): CanonicalValue {
  return {
    provider: registration.provider,
    adapterProtocol: registration.adapterProtocol,
    marketplaceIdentity: registration.marketplaceIdentity,
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
    members: registration.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: member.sourceProjectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  };
}

function ownerMemberValue(member: OwnerMember): CanonicalValue {
  return {
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: artifactAuthorityValue(member.artifactAuthority),
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    visibleSkills: member.visibleSkills,
    visibleHooks: member.visibleHooks,
  };
}

function nativeMemberValue(member: NativeMemberObservation): CanonicalValue {
  return {
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: artifactAuthorityValue(member.artifactAuthority),
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    visibleSkills: member.visibleSkills,
    visibleHooks: member.visibleHooks,
    enablement: member.enablement,
  };
}

function artifactAuthorityValue(authority: ProviderArtifactAuthority): CanonicalValue {
  return {
    protocol: authority.protocol,
    contentAuthority: authority.contentAuthority,
    sourceCommit: authority.sourceCommit,
  };
}

function parseArtifactAuthority(input: unknown): ProviderArtifactAuthority {
  const record = requireRecord(input, "provider artifact authority");
  requireKeys(record, ["contentAuthority", "protocol", "sourceCommit"]);
  const contentAuthority = parseContentAuthority(record.contentAuthority, "artifactAuthority.contentAuthority");
  const sourceCommit = parseGitCommitId(record.sourceCommit, "artifactAuthority.sourceCommit");
  if (record.protocol !== PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL || !contentAuthority.ok || !sourceCommit.ok) {
    throw new Error("Provider artifact authority is invalid");
  }
  return Object.freeze({
    protocol: PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
    contentAuthority: contentAuthority.value,
    sourceCommit: sourceCommit.value,
  });
}

function parseSourceIdentity(input: unknown, authority: ProviderArtifactAuthority): ProviderSourceIdentity {
  const parsed = parseContentAuthority(input, "providerSourceIdentity");
  if (!parsed.ok || parsed.value !== authority.contentAuthority) {
    throw new Error("Provider source identity must equal artifact content authority");
  }
  return parsed.value;
}

function targetValue(target: ProviderTarget): CanonicalValue {
  return { provider: target.provider, home: target.home, targetDigest: target.targetDigest };
}

function sidecarValue(sidecar: TargetIdentitySidecar): CanonicalValue {
  return { schemaVersion: sidecar.schemaVersion, provider: sidecar.provider, canonicalHome: sidecar.canonicalHome, targetDigest: sidecar.targetDigest, identityDigest: sidecar.identityDigest };
}

function receiptValue(receipt: TargetReceipt): CanonicalValue {
  return {
    schemaVersion: receipt.schemaVersion,
    receiptDigest: receipt.receiptDigest,
    body: receiptBodyValue(receipt.body),
  };
}

function receiptObservationValue(observation: ReceiptObservation): CanonicalValue {
  return observation.kind === "absent" ? { kind: "absent" } : { kind: "present", receipt: receiptValue(observation.receipt) };
}

function identityObservationValue(observation: TargetIdentityObservation): CanonicalValue {
  return observation.kind === "absent" ? { kind: "absent" } : { kind: "present", sidecar: sidecarValue(observation.sidecar) };
}

function bindingValue(binding: ProviderOwnerTargetBinding): CanonicalValue {
  return { canonicalTarget: binding.canonicalTarget, authorityGeneration: binding.authorityGeneration, authorityDigest: binding.authorityDigest };
}

function parsePlugin(input: unknown): PluginId {
  const parsed = parsePluginId(input, "action.member.pluginId");
  if (!parsed.ok) throw new Error("Provider owner plugin ID is invalid");
  return parsed.value;
}

function parseMemberFingerprint(input: unknown): ProviderMemberFingerprint {
  const value = requireString(input, "member.memberFingerprint");
  if (!/^pm1_[0-9a-f]{64}$/u.test(value)) throw new Error("Provider member fingerprint is invalid");
  return value as ProviderMemberFingerprint;
}

function parseNames(input: unknown): readonly string[] {
  if (!Array.isArray(input) || input.some((value) => typeof value !== "string")) throw new Error("Provider visible names must be strings");
  const names = [...new Set(input)].sort(compareCanonical);
  if (names.length !== input.length || names.some((value, index) => value !== input[index])) throw new Error("Provider visible names must be distinct and canonical");
  return Object.freeze(names);
}

function requireIdentity(input: unknown): string {
  const value = requireString(input, "member.nativeIdentity");
  if (!/^[a-z0-9][a-z0-9@._:/-]*$/u.test(value)) throw new Error("Provider native identity is invalid");
  return value;
}

function requireCanonicalTarget(input: unknown): string {
  const value = requireString(input, "canonicalTarget");
  if (
    !value.startsWith("/")
    || value === "/"
    || value.endsWith("/")
    || value.includes("//")
    || value.includes("/../")
    || value.includes("/./")
    || value.endsWith("/..")
    || value.endsWith("/.")
  ) throw new Error("Provider canonical target is invalid");
  return value;
}

function requireRecord(input: unknown, label: string): Record<string, unknown> {
  if (!isRecord(input)) throw new Error(`${label} must be an object`);
  return input;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}

function requireKeys(record: Record<string, unknown>, keys: readonly string[]): void {
  const actual = Object.keys(record).sort(compareCanonical);
  const expected = [...keys].sort(compareCanonical);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error("Provider owner record contains missing or unknown fields");
}

function requireString(input: unknown, label: string): string {
  if (typeof input !== "string" || input.length === 0 || input.length > 4096) throw new Error(`${label} must be a bounded string`);
  return input;
}

function requireNull(input: unknown, label: string): null {
  if (input !== null) throw new Error(`${label} must be null`);
  return null;
}

function sameBinding(left: ProviderOwnerTargetBinding, right: ProviderOwnerTargetBinding): boolean {
  return left.canonicalTarget === right.canonicalTarget
    && left.authorityGeneration === right.authorityGeneration
    && left.authorityDigest === right.authorityDigest;
}

function ambiguous(phase: string, message: string) {
  return Object.freeze({ kind: "Ambiguous" as const, failure: ownerFailure("ReplayBlocked", phase, message) });
}

function ownerFailure(code: ProviderOwnerFailure["code"], phase: string, message: string): ProviderOwnerFailure {
  return Object.freeze({ code, phase, message });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

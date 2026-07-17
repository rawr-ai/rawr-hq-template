import type { ContentAuthority } from "@rawr/agent-plugin-lifecycle/release";
import {
  failure,
  issue,
  success,
  type ProviderTargetPlan,
  type ProviderUndoCandidate,
  type ProviderUndoSession,
  type ProviderUndoWriter,
  type ReceiptObservation,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";

import type {
  CapsuleActionHandle,
  CapsuleApplyingSessionV1,
  CapsuleUndoWriterV1,
} from "../../undo/contract";
import {
  createProviderOwnerAction,
  createProviderOwnerObservedPost,
  providerOwnerActionDigest,
  providerOwnerTargetBinding,
  PROVIDER_OWNER,
  PROVIDER_OWNER_PROTOCOL_VERSION,
  type ProviderOwnerAction,
  type ProviderOwnerTargetBinding,
} from "./owner-protocol";

export function createProviderUndoWriterV1(controller: CapsuleUndoWriterV1): ProviderUndoWriter {
  const writer: ProviderUndoWriter = {
    async preflight(candidate: ProviderUndoCandidate) {
      try {
        const admitted = capsuleCandidate(candidate);
        return capsuleResult(await controller.preflight(admitted.input));
      } catch (error) {
        return capsuleFailure("preflight", error);
      }
    },
    async begin(candidate: ProviderUndoCandidate) {
      let admitted: ReturnType<typeof capsuleCandidate>;
      try {
        admitted = capsuleCandidate(candidate);
      } catch (error) {
        return capsuleFailure("begin", error);
      }
      const begun = await controller.begin(admitted.input);
      if (begun.kind !== "Accepted") return capsuleRejection(begun);
      if (begun.admittedActions.length !== admitted.actions.length) {
        return capsuleFailure("begin", new Error("Capsule admitted an incomplete provider action sequence"));
      }
      const handles = new Map<string, CapsuleActionHandle>();
      for (const [index, admittedAction] of begun.admittedActions.entries()) {
        const action = admitted.actions[index];
        if (action === undefined) {
          return capsuleFailure("begin", new Error("Capsule admitted an unexpected provider action"));
        }
        handles.set(providerOwnerActionDigest(action), admittedAction.actionHandle);
      }
      return success(createSession(begun.session, admitted.bindings, handles));
    },
  };
  return Object.freeze(writer);
}

function capsuleCandidate(candidate: ProviderUndoCandidate) {
  const actions = candidate.plans.flatMap((plan) => plan.steps.flatMap((step) =>
    step.kind === "mutate" ? [createProviderOwnerAction(step.action)] : []));
  if (actions.length === 0) throw new Error("Provider capsule candidate has no mutating actions");
  const authorities = new Set(candidate.plans.map(planContentAuthority));
  if (authorities.size !== 1) throw new Error("Provider capsule candidate crosses content authorities");
  const bindings = new Map<string, ProviderOwnerTargetBinding>();
  for (const plan of candidate.plans) {
    bindings.set(
      plan.target.targetDigest,
      providerOwnerTargetBinding(plan.target, planPriorReceipt(plan)),
    );
  }
  return Object.freeze({
    input: Object.freeze({
      owner: PROVIDER_OWNER,
      ownerProtocolVersion: PROVIDER_OWNER_PROTOCOL_VERSION,
      contentAuthority: [...authorities][0]!,
      targets: Object.freeze([...bindings.values()]),
      actions: Object.freeze(actions.map((action) => Object.freeze({ action }))),
    }),
    bindings,
    actions: Object.freeze(actions),
  });
}

function createSession(
  session: CapsuleApplyingSessionV1,
  bindings: ReadonlyMap<string, ProviderOwnerTargetBinding>,
  handles: ReadonlyMap<string, CapsuleActionHandle>,
): ProviderUndoSession {
  let staged: Readonly<{ action: ProviderOwnerAction; handle: CapsuleActionHandle }> | null = null;
  let appliedCount = 0;
  const providerSession: ProviderUndoSession = {
    async stage(action: Parameters<ProviderUndoSession["stage"]>[0]) {
      if (staged !== null) return capsuleFailure("stage", new Error("Another provider action is already staged"));
      const ownerAction = createProviderOwnerAction(action);
      const handle = handles.get(providerOwnerActionDigest(ownerAction));
      if (handle === undefined) return capsuleFailure("stage", new Error("Provider action was not admitted"));
      const result = await session.stage({ actionHandle: handle });
      if (result.kind !== "Accepted") return capsuleResult(result);
      staged = Object.freeze({ action: ownerAction, handle });
      return success(null);
    },
    async applied(observation: Parameters<ProviderUndoSession["applied"]>[0]) {
      if (staged === null) return capsuleFailure("applied", new Error("Provider action was not staged"));
      const ownerAction = createProviderOwnerAction(observation.action);
      if (providerOwnerActionDigest(ownerAction) !== providerOwnerActionDigest(staged.action)) {
        return capsuleFailure("applied", new Error("Provider applied observation does not match the staged action"));
      }
      const binding = bindings.get(ownerAction.target.targetDigest);
      if (binding === undefined) return capsuleFailure("applied", new Error("Provider target binding is missing"));
      let observedPost;
      try {
        observedPost = createProviderOwnerObservedPost(ownerAction, binding, observation.post);
      } catch (error) {
        return capsuleFailure("applied", error);
      }
      const result = await session.markApplied({ actionHandle: staged.handle, observedPost });
      if (result.kind !== "Accepted") return capsuleResult(result);
      staged = null;
      appliedCount += 1;
      return success(null);
    },
    async fail(_issues: Parameters<ProviderUndoSession["fail"]>[0]) {
      if (staged !== null) {
        const discarded = await session.discardStaged({ actionHandle: staged.handle });
        if (discarded.kind !== "Accepted") return capsuleResult(discarded);
        staged = null;
      }
      return capsuleResult(appliedCount === 0 ? await session.abort() : await session.settle());
    },
    async settle() {
      if (staged !== null) return capsuleFailure("settle", new Error("Provider action remains staged"));
      return capsuleResult(await session.settle());
    },
  };
  return Object.freeze(providerSession);
}

function planPriorReceipt(plan: ProviderTargetPlan): ReceiptObservation {
  for (const step of plan.steps) {
    if (step.kind !== "mutate") continue;
    if (step.action.kind === "PublishReceipt") return step.action.prior;
    if (step.action.kind === "NormalizeReceipt" || step.action.kind === "RemoveReceipt") {
      return Object.freeze({ kind: "present", receipt: step.action.prior });
    }
  }
  throw new Error("Provider mutating plan has no receipt authority binding");
}

function planContentAuthority(plan: ProviderTargetPlan): ContentAuthority {
  if (plan.projection !== null) return plan.projection.artifactAuthority.contentAuthority;
  for (const step of plan.steps) {
    if (step.kind !== "mutate") continue;
    const action = step.action;
    if (action.kind === "RetireMember") return action.prior.artifactAuthority.contentAuthority;
    if (action.kind === "EnableMember" || action.kind === "InstallMember") {
      return action.member.artifactAuthority.contentAuthority;
    }
    if (action.kind === "SetMarketplace") {
      const authority = action.registration?.marketplaceIdentity
        ?? action.priorRegistration?.marketplaceIdentity;
      if (authority !== undefined) return authority;
    }
  }
  throw new Error("Provider mutating plan has no persisted content authority");
}

function capsuleResult(result: Readonly<{ kind: string; failure?: Readonly<{ message: string }> }>) {
  return result.kind === "Accepted"
    ? success(null)
    : failure([issue(
        "CAPSULE_FAILED",
        "capsule",
        result.failure?.message ?? `Capsule transition ${result.kind}`,
      )]);
}

function capsuleRejection(result: Readonly<{ kind: string; failure?: Readonly<{ message: string }> }>) {
  return failure([issue(
    "CAPSULE_FAILED",
    "capsule",
    result.failure?.message ?? `Capsule transition ${result.kind}`,
  )]);
}

function capsuleFailure(phase: string, error: unknown) {
  return failure([issue(
    "CAPSULE_FAILED",
    `capsule.${phase}`,
    error instanceof Error ? error.message : String(error),
  )]);
}

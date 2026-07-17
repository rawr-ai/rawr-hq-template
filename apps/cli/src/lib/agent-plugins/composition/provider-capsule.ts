import type {
  DeploymentResult,
  ProviderCapsuleCandidate,
  ProviderCapsuleSession,
  ProviderCapsuleWriter,
  ProviderDeploymentIssue,
  ProviderArtifactAuthority,
  ProviderMutationAction,
  ProviderSourceIdentity,
  ProviderTargetPlan,
  ReceiptObservation,
} from "@rawr/agent-provider-deployment";
import {
  PROVIDER_OWNER,
  PROVIDER_OWNER_PROTOCOL_VERSION,
  createProviderOwnerObservedPost,
  createProviderOwnerAction,
  createProviderOwnerProtocolRegistration,
  providerOwnerActionDigest,
  providerOwnerTargetBinding,
  selectProviderOwnerTargetBindings,
  type ProviderOwnerAction,
  type ProviderOwnerFailure,
  type ProviderOwnerObservedPost,
  type ProviderOwnerRuntime,
  type ProviderOwnerTargetBinding,
  validateProviderOwnerActionSequence,
} from "@rawr/agent-provider-deployment/owner-protocol";

import type {
  CapsuleApplyingSessionV1,
  CapsuleActionHandle,
  CapsuleFailure,
  CapsuleTerminalWriteResult,
  CapsuleUndoWriterV1,
  OwnerProtocolRegistrationV1,
} from "../undo/contract";
import { eraseOwnerProtocolRegistrationV1 } from "../undo/protocol-registry";

export function createProviderOwnerProtocolRegistrationV1(
  runtime: ProviderOwnerRuntime,
): OwnerProtocolRegistrationV1 {
  const source = createProviderOwnerProtocolRegistration(runtime);
  const registration: OwnerProtocolRegistrationV1<ProviderOwnerAction, ProviderOwnerObservedPost> = {
    codec: {
      ...source.codec,
      selectTargetBindings: ({ bindings, actions }) =>
        source.codec.selectTargetBindings({ bindings, actions }),
    },
    applyingRecovery: {
      owner: source.applyingRecovery.owner,
      protocolVersion: source.applyingRecovery.protocolVersion,
      async classifyStaged(input) {
        const result = await source.applyingRecovery.classifyStaged(input);
        return result.kind === "Ambiguous"
          ? Object.freeze({ kind: "Ambiguous" as const, failure: capsuleFailure(result.failure) })
          : result;
      },
    },
    replay: {
      owner: source.replay.owner,
      protocolVersion: source.replay.protocolVersion,
      async classify(input) {
        const result = await source.replay.classify(input);
        return result.kind === "Ambiguous"
          ? Object.freeze({ kind: "Ambiguous" as const, failure: capsuleFailure(result.failure) })
          : result;
      },
      async restore(input) {
        const result = await source.replay.restore(input);
        return result.kind === "Blocked" || result.kind === "Failed"
          ? Object.freeze({ ...result, failure: capsuleFailure(result.failure) })
          : result;
      },
      async verifyPrior(input) {
        const result = await source.replay.verifyPrior(input);
        return result.kind === "Blocked"
          ? Object.freeze({ kind: "Blocked" as const, failure: capsuleFailure(result.failure) })
          : result;
      },
    },
  };
  return eraseOwnerProtocolRegistrationV1(registration);
}

export function createControllerProviderCapsuleWriter(
  controller: CapsuleUndoWriterV1,
  contentAuthority: string,
): ProviderCapsuleWriter {
  const writer: ProviderCapsuleWriter = {
    async preflight(candidate) {
      const prepared = prepareCandidate(candidate, contentAuthority);
      if (!prepared.ok) return prepared;
      const result = await controller.preflight(prepared.value.input);
      return result.kind === "Accepted"
        ? success(null)
        : deploymentFailure(result.failure);
    },
    async begin(candidate) {
      const prepared = prepareCandidate(candidate, contentAuthority);
      if (!prepared.ok) return prepared;
      const result = await controller.begin(prepared.value.input);
      if (result.kind !== "Accepted") return deploymentFailure(result.failure);
      if (result.admittedActions.length !== prepared.value.actions.length) {
        return providerFailure("Controller admitted a different provider action count");
      }
      return success(createSession(
        result.session,
        prepared.value.actions,
        prepared.value.bindings,
        result.admittedActions.map((entry) => entry.actionHandle),
      ));
    },
  };
  return Object.freeze(writer);
}

interface PreparedCandidate {
  readonly input: Parameters<CapsuleUndoWriterV1["begin"]>[0];
  readonly actions: readonly ProviderOwnerAction[];
  readonly bindings: readonly ProviderOwnerTargetBinding[];
}

function prepareCandidate(
  candidate: ProviderCapsuleCandidate,
  contentAuthority: string,
): DeploymentResult<PreparedCandidate> {
  try {
    if (candidate.protocol !== "agent-provider-deployment@v1") {
      return providerFailure("Provider capsule candidate uses an unsupported protocol");
    }
    const bindings: ProviderOwnerTargetBinding[] = [];
    const actions: ProviderOwnerAction[] = [];
    for (const plan of candidate.plans) {
      const planActions = mutationActions(plan);
      if (plan.state !== "mutating" || planActions.length === 0) {
        return providerFailure("Provider capsule candidates may contain only nonempty mutating plans");
      }
      const prior = priorReceipt(planActions);
      requireContentAuthority(plan, planActions, contentAuthority);
      bindings.push(providerOwnerTargetBinding(plan.target, prior));
      actions.push(...planActions.map(createProviderOwnerAction));
    }
    validateProviderOwnerActionSequence({ actions, mode: "complete" });
    const selected = selectProviderOwnerTargetBindings({ bindings, actions });
    return success(Object.freeze({
      actions: Object.freeze(actions),
      bindings: selected,
      input: Object.freeze({
        owner: PROVIDER_OWNER,
        ownerProtocolVersion: PROVIDER_OWNER_PROTOCOL_VERSION,
        contentAuthority,
        targets: selected,
        actions: Object.freeze(actions.map((action) => Object.freeze({ action }))),
      }),
    }));
  } catch (error) {
    return providerFailure(errorMessage(error));
  }
}

function requireContentAuthority(
  plan: ProviderTargetPlan,
  actions: readonly ProviderMutationAction[],
  expected: string,
): void {
  const claims: Array<Readonly<{
    artifactAuthority: ProviderArtifactAuthority;
    providerSourceIdentity: ProviderSourceIdentity;
  }>> = [];
  if (plan.projection !== null) {
    for (const member of plan.projection.members) claims.push(member);
    if (plan.projection.artifactAuthority.contentAuthority !== expected) {
      throw new Error("Provider projection belongs to another content authority");
    }
  }
  for (const action of actions) {
    switch (action.kind) {
      case "AdmitTargetIdentity":
        break;
      case "InstallMember":
        claims.push(action.member);
        break;
      case "EnableMember":
        claims.push(action.prior, action.member);
        break;
      case "RetireMember":
        claims.push(action.prior);
        break;
      case "PublishReceipt":
        if (action.prior.kind === "present") claims.push(...receiptClaims(action.prior.receipt));
        claims.push(...receiptClaims(action.receipt));
        break;
      case "NormalizeReceipt":
        claims.push(...receiptClaims(action.prior), ...receiptClaims(action.receipt));
        break;
      case "RemoveReceipt":
        claims.push(...receiptClaims(action.prior));
        break;
    }
  }
  if (claims.length === 0) throw new Error("Provider capsule candidate has no artifact authority claim");
  for (const claim of claims) {
    if (claim.artifactAuthority.contentAuthority !== expected
      || claim.providerSourceIdentity !== claim.artifactAuthority.contentAuthority) {
      throw new Error("Provider capsule candidate belongs to another content authority");
    }
  }
}

function receiptClaims(receipt: Extract<ReceiptObservation, { kind: "present" }>["receipt"]) {
  return [...receipt.body.managedMembers, ...receipt.body.scope.verifiedMembers];
}

function createSession(
  controller: CapsuleApplyingSessionV1,
  actions: readonly ProviderOwnerAction[],
  bindings: readonly ProviderOwnerTargetBinding[],
  handles: readonly CapsuleActionHandle[],
): ProviderCapsuleSession {
  const actionIndexes = new Map(actions.map((action, index) => [providerOwnerActionDigest(action), index]));
  let stagedIndex: number | null = null;
  let appliedCount = 0;
  let closed = false;

  const session: ProviderCapsuleSession = {
    async stage(action: ProviderMutationAction) {
      if (closed || stagedIndex !== null) return providerFailure("Provider capsule session cannot stage another action");
      const ownerAction = createProviderOwnerAction(action);
      const index = actionIndexes.get(providerOwnerActionDigest(ownerAction));
      if (index === undefined || index !== appliedCount) {
        return providerFailure("Provider action is not the next admitted capsule action");
      }
      const handle = handles[index];
      if (handle === undefined) return providerFailure("Provider action has no admitted capsule handle");
      const result = await controller.stage({ actionHandle: handle });
      if (result.kind !== "Accepted") return deploymentFailure(result.failure);
      stagedIndex = index;
      return success(null);
    },
    async applied(observation) {
      if (closed || stagedIndex === null) return providerFailure("Provider capsule has no staged action to record");
      const ownerAction = createProviderOwnerAction(observation.action);
      const index = actionIndexes.get(providerOwnerActionDigest(ownerAction));
      if (index !== stagedIndex) {
        return providerFailure("Provider applied observation does not bind the staged action");
      }
      const binding = bindings.find((entry) => entry.canonicalTarget === ownerAction.target.targetDigest);
      const handle = handles[index];
      if (binding === undefined || handle === undefined) {
        return providerFailure("Provider applied observation has no exact target binding");
      }
      let observedPost: ProviderOwnerObservedPost;
      try {
        observedPost = createProviderOwnerObservedPost(ownerAction, binding, observation.post);
      } catch (error) {
        return providerFailure(errorMessage(error));
      }
      const result = await controller.markApplied({
        actionHandle: handle,
        observedPost,
      });
      if (result.kind !== "Accepted") return deploymentFailure(result.failure);
      stagedIndex = null;
      appliedCount += 1;
      return success(null);
    },
    async fail(_issues) {
      if (closed) return providerFailure("Provider capsule session is closed");
      closed = true;
      if (stagedIndex !== null) {
        const result = await controller.suspend();
        return result.kind === "Released" ? success(null) : deploymentFailure(result.failure);
      }
      return terminalResult(appliedCount === 0 ? await controller.abort() : await controller.settle());
    },
    async settle() {
      if (closed || stagedIndex !== null || appliedCount !== actions.length) {
        return providerFailure("Provider capsule cannot settle before every admitted action is recorded");
      }
      closed = true;
      return terminalResult(await controller.settle());
    },
  };
  return Object.freeze(session);
}

function mutationActions(plan: ProviderTargetPlan): readonly ProviderMutationAction[] {
  return plan.steps.flatMap((step) => step.kind === "mutate" ? [step.action] : []);
}

function priorReceipt(actions: readonly ProviderMutationAction[]): ReceiptObservation {
  const receipt = [...actions].reverse().find((action) =>
    action.kind === "PublishReceipt"
    || action.kind === "NormalizeReceipt"
    || action.kind === "RemoveReceipt");
  if (receipt === undefined) throw new Error("Provider target plan has no final receipt action");
  return receipt.kind === "PublishReceipt"
    ? receipt.prior
    : Object.freeze({ kind: "present", receipt: receipt.prior });
}

function terminalResult(result: CapsuleTerminalWriteResult): DeploymentResult<null> {
  if (result.kind !== "Accepted") return deploymentFailure(result.failure);
  return result.synchronization.kind === "Released"
    ? success(null)
    : deploymentFailure(result.synchronization.failure);
}

function capsuleFailure(failure: ProviderOwnerFailure): CapsuleFailure {
  return Object.freeze({
    code: failure.code,
    phase: `provider:${failure.phase}`,
    message: failure.message,
    ...(failure.path === undefined ? {} : { path: failure.path }),
  });
}

function deploymentFailure<T>(failure: CapsuleFailure): DeploymentResult<T> {
  return providerFailure(`${failure.phase}: ${failure.message}`);
}

function providerFailure<T>(message: string): DeploymentResult<T> {
  const issue: ProviderDeploymentIssue = Object.freeze({
    code: "CAPSULE_FAILED",
    path: "capsule",
    message,
    expected: "",
    actual: "",
  });
  const issues: readonly [ProviderDeploymentIssue] = Object.freeze([issue]);
  return Object.freeze({ ok: false, issues });
}

function success<T>(value: T): DeploymentResult<T> {
  return Object.freeze({ ok: true, value });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import { type Static, type TSchema } from "typebox";
import { Clone, Parse } from "typebox/value";

import type {
  CanonicalStatusOutcome,
  CanonicalSyncOutcome,
  CompleteTestProviderOperationOutcome,
  ProviderEvent,
  TargetedTestProviderOperationOutcome,
} from "../model/dto/outcome";
import type { DeploymentResult } from "../model/errors/deployment-result";
import type {
  AgentProviderProjection,
  ProviderPackageFile,
  ProviderProjectionMember,
} from "../model/policy/projection";
import type {
  ProviderMutationAction,
  ProviderPlanStep,
  ProviderTargetPlan,
} from "../model/policy/state-machine";
import {
  type CanonicalStatusProcedureResult,
  CanonicalStatusResultSchema,
  type CanonicalSyncProcedureResult,
  CanonicalSyncResultSchema,
  type CompleteTestProcedureResult,
  CompleteTestResultSchema,
  type TargetedTestProcedureResult,
  TargetedTestResultSchema,
} from "../schemas";

export async function completeTestOperationResult(
  operation: Promise<DeploymentResult<CompleteTestProviderOperationOutcome>>,
): Promise<CompleteTestProcedureResult> {
  const result = await operation;
  return projectProcedureResult(
    CompleteTestResultSchema,
    result.ok
      ? { ok: true, value: projectCompleteTestOutcome(result.value) }
      : result,
  );
}

export async function targetedTestOperationResult(
  operation: Promise<DeploymentResult<TargetedTestProviderOperationOutcome>>,
): Promise<TargetedTestProcedureResult> {
  const result = await operation;
  return projectProcedureResult(
    TargetedTestResultSchema,
    result.ok
      ? { ok: true, value: projectTargetedTestOutcome(result.value) }
      : result,
  );
}

export async function canonicalStatusResult(
  operation: Promise<DeploymentResult<readonly CanonicalStatusOutcome[]>>,
): Promise<CanonicalStatusProcedureResult> {
  return projectProcedureResult(CanonicalStatusResultSchema, await operation);
}

export async function canonicalSyncResult(
  operation: Promise<DeploymentResult<CanonicalSyncOutcome>>,
): Promise<CanonicalSyncProcedureResult> {
  return projectProcedureResult(CanonicalSyncResultSchema, await operation);
}

function projectProcedureResult<const TBoundary extends TSchema>(
  boundary: TBoundary,
  result: unknown,
): Static<TBoundary> {
  // Parse returns an already-valid input unchanged, so clone first to sever domain aliases.
  return Parse(boundary, Clone(result));
}

function projectCompleteTestOutcome(
  outcome: CompleteTestProviderOperationOutcome,
) {
  return {
    ...outcome,
    targets: outcome.targets.map(projectProviderTarget),
  };
}

function projectTargetedTestOutcome(
  outcome: TargetedTestProviderOperationOutcome,
) {
  return {
    ...outcome,
    targets: outcome.targets.map(projectProviderTarget),
  };
}

function projectProviderTarget<
  const TTarget extends CompleteTestProviderOperationOutcome["targets"][number]
    | TargetedTestProviderOperationOutcome["targets"][number],
>(outcome: TTarget) {
  return {
    ...outcome,
    events: outcome.events.map(projectProviderEvent),
  };
}

function projectProviderEvent(event: ProviderEvent) {
  switch (event.phase) {
    case "planned":
      return {
        ...event,
        plan: projectProviderTargetPlan(event.plan),
      };
    case "applied":
    case "uncertain":
    case "retired":
      return {
        ...event,
        action: projectProviderMutationAction(event.action),
      };
    case "verified":
    case "skipped":
    case "blocked":
    case "failed":
      return { ...event };
    default:
      return unreachable(event);
  }
}

function projectProviderTargetPlan(plan: ProviderTargetPlan) {
  return {
    ...plan,
    projection: plan.projection === null
      ? null
      : projectAgentProviderProjection(plan.projection),
    steps: plan.steps.map(projectProviderPlanStep),
  };
}

function projectProviderPlanStep(step: ProviderPlanStep) {
  switch (step.kind) {
    case "mutate":
      return {
        ...step,
        action: projectProviderMutationAction(step.action),
      };
    case "verify":
      return {
        ...step,
        projection: projectAgentProviderProjection(step.projection),
      };
    case "verify-managed":
    case "verify-retired":
      return { ...step };
    default:
      return unreachable(step);
  }
}

function projectProviderMutationAction(
  action: ProviderMutationAction,
) {
  switch (action.kind) {
    case "InstallMember":
    case "EnableMember":
      return {
        ...action,
        member: projectProviderProjectionMember(action.member),
      };
    case "AdmitTargetIdentity":
    case "SetMarketplace":
    case "RetireMember":
    case "PublishReceipt":
      return { ...action };
    default:
      return unreachable(action);
  }
}

function projectAgentProviderProjection(
  projection: AgentProviderProjection,
) {
  return {
    ...projection,
    marketplace: {
      ...projection.marketplace,
      files: projection.marketplace.files.map(projectProviderPackageFile),
    },
    members: projection.members.map(projectProviderProjectionMember),
  };
}

function projectProviderProjectionMember(
  member: ProviderProjectionMember,
) {
  return {
    ...member,
    files: member.files.map(projectProviderPackageFile),
  };
}

function projectProviderPackageFile(
  file: ProviderPackageFile,
) {
  return {
    path: file.path,
    mode: file.mode,
    contentDigest: file.contentDigest,
  };
}

function unreachable(value: never): never {
  throw new TypeError(`Unreachable provider boundary value: ${String(value)}`);
}

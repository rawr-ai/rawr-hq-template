import type {
  CanonicalConvergencePlan,
  CanonicalExecutionResult,
  CanonicalNativeMutationAction,
  CanonicalNativeObservation,
  CanonicalObservedConvergencePlan,
  CanonicalVerificationStep,
} from "../model/dto/canonical-convergence";
import {
  type DeploymentResult,
  issue,
  type NonEmptyReadonlyArray,
  type ProviderDeploymentIssue,
} from "../model/errors/deployment-result";
import {
  verifyCanonicalConfiguredExposureRetired,
  verifyCanonicalFinalInventory,
  verifyCanonicalRetiredInventory,
  verifyCanonicalSelectedInventory,
} from "../model/policy/canonical-convergence";
import type { NativeMutationAttempt } from "../model/repositories/provider";

export interface CanonicalExecutionDependencies {
  readonly observer: Readonly<{
    observe(
      target: CanonicalConvergencePlan["target"]
    ): Promise<DeploymentResult<CanonicalNativeObservation>>;
  }>;
  readonly mutator: Readonly<{
    apply(action: CanonicalNativeMutationAction): Promise<NativeMutationAttempt>;
  }>;
}

export async function executeCanonicalConvergence(
  plan: CanonicalObservedConvergencePlan,
  dependencies: CanonicalExecutionDependencies
): Promise<CanonicalExecutionResult> {
  const shapeIssue = planShapeIssue(plan);
  if (shapeIssue !== undefined) {
    return failed(plan, [], [], [shapeIssue]);
  }

  const appliedPrefix: CanonicalNativeMutationAction[] = [];
  const verifiedSteps: CanonicalVerificationStep[] = [];
  let finalInventory:
    | Extract<CanonicalNativeObservation, { kind: "observed" }>["inventory"]
    | undefined;

  for (const step of plan.steps) {
    if (step.kind === "mutate") {
      const attempt = await dependencies.mutator.apply(step.action);
      if (attempt.kind === "not-applied") {
        return failed(plan, appliedPrefix, verifiedSteps, attempt.issues);
      }
      if (attempt.kind === "uncertain") {
        return Object.freeze({
          kind: "uncertain",
          target: plan.target,
          appliedPrefix: Object.freeze([...appliedPrefix]),
          verifiedSteps: Object.freeze([...verifiedSteps]),
          attempted: step.action,
          lastKnown: attempt.lastKnown,
          issues: attempt.issues,
        });
      }
      appliedPrefix.push(step.action);
      continue;
    }

    const observation = await dependencies.observer.observe(step.target);
    if (!observation.ok) {
      return failed(plan, appliedPrefix, verifiedSteps, observation.issues);
    }
    if (observation.value.kind === "ambiguous-provenance") {
      return failed(plan, appliedPrefix, verifiedSteps, [
        issue(
          "BLOCKED_COLLISION",
          "target.inventory.provenance",
          "Native marketplace state has missing or invalid embedded RAWR provenance",
          plan.projection.marketplace.identity,
          observation.value.reason
        ),
      ]);
    }
    const inventory = observation.value.inventory;
    if (inventory.target.targetDigest !== plan.target.targetDigest) {
      return failed(plan, appliedPrefix, verifiedSteps, [
        issue(
          "INVALID_TARGET",
          "target.inventory.targetDigest",
          "Native observation belongs to another provider target",
          plan.target.targetDigest,
          inventory.target.targetDigest
        ),
      ]);
    }
    const verified =
      step.kind === "verify-retired"
        ? verifyCanonicalRetiredInventory(
            inventory,
            step.nativeIdentity,
            step.providerSourceIdentity
          )
        : step.kind === "verify-configured-retired"
          ? verifyCanonicalConfiguredExposureRetired(
              inventory,
              step.exposureIdentity,
              step.providerSourceIdentity
            )
          : step.kind === "verify-final"
            ? verifyCanonicalFinalInventory(step.projection, inventory)
            : verifyCanonicalSelectedInventory(step.projection, inventory);
    if (!verified.ok) {
      return failed(plan, appliedPrefix, verifiedSteps, verified.issues);
    }
    verifiedSteps.push(step);
    finalInventory = inventory;
  }

  if (finalInventory === undefined) {
    return failed(plan, appliedPrefix, verifiedSteps, [
      issue(
        "MUTATION_FAILED",
        "target.plan.steps",
        "Canonical convergence completed without a live verification barrier"
      ),
    ]);
  }
  return Object.freeze({
    kind: "completed",
    target: plan.target,
    appliedPrefix: Object.freeze([...appliedPrefix]),
    verifiedSteps: Object.freeze([...verifiedSteps]),
    finalInventory,
  });
}

function planShapeIssue(
  plan: Extract<CanonicalConvergencePlan, { status: "CONVERGED" | "DRIFTED" }>
): ProviderDeploymentIssue | undefined {
  const sameTarget = (target: CanonicalConvergencePlan["target"]) =>
    target.targetDigest === plan.target.targetDigest;
  for (const [index, step] of plan.steps.entries()) {
    if (step.kind !== "mutate" && !sameTarget(step.target)) {
      return issue(
        "INVALID_TARGET",
        `target.plan.steps[${index}].target`,
        "Canonical convergence step belongs to another provider target",
        plan.target.targetDigest,
        step.target.targetDigest
      );
    }
    if (step.kind === "mutate" && !sameTarget(step.action.target)) {
      return issue(
        "INVALID_TARGET",
        `target.plan.steps[${index}].action.target`,
        "Canonical convergence action belongs to another provider target",
        plan.target.targetDigest,
        step.action.target.targetDigest
      );
    }
    if (
      (step.kind === "verify-selected" || step.kind === "verify-final") &&
      step.projection.projectionDigest !== plan.projection.projectionDigest
    ) {
      return issue(
        "PROJECTION_MISMATCH",
        `target.plan.steps[${index}].projection`,
        "Canonical verification step belongs to another projection",
        plan.projection.projectionDigest,
        step.projection.projectionDigest
      );
    }
    if (
      step.kind === "mutate" &&
      (step.action.kind === "RetireMember" || step.action.kind === "RetireConfiguredExposure")
    ) {
      const next = plan.steps[index + 1];
      const matches =
        step.action.kind === "RetireMember"
          ? next?.kind === "verify-retired" &&
            next.nativeIdentity === step.action.member.nativeIdentity &&
            next.providerSourceIdentity === step.action.member.providerSourceIdentity
          : next?.kind === "verify-configured-retired" &&
            next.exposureIdentity === step.action.exposure.exposureIdentity &&
            next.providerSourceIdentity === step.action.exposure.providerSourceIdentity;
      if (!matches) {
        return issue(
          "MUTATION_FAILED",
          `target.plan.steps[${index}]`,
          "Canonical retirement must be followed by its exact verification barrier"
        );
      }
    }
    if (step.kind === "verify-retired" || step.kind === "verify-configured-retired") {
      const previous = plan.steps[index - 1];
      const matches =
        step.kind === "verify-retired"
          ? previous?.kind === "mutate" &&
            previous.action.kind === "RetireMember" &&
            previous.action.member.nativeIdentity === step.nativeIdentity &&
            previous.action.member.providerSourceIdentity === step.providerSourceIdentity
          : previous?.kind === "mutate" &&
            previous.action.kind === "RetireConfiguredExposure" &&
            previous.action.exposure.exposureIdentity === step.exposureIdentity &&
            previous.action.exposure.providerSourceIdentity === step.providerSourceIdentity;
      if (!matches) {
        return issue(
          "MUTATION_FAILED",
          `target.plan.steps[${index}]`,
          "Canonical retirement verification has no exact preceding mutation"
        );
      }
    }
    if (step.kind === "verify-final" && index !== plan.steps.length - 1) {
      return issue(
        "MUTATION_FAILED",
        `target.plan.steps[${index}]`,
        "Final canonical verification must be the last plan step"
      );
    }
  }
  const last = plan.steps.at(-1);
  if (last?.kind !== "verify-selected" && last?.kind !== "verify-final") {
    return issue(
      "MUTATION_FAILED",
      "target.plan.steps",
      "Canonical convergence must end with selected or final verification"
    );
  }
  return undefined;
}

function failed(
  plan: CanonicalConvergencePlan,
  appliedPrefix: readonly CanonicalNativeMutationAction[],
  verifiedSteps: readonly CanonicalVerificationStep[],
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>
): Extract<CanonicalExecutionResult, { kind: "failed" }> {
  return Object.freeze({
    kind: "failed",
    target: plan.target,
    appliedPrefix: Object.freeze([...appliedPrefix]),
    verifiedSteps: Object.freeze([...verifiedSteps]),
    issues,
  });
}

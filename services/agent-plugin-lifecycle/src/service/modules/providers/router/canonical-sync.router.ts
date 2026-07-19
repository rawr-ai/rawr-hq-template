import { parseProviderDeploymentRequest } from "../model/dto/mode";
import {
  canonicalMutationRecord,
  type CanonicalMutationRecord,
  type CanonicalSyncOutcome,
  type CanonicalSyncTargetOutcome,
} from "../model/dto/outcome";
import {
  issue,
  failure,
  success,
  type DeploymentResult,
  type NonEmptyReadonlyArray,
  type ProviderDeploymentIssue,
} from "../model/errors/deployment-result";
import type {
  CanonicalConvergencePlan,
  CanonicalObservedConvergencePlan,
} from "../model/dto/canonical-convergence";
import {
  canonicalMarketplaceRegistration,
  planCanonicalConvergence,
} from "../model/policy/canonical-convergence";
import { module } from "../module";
import type { VerifiedReleaseReader } from "../model/repositories/artifact";
import type { CanonicalNativeRuntime } from "../model/repositories/canonical-native";
import type { CurrentMainSelectionReader } from "../model/repositories/current-main";
import type {
  ProviderMarketplaceMaterializer,
  ProviderProjectionMaterializer,
} from "../model/repositories/state";
import {
  desiredForTarget,
  resolveCanonicalOperationSelection,
} from "./canonical-operation";
import { executeCanonicalConvergence } from "./canonical-convergence-executor";
import { canonicalSyncResult } from "./procedure-result";

export interface CanonicalSyncDependencies {
  readonly currentMain: CurrentMainSelectionReader;
  readonly releases: VerifiedReleaseReader;
  readonly native: CanonicalNativeRuntime;
  readonly projectionMaterializer: ProviderProjectionMaterializer;
  readonly marketplaceMaterializer: ProviderMarketplaceMaterializer;
}

export const canonicalSync = module.canonicalSync.handler(
  async ({ context, input }) => canonicalSyncResult(executeCanonicalSync(input, {
    currentMain: context.providers.currentMain,
    releases: context.providers.releases,
    native: context.providers.canonicalNative,
    projectionMaterializer: context.providers.projectionMaterializer,
    marketplaceMaterializer: context.providers.marketplaceMaterializer,
  })),
);

export async function executeCanonicalSync(
  input: unknown,
  dependencies: CanonicalSyncDependencies,
): Promise<DeploymentResult<CanonicalSyncOutcome>> {
  const parsed = parseProviderDeploymentRequest(input);
  if (!parsed.ok) return parsed;
  if (parsed.value.kind !== "canonical-sync") {
    return failure([issue(
        "INVALID_MODE",
        "request.kind",
        "Canonical sync accepts only canonical-sync requests",
        "canonical-sync",
        parsed.value.kind,
      )]);
  }

  const selection = await resolveCanonicalOperationSelection(
    parsed.value.locator,
    dependencies,
  );
  if (selection.status === "BLOCKED_SELECTION") {
    return success(aggregate(parsed.value.targets.map((target) => blocked(
      target,
      "BLOCKED_SELECTION",
      selection.issues,
    ))));
  }

  const outcomes: CanonicalSyncTargetOutcome[] = [];
  for (const target of parsed.value.targets) {
    const desired = desiredForTarget(selection.desired, target.provider);
    const capabilities = await dependencies.native.inspectCapabilities(
      target,
      desired.projection.artifactAuthority.contentAuthority,
    );
    if (!capabilities.ok) {
      outcomes.push(blocked(
        target,
        hasOwnershipCollision(capabilities.issues) ? "BLOCKED_COLLISION" : "INCOMPATIBLE_PROVIDER",
        capabilities.issues,
      ));
      continue;
    }
    const observation = await dependencies.native.observe(
      target,
      desired.projection.artifactAuthority.contentAuthority,
    );
    if (!observation.ok) {
      outcomes.push(hasOwnershipCollision(observation.issues)
        ? blocked(target, "BLOCKED_COLLISION", observation.issues)
        : failed(target, [], observation.issues));
      continue;
    }

    const plan = planCanonicalConvergence({
      desired,
      capabilities: capabilities.value,
      observation: observation.value,
    });
    if (!isObservedPlan(plan)) {
      outcomes.push(blocked(target, plan.status, plan.issues));
      continue;
    }

    if (plan.status === "DRIFTED") {
      const materializationIssues = await materializePlan(plan, dependencies);
      const first = materializationIssues[0];
      if (first !== undefined) {
        outcomes.push(failed(target, [], [first, ...materializationIssues.slice(1)]));
        continue;
      }
    }

    const execution = await executeCanonicalConvergence(plan, {
      observer: {
        observe: async (nextTarget) => await dependencies.native.observe(
          nextTarget,
          desired.projection.artifactAuthority.contentAuthority,
        ),
      },
      mutator: {
        apply: async (action) => await dependencies.native.apply(action),
      },
    });
    const prefix = execution.appliedPrefix.map(canonicalMutationRecord);
    if (execution.kind === "failed") {
      outcomes.push(prefix.length === 0 && hasOwnershipCollision(execution.issues)
        ? blocked(target, "BLOCKED_COLLISION", execution.issues)
        : failed(target, prefix, execution.issues));
      continue;
    }
    if (execution.kind === "uncertain") {
      outcomes.push(Object.freeze({
        kind: "uncertain",
        status: "DRIFTED",
        target,
        appliedPrefix: Object.freeze(prefix),
        attempted: canonicalMutationRecord(execution.attempted),
        lastKnown: execution.lastKnown,
        issues: execution.issues,
      }));
      continue;
    }
    const firstApplied = prefix[0];
    if (firstApplied === undefined) {
      const readOnly: Extract<CanonicalSyncTargetOutcome, { kind: "read-only-converged" }> = Object.freeze({
        kind: "read-only-converged",
        status: "CONVERGED",
        target,
        appliedPrefix: EMPTY,
        issues: EMPTY,
      });
      outcomes.push(readOnly);
      continue;
    }
    const appliedPrefix: NonEmptyReadonlyArray<CanonicalMutationRecord> = Object.freeze([
      firstApplied,
      ...prefix.slice(1),
    ]);
    const mutated: Extract<CanonicalSyncTargetOutcome, { kind: "mutated" }> = Object.freeze({
      kind: "mutated",
      status: "CONVERGED",
      target,
      appliedPrefix,
      issues: EMPTY,
    });
    outcomes.push(mutated);
  }
  return success(aggregate(outcomes));
}

function hasOwnershipCollision(issues: readonly ProviderDeploymentIssue[]): boolean {
  return issues.some((entry) => entry.code === "BLOCKED_COLLISION");
}

async function materializePlan(
  plan: CanonicalObservedConvergencePlan,
  dependencies: Pick<
    CanonicalSyncDependencies,
    "marketplaceMaterializer" | "projectionMaterializer"
  >,
): Promise<readonly ProviderDeploymentIssue[]> {
  const actions = plan.steps.flatMap((step) => step.kind === "mutate" ? [step.action] : []);
  const requiresProjection = actions.some((action) =>
    action.kind === "SetMarketplace" || action.kind === "InstallMember");
  if (requiresProjection) {
    const projection = await dependencies.projectionMaterializer.materialize(plan.projection);
    if (!projection.ok) return projection.issues;
  }
  if (actions.some((action) => action.kind === "SetMarketplace")) {
    const marketplace = await dependencies.marketplaceMaterializer.materialize(
      plan.target.provider,
      canonicalMarketplaceRegistration(plan.projection),
    );
    if (!marketplace.ok) return marketplace.issues;
  }
  return EMPTY;
}

function blocked(
  target: CanonicalSyncTargetOutcome["target"],
  status: Extract<CanonicalSyncTargetOutcome, { kind: "blocked" }>["status"],
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>,
): Extract<CanonicalSyncTargetOutcome, { kind: "blocked" }> {
  const outcome: Extract<CanonicalSyncTargetOutcome, { kind: "blocked" }> = Object.freeze({
    kind: "blocked",
    status,
    target,
    appliedPrefix: EMPTY,
    issues: Object.freeze(issues),
  });
  return outcome;
}

function isObservedPlan(
  plan: CanonicalConvergencePlan,
): plan is CanonicalObservedConvergencePlan {
  return plan.status === "CONVERGED" || plan.status === "DRIFTED";
}

const EMPTY: readonly [] = Object.freeze([]);

function failed(
  target: CanonicalSyncTargetOutcome["target"],
  appliedPrefix: readonly CanonicalMutationRecord[],
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>,
): Extract<CanonicalSyncTargetOutcome, { kind: "failed" }> {
  return Object.freeze({
    kind: "failed",
    status: "DRIFTED",
    target,
    appliedPrefix: Object.freeze([...appliedPrefix]),
    issues: Object.freeze(issues),
  });
}

function aggregate(targets: readonly CanonicalSyncTargetOutcome[]): CanonicalSyncOutcome {
  const issues = targets.flatMap((target) => target.issues);
  const successes = targets.filter((target) =>
    target.kind === "mutated" || target.kind === "read-only-converged");
  const failures = targets.filter((target) =>
    target.kind !== "mutated" && target.kind !== "read-only-converged");
  const status = failures.length === 0
    ? targets.some((target) => target.kind === "mutated")
      ? "Mutated" as const
      : "ReadOnlyConverged" as const
    : successes.length > 0
      ? "PartialFailure" as const
      : targets.every((target) => target.kind === "blocked")
        ? "Blocked" as const
        : "Failed" as const;
  return Object.freeze({
    status,
    targets: Object.freeze([...targets]),
    issues: Object.freeze(issues),
  });
}

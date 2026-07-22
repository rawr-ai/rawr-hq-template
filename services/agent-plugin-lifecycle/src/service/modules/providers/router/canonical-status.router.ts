import { normalizeCanonicalStatusRequest, type CanonicalStatusInput } from "../model/dto/mode";
import type { CanonicalStatusOutcome, CanonicalTargetStatus } from "../model/dto/outcome";
import {
  success,
  type DeploymentResult,
  type ProviderDeploymentIssue,
} from "../model/errors/deployment-result";
import { planCanonicalConvergence } from "../model/policy/canonical-convergence";
import type { ProviderTarget } from "../model/dto/provider-target";
import { module } from "../module";
import type { VerifiedReleaseReader } from "../model/repositories/artifact";
import type { CanonicalNativeRuntime } from "../model/repositories/canonical-native";
import type { CurrentMainSelectionReader } from "../../../model/dependencies/current-main";
import { desiredForTarget, resolveCanonicalOperationSelection } from "./canonical-operation";
import { canonicalStatusResult } from "./procedure-result";

export interface CanonicalStatusDependencies {
  readonly currentMain: CurrentMainSelectionReader;
  readonly releases: VerifiedReleaseReader;
  readonly native: Pick<CanonicalNativeRuntime, "inspectCapabilities" | "observe">;
}

export const canonicalStatus = module.canonicalStatus.handler(async ({ context, input }) =>
  canonicalStatusResult(
    executeCanonicalStatus(input, {
      currentMain: context.currentMain,
      releases: context.releases,
      native: context.native,
    })
  )
);

export async function executeCanonicalStatus(
  input: CanonicalStatusInput,
  dependencies: CanonicalStatusDependencies
): Promise<DeploymentResult<readonly CanonicalStatusOutcome[]>> {
  const parsed = normalizeCanonicalStatusRequest(input);
  if (!parsed.ok) return parsed;
  const selection = await resolveCanonicalOperationSelection(parsed.value.locator, dependencies);
  if (selection.status === "BLOCKED_SELECTION") {
    return success(
      Object.freeze(
        parsed.value.targets.map((target) =>
          statusOutcome(target, "BLOCKED_SELECTION", selection.issues)
        )
      )
    );
  }

  const outcomes: CanonicalStatusOutcome[] = [];
  for (const target of parsed.value.targets) {
    const desired = desiredForTarget(selection.desired, target.provider);
    const capabilities = await dependencies.native.inspectCapabilities(
      target,
      desired.projection.artifactAuthority.contentAuthority
    );
    if (!capabilities.ok) {
      outcomes.push(
        statusOutcome(
          target,
          hasOwnershipCollision(capabilities.issues)
            ? "BLOCKED_COLLISION"
            : "INCOMPATIBLE_PROVIDER",
          capabilities.issues
        )
      );
      continue;
    }
    const observation = await dependencies.native.observe(
      target,
      desired.projection.artifactAuthority.contentAuthority
    );
    if (!observation.ok) {
      outcomes.push(
        statusOutcome(
          target,
          hasOwnershipCollision(observation.issues) ? "BLOCKED_COLLISION" : "DRIFTED",
          observation.issues
        )
      );
      continue;
    }
    const plan = planCanonicalConvergence({
      desired,
      capabilities: capabilities.value,
      observation: observation.value,
    });
    outcomes.push(statusOutcome(target, plan.status, plan.issues));
  }
  return success(Object.freeze(outcomes));
}

function hasOwnershipCollision(issues: readonly ProviderDeploymentIssue[]): boolean {
  return issues.some((entry) => entry.code === "BLOCKED_COLLISION");
}

function statusOutcome(
  target: ProviderTarget,
  status: CanonicalTargetStatus,
  issues: readonly ProviderDeploymentIssue[]
): CanonicalStatusOutcome {
  return Object.freeze({
    target,
    status,
    issues: Object.freeze([...issues]),
  });
}

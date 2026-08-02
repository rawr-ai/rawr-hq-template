import type {
  NativeProviderCommandPhase,
  NativeProviderInventory,
} from "@habitat-ai/rawr-resource-native-agent-provider";

import type {
  ConfirmedNativeOperation,
  NativeOperationAttempt,
  ProviderIssue,
  ProviderMutationTargetResult,
  VerificationFact,
} from "../dto/provider-lifecycle";
import {
  MAX_CONFIRMED_NATIVE_OPERATIONS,
  MAX_PROVIDER_FACTS,
  MAX_PROVIDER_ISSUES,
} from "../dto/provider-lifecycle";
import type { SelectedContent } from "../dto/selected-content";
import type {
  NativeAvailableTargetAssessment,
  NativePluginFileReadPlan,
  NativeReconciliationPolicy,
  NativeTargetAssessment,
} from "./native-state";
import {
  exactManagedOmittedSelectors,
  hasOneExactMarketplace,
  installedPlugin,
  marketplaceSourceIsRelated,
  observedPlugin,
  verificationFiles,
} from "./native-state";
import { providerIssue } from "./selected-content";

type NativeCommandCondition = "Always" | "IfInstalled" | "IfMissing" | "IfClaudeNotEnabled";

interface NativeCommandPlan {
  readonly kind: "Command";
  readonly operation: ConfirmedNativeOperation;
  readonly condition: NativeCommandCondition;
}

interface NativeMarketplaceRemovalGuard {
  readonly kind: "GuardMarketplaceRemoval";
}

interface NativeMemberVerificationPlan {
  readonly kind: "VerifyMember";
  readonly plan: NativePluginFileReadPlan;
}

interface NativeOmittedRetirementPlan {
  readonly kind: "RetireOmitted";
}

type NativeMutationPlanStep =
  | NativeCommandPlan
  | NativeMarketplaceRemovalGuard
  | NativeMemberVerificationPlan
  | NativeOmittedRetirementPlan;

/** Procedure-observed command outcome supplied to pure transition policy. */
export type NativeCommandAttempt =
  | Readonly<{ kind: "Returned" }>
  | Readonly<{
      kind: "Failed";
      commandPhase: NativeProviderCommandPhase;
      detail: string;
    }>;

/** Procedure-observed inventory outcome supplied to pure transition policy. */
export type NativeInventoryAttempt =
  | Readonly<{ kind: "Observed"; inventory: NativeProviderInventory }>
  | Readonly<{ kind: "Failed"; detail: string }>;

/** Pure result of one command plus its immediate native re-observation. */
export type NativeMutationStep =
  | Readonly<{
      kind: "Confirmed" | "AlreadySatisfied";
      inventory: NativeProviderInventory;
    }>
  | Readonly<{ kind: "Failed"; issue: ProviderIssue }>
  | Readonly<{
      kind: "Uncertain";
      issue: ProviderIssue;
      attempted: NativeOperationAttempt;
    }>;

/** Builds the bounded command and verification order for one admitted target. */
export function planNativeTargetMutation(
  content: SelectedContent,
  assessment: NativeAvailableTargetAssessment,
  policy: NativeReconciliationPolicy
): readonly NativeMutationPlanStep[] {
  const steps: NativeMutationPlanStep[] = [];
  if (assessment.marketplaceRefreshRequired) {
    if (assessment.marketplacePresent) {
      steps.push(Object.freeze({ kind: "GuardMarketplaceRemoval" }));
      steps.push(
        commandPlan(
          { kind: "marketplace-removed", identity: content.marketplace.identity },
          "Always"
        )
      );
    }
    steps.push(
      commandPlan({ kind: "marketplace-added", identity: content.marketplace.identity }, "Always")
    );
  }

  for (const member of assessment.members) {
    const replace =
      member.installed && (assessment.marketplaceRefreshRequired || !member.filesMatch);
    if (replace) {
      steps.push(commandPlan({ kind: "plugin-removed", selector: member.selector }, "IfInstalled"));
    }
    if (!member.installed || replace) {
      steps.push(commandPlan({ kind: "plugin-installed", selector: member.selector }, "IfMissing"));
    }
    if (
      assessment.target.provider === "claude" &&
      (member.enabled !== true || !member.installed || replace)
    ) {
      steps.push(
        commandPlan({ kind: "plugin-enabled", selector: member.selector }, "IfClaudeNotEnabled")
      );
    }
    const files = verificationFiles(member.member, assessment.target.provider);
    if (files !== null) {
      steps.push(
        Object.freeze({
          kind: "VerifyMember",
          plan: Object.freeze({
            member: member.member,
            selector: member.selector,
            files,
          }),
        })
      );
    }
  }

  if (policy.retireOmitted) steps.push(Object.freeze({ kind: "RetireOmitted" }));
  return Object.freeze(steps);
}

/** Determines whether the current inventory still requires one planned command. */
export function nativeCommandIsRequired(
  plan: NativeCommandPlan,
  inventory: NativeProviderInventory
): boolean {
  switch (plan.condition) {
    case "Always":
      return true;
    case "IfInstalled":
      return (
        plan.operation.kind === "plugin-removed" &&
        installedPlugin(inventory, plan.operation.selector) !== undefined
      );
    case "IfMissing":
      return (
        plan.operation.kind === "plugin-installed" &&
        installedPlugin(inventory, plan.operation.selector) === undefined
      );
    case "IfClaudeNotEnabled":
      return (
        plan.operation.kind === "plugin-enabled" &&
        installedPlugin(inventory, plan.operation.selector)?.enabled !== true
      );
  }
}

/** Admits removal only while the marketplace still belongs to the selected source family. */
export function marketplaceRemovalIssue(
  content: SelectedContent,
  inventory: NativeProviderInventory
): ProviderIssue | undefined {
  const matches = inventory.marketplaces.filter(
    (marketplace) => marketplace.identity === content.marketplace.identity
  );
  const marketplace = matches.at(0);
  return matches.length === 1 &&
    marketplace !== undefined &&
    marketplaceSourceIsRelated(marketplace, content.marketplace.source)
    ? undefined
    : providerIssue(
        "MarketplaceCollision",
        "Marketplace ownership changed after preflight; nothing was removed."
      );
}

/**
 * Selects the latest exact-provenance omitted members before canonical retirement.
 *
 * @param content - Exact selected complete-set content.
 * @param inventory - Latest TypeBox-admitted provider inventory.
 * @param confirmedOperationCount - Confirmed prefix already applied to this target.
 */
export function planOmittedRetirement(
  content: SelectedContent,
  inventory: NativeProviderInventory,
  confirmedOperationCount: number
):
  | Readonly<{ ok: true; selectors: readonly string[] }>
  | Readonly<{ ok: false; issue: ProviderIssue }> {
  const selectors = exactManagedOmittedSelectors(content, inventory);
  if (selectors === null) {
    return Object.freeze({
      ok: false,
      issue: providerIssue(
        "MarketplaceCollision",
        "Managed plugin retirement requires one exact observed marketplace source."
      ),
    });
  }
  if (confirmedOperationCount + selectors.length > MAX_CONFIRMED_NATIVE_OPERATIONS) {
    return Object.freeze({
      ok: false,
      issue: providerIssue(
        "DesiredContentInvalid",
        "Selected native changes exceed the per-target operation bound."
      ),
    });
  }
  return Object.freeze({ ok: true, selectors });
}

/**
 * Classifies one command and its immediate native re-observation.
 *
 * @remarks
 * A failed command may still be confirmed by live state. A command that may
 * have started becomes uncertain only when the confirming observation is also
 * unavailable.
 *
 * @param content - Selected content whose postcondition must be observed.
 * @param operation - Native operation admitted by the target mutation plan.
 * @param command - Exact outcome of invoking the native provider command.
 * @param observation - Immediate inventory observation after the command attempt.
 */
export function classifyNativeMutationStep(
  content: SelectedContent,
  operation: ConfirmedNativeOperation,
  command: NativeCommandAttempt,
  observation: NativeInventoryAttempt
): NativeMutationStep {
  if (command.kind === "Failed") {
    if (observation.kind === "Observed") {
      if (nativeOperationPostcondition(content, operation, observation.inventory)) {
        return Object.freeze({
          kind: command.commandPhase === "not-started" ? "AlreadySatisfied" : "Confirmed",
          inventory: observation.inventory,
        });
      }
      return Object.freeze({
        kind: "Failed",
        issue: providerIssue("NativeCommandFailed", command.detail),
      });
    }
    if (command.commandPhase === "not-started") {
      return Object.freeze({
        kind: "Failed",
        issue: providerIssue("NativeCommandFailed", command.detail),
      });
    }
    return Object.freeze({
      kind: "Uncertain",
      issue: providerIssue(
        "NativeObservationFailed",
        `Provider state could not be observed after a command started: ${observation.detail}`
      ),
      attempted: Object.freeze({ operation, commandPhase: command.commandPhase }),
    });
  }

  if (observation.kind === "Observed") {
    return nativeOperationPostcondition(content, operation, observation.inventory)
      ? Object.freeze({ kind: "Confirmed", inventory: observation.inventory })
      : Object.freeze({
          kind: "Failed",
          issue: providerIssue(
            "VerificationFailed",
            `Native operation ${operation.kind} returned without its postcondition.`
          ),
        });
  }
  return Object.freeze({
    kind: "Uncertain",
    issue: providerIssue(
      "NativeObservationFailed",
      `Provider state could not be observed after a command returned: ${observation.detail}`
    ),
    attempted: Object.freeze({ operation, commandPhase: "command-returned" }),
  });
}

/**
 * Projects a failed target with its exact confirmed operation prefix.
 *
 * @param assessment - Preflight assessment that owns the target identity.
 * @param operations - Exact native operations confirmed before failure.
 * @param facts - Terminal verification facts observed after failure.
 * @param issues - Provider-domain issues that explain the failure.
 */
export function failedMutationTarget(
  assessment: NativeTargetAssessment,
  operations: readonly ConfirmedNativeOperation[],
  facts: readonly VerificationFact[],
  issues: readonly ProviderIssue[]
): ProviderMutationTargetResult {
  return Object.freeze({
    target: assessment.target,
    classification: "Failed",
    operations: Object.freeze([...operations]),
    facts: Object.freeze([...facts].slice(0, MAX_PROVIDER_FACTS)),
    issues: Object.freeze([...issues].slice(0, MAX_PROVIDER_ISSUES)),
  });
}

/**
 * Projects an uncertain target with the unconfirmed command kept separate.
 *
 * @param assessment - Preflight assessment that owns the target identity.
 * @param operations - Exact native operations confirmed before uncertainty.
 * @param attempted - Command that may have started but could not be confirmed.
 * @param facts - Terminal verification facts recovered after uncertainty.
 * @param issues - Provider-domain issues that explain the uncertainty.
 */
export function uncertainMutationTarget(
  assessment: NativeTargetAssessment,
  operations: readonly ConfirmedNativeOperation[],
  attempted: NativeOperationAttempt,
  facts: readonly VerificationFact[],
  issues: readonly ProviderIssue[]
): ProviderMutationTargetResult {
  return Object.freeze({
    target: assessment.target,
    classification: "Uncertain",
    operations: Object.freeze([...operations]),
    attempted,
    facts: Object.freeze([...facts].slice(0, MAX_PROVIDER_FACTS)),
    issues: Object.freeze([...issues].slice(0, MAX_PROVIDER_ISSUES)),
  });
}

/**
 * Projects one converged or changed target after final native verification.
 *
 * @param assessment - Preflight assessment that owns the target identity.
 * @param operations - Exact native operations confirmed by final verification.
 * @param facts - Final verification facts for the selected content.
 * @param issues - Non-terminal Provider observations retained for diagnostics.
 */
export function completedMutationTarget(
  assessment: NativeTargetAssessment,
  operations: readonly ConfirmedNativeOperation[],
  facts: readonly VerificationFact[],
  issues: readonly ProviderIssue[]
): ProviderMutationTargetResult {
  const base = {
    target: assessment.target,
    operations: Object.freeze([...operations]),
    facts: Object.freeze([...facts].slice(0, MAX_PROVIDER_FACTS)),
    issues: Object.freeze([...issues].slice(0, MAX_PROVIDER_ISSUES)),
  };
  return operations.length === 0
    ? Object.freeze({ ...base, classification: "Converged" as const })
    : Object.freeze({ ...base, classification: "Changed" as const });
}

/** Projects remaining targets after a prior target reaches a terminal mutation failure. */
export function notAttemptedAfterMutation(
  assessments: readonly NativeTargetAssessment[]
): readonly ProviderMutationTargetResult[] {
  return Object.freeze(
    assessments.map((assessment) =>
      Object.freeze({
        target: assessment.target,
        classification: "NotAttempted" as const,
        operations: Object.freeze([]),
        facts: assessment.facts,
        issues: Object.freeze([
          providerIssue("NotAttempted", "A prior target failed, so this target was not mutated."),
        ]),
      })
    )
  );
}

/** Determines whether final target observation satisfies selected convergence. */
export function finalNativeAssessmentIssue(
  assessment: NativeTargetAssessment
): ProviderIssue | undefined {
  return assessment.failed || assessment.collision || assessment.needsMutation
    ? providerIssue("VerificationFailed", "Final native provider verification did not converge.")
    : undefined;
}

function commandPlan(
  operation: ConfirmedNativeOperation,
  condition: NativeCommandCondition
): NativeCommandPlan {
  return Object.freeze({ kind: "Command", operation, condition });
}

function nativeOperationPostcondition(
  content: SelectedContent,
  operation: ConfirmedNativeOperation,
  inventory: NativeProviderInventory
): boolean {
  switch (operation.kind) {
    case "marketplace-removed":
      return !inventory.marketplaces.some(
        (marketplace) => marketplace.identity === operation.identity
      );
    case "marketplace-added":
      return hasOneExactMarketplace(inventory, content);
    case "plugin-removed":
      return observedPlugin(inventory, operation.selector) === undefined;
    case "plugin-installed":
      return installedPlugin(inventory, operation.selector) !== undefined;
    case "plugin-enabled":
      return installedPlugin(inventory, operation.selector)?.enabled === true;
  }
}

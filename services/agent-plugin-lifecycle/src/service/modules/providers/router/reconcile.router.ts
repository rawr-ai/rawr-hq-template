import type {
  NativeAgentProviderFailure,
  NativeProviderCapabilities,
  NativeProviderCommandPhase,
  NativeProviderInventory,
  NativeProviderPluginObservation,
} from "@rawr/resource-native-agent-provider";
import {
  isNativeAgentProviderFailure,
  MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES,
  NativeProviderCapabilitiesSchema,
  NativeProviderInventorySchema,
  NativeProviderPluginFilesSchema,
} from "@rawr/resource-native-agent-provider";
import { Value } from "typebox/value";

import type {
  NativeProviderSession,
  NativeProviderSessionResolver,
  SelectedContent,
  SelectedContentMember,
} from "../../../model/dependencies/providers";
import { contentDigest } from "../../../shared/release";
import type {
  ConfirmedNativeOperation,
  NativeOperationAttempt,
  ProviderIssue,
  ProviderMutationTargetResult,
  ProviderStatusTargetResult,
  ProviderTarget,
  VerificationFact,
} from "../model/dto/provider-lifecycle";
import { MAX_CONFIRMED_NATIVE_OPERATIONS } from "../model/dto/provider-lifecycle";
import {
  marketplaceSourceIsRelated,
  marketplaceSourceMatches,
  providerIssue,
  providerPluginSelector,
  verificationFiles,
} from "../model/policy/selected-content";

const MAX_FACTS_PER_TARGET = 4_096;
const MAX_ISSUES_PER_TARGET = 256;
const MAX_OPERATIONS_PER_TARGET = MAX_CONFIRMED_NATIVE_OPERATIONS;

interface MemberAssessment {
  readonly member: SelectedContentMember;
  readonly selector: string;
  readonly installed: boolean;
  readonly enabled: boolean | null;
  readonly filesMatch: boolean;
}

export interface TargetAssessment {
  readonly target: ProviderTarget;
  readonly session?: NativeProviderSession;
  readonly capabilities?: NativeProviderCapabilities;
  readonly inventory?: NativeProviderInventory;
  readonly marketplacePresent: boolean;
  readonly marketplaceExact: boolean;
  readonly marketplaceRefreshRequired: boolean;
  readonly members: readonly MemberAssessment[];
  readonly omittedSelectors: readonly string[];
  readonly facts: readonly VerificationFact[];
  readonly issues: readonly ProviderIssue[];
  readonly collision: boolean;
  readonly failed: boolean;
  readonly needsMutation: boolean;
}

interface ReconcileOptions {
  readonly retireOmitted: boolean;
}

interface MutationConfirmed {
  readonly kind: "Confirmed" | "AlreadySatisfied";
  readonly inventory: NativeProviderInventory;
}

interface MutationFailed {
  readonly kind: "Failed";
  readonly issue: ProviderIssue;
}

interface MutationUncertain {
  readonly kind: "Uncertain";
  readonly issue: ProviderIssue;
  readonly attempted: NativeOperationAttempt;
}

type MutationStep = MutationConfirmed | MutationFailed | MutationUncertain;

export async function inspectProviderTargets(
  content: SelectedContent,
  targets: readonly ProviderTarget[],
  nativeSessions: NativeProviderSessionResolver,
  options: ReconcileOptions,
  mutationIntent: boolean
): Promise<readonly TargetAssessment[]> {
  const assessments: TargetAssessment[] = [];
  for (const target of targets) {
    assessments.push(
      await inspectProviderTarget(content, target, nativeSessions, options, mutationIntent)
    );
  }
  return Object.freeze(assessments);
}

export function statusTargetResult(assessment: TargetAssessment): ProviderStatusTargetResult {
  const base = {
    target: assessment.target,
    operations: Object.freeze([]) as readonly [],
    facts: assessment.facts,
    issues: assessment.issues,
  };
  if (assessment.collision) return Object.freeze({ ...base, classification: "Blocked" as const });
  if (assessment.failed) return Object.freeze({ ...base, classification: "Failed" as const });
  if (assessment.needsMutation)
    return Object.freeze({ ...base, classification: "Drifted" as const });
  return Object.freeze({ ...base, classification: "Converged" as const });
}

export function convergedMutationTargetResult(
  assessment: TargetAssessment
): ProviderMutationTargetResult {
  return Object.freeze({
    target: assessment.target,
    classification: "Converged" as const,
    operations: Object.freeze([]),
    facts: assessment.facts,
    issues: assessment.issues,
  });
}

export function blockedTargetResults(
  assessments: readonly TargetAssessment[]
): readonly ProviderMutationTargetResult[] {
  const hasCollision = assessments.some((assessment) => assessment.collision);
  const hasFailure = assessments.some((assessment) => assessment.failed);
  return Object.freeze(
    assessments.map((assessment) => {
      const ownBlocking = assessment.collision || assessment.failed;
      const issues = ownBlocking
        ? assessment.issues
        : Object.freeze(
            [
              ...assessment.issues,
              providerIssue(
                "NotAttempted",
                hasCollision
                  ? "No target was mutated because another target has an ownership collision."
                  : hasFailure
                    ? "No target was mutated because another target could not be completely inspected."
                    : "No target was mutated."
              ),
            ].slice(0, MAX_ISSUES_PER_TARGET)
          );
      return Object.freeze({
        target: assessment.target,
        classification: assessment.failed
          ? ("Failed" as const)
          : assessment.collision || !hasFailure
            ? ("Blocked" as const)
            : ("NotAttempted" as const),
        operations: Object.freeze([]),
        facts: assessment.facts,
        issues,
      });
    })
  );
}

export async function reconcileProviderTargets(
  content: SelectedContent,
  assessments: readonly TargetAssessment[],
  options: ReconcileOptions
): Promise<readonly ProviderMutationTargetResult[]> {
  const results: ProviderMutationTargetResult[] = [];
  for (let index = 0; index < assessments.length; index += 1) {
    const assessment = assessments[index]!;
    if (!assessment.needsMutation) {
      results.push(convergedMutationTargetResult(assessment));
      continue;
    }
    const result = await reconcileProviderTarget(content, assessment, options);
    results.push(result);
    if (result.classification === "Failed" || result.classification === "Uncertain") {
      for (const remaining of assessments.slice(index + 1)) {
        results.push(
          Object.freeze({
            target: remaining.target,
            classification: "NotAttempted" as const,
            operations: Object.freeze([]),
            facts: remaining.facts,
            issues: Object.freeze([
              providerIssue(
                "NotAttempted",
                "A prior target failed, so this target was not mutated."
              ),
            ]),
          })
        );
      }
      break;
    }
  }
  return Object.freeze(results);
}

export function hasBlockingAssessment(assessments: readonly TargetAssessment[]): boolean {
  return assessments.some((assessment) => assessment.collision || assessment.failed);
}

export function allTargetsConverged(assessments: readonly TargetAssessment[]): boolean {
  return assessments.every((assessment) => !assessment.needsMutation);
}

async function inspectProviderTarget(
  content: SelectedContent,
  target: ProviderTarget,
  nativeSessions: NativeProviderSessionResolver,
  options: ReconcileOptions,
  mutationIntent: boolean
): Promise<TargetAssessment> {
  let session: NativeProviderSession;
  try {
    session = await nativeSessions.acquire(target);
  } catch (error) {
    return unavailableAssessment(target, "Native provider acquisition failed", error);
  }
  if (
    session.provider !== target.provider ||
    session.home !== target.home ||
    session.executablePath.length === 0
  ) {
    return unavailableAssessment(
      target,
      "Native provider acquisition returned a session for a different target."
    );
  }
  let capabilities: NativeProviderCapabilities;
  let inventory: NativeProviderInventory;
  try {
    [capabilities, inventory] = await Promise.all([session.probe(), session.inventory()]);
  } catch (error) {
    return unavailableAssessment(target, "Native provider inspection failed", error, session);
  }
  if (
    !Value.Check(NativeProviderCapabilitiesSchema, capabilities) ||
    !Value.Check(NativeProviderInventorySchema, inventory) ||
    capabilities.provider !== target.provider ||
    inventory.provider !== target.provider ||
    capabilities.home !== target.home ||
    capabilities.executablePath !== session.executablePath ||
    (session.provider === "claude" &&
      (typeof session.enablePlugin !== "function" ||
        !new Set<string>(capabilities.capabilities).has("plugin-enable")))
  ) {
    return unavailableAssessment(
      target,
      "Native provider inspection returned facts for a different target.",
      undefined,
      session
    );
  }
  return assessInventory(
    content,
    target,
    session,
    capabilities,
    inventory,
    options,
    mutationIntent
  );
}

async function assessInventory(
  content: SelectedContent,
  target: ProviderTarget,
  session: NativeProviderSession,
  capabilities: NativeProviderCapabilities,
  inventory: NativeProviderInventory,
  options: ReconcileOptions,
  mutationIntent: boolean
): Promise<TargetAssessment> {
  const issues: ProviderIssue[] = [];
  const facts: VerificationFact[] = [];
  let collision = false;
  let failed = false;
  let needsMutation = false;
  const identity = content.marketplace.identity;
  const marketplaceMatches = inventory.marketplaces.filter(
    (marketplace) => marketplace.identity === identity
  );
  if (marketplaceMatches.length > 1) {
    collision = true;
    issues.push(
      providerIssue(
        "MarketplaceCollision",
        `Provider reports more than one ${identity} marketplace.`
      )
    );
  }
  const marketplace = marketplaceMatches[0];
  const marketplaceExact =
    marketplace !== undefined && marketplaceSourceMatches(marketplace, content.marketplace.source);
  if (marketplace === undefined) {
    needsMutation = true;
    issues.push(providerIssue("MarketplaceDrift", `Marketplace ${identity} is absent.`));
  } else if (!marketplaceExact) {
    if (!marketplaceSourceIsRelated(marketplace, content.marketplace.source)) {
      collision = true;
      issues.push(
        providerIssue(
          "MarketplaceCollision",
          `Marketplace ${identity} is owned by an unrelated source.`
        )
      );
    } else {
      needsMutation = true;
      issues.push(
        providerIssue("MarketplaceDrift", `Marketplace ${identity} is on a different revision.`)
      );
    }
  } else {
    pushFact(facts, "marketplace-source", identity, "Marketplace source matches the selection.");
  }

  const desiredNames = new Set<string>(
    content.members.flatMap((member) => [member.pluginId, ...member.aliases])
  );
  for (const live of inventory.plugins) {
    if (live.marketplaceIdentity === identity || !desiredNames.has(live.name)) {
      continue;
    }
    collision = true;
    issues.push(
      providerIssue(
        "PluginCollision",
        `Plugin name ${live.name} is associated with marketplace ${live.marketplaceIdentity}.`,
        content.members.find(
          (member) =>
            member.pluginId === live.name || member.aliases.some((alias) => alias === live.name)
        )?.pluginId
      )
    );
  }

  const members: MemberAssessment[] = [];
  for (const member of content.members) {
    const selector = providerPluginSelector(member, identity);
    const live = inventory.plugins.find(
      (plugin) => plugin.selector === selector && plugin.marketplaceIdentity === identity
    );
    if (live === undefined || !live.installed) {
      needsMutation = true;
      issues.push(
        providerIssue("PluginMissing", `Plugin ${selector} is not installed.`, member.pluginId)
      );
      members.push({
        member,
        selector,
        installed: false,
        enabled: null,
        filesMatch: false,
      });
      continue;
    }
    pushFact(
      facts,
      "plugin-installed",
      selector,
      "Plugin is installed from the selected marketplace."
    );
    const enabled = live.enabled;
    if (enabled === false || (target.provider === "claude" && enabled === null)) {
      needsMutation = true;
      issues.push(
        providerIssue(
          "PluginDisabled",
          enabled === null
            ? `Claude did not report enabled state for ${selector}.`
            : `Plugin ${selector} is disabled.`,
          member.pluginId
        )
      );
    } else if (enabled === true) {
      pushFact(facts, "plugin-enabled", selector, "Plugin is enabled for the provider.");
    }
    const files = verificationFiles(member, target.provider);
    if (files === null) {
      failed = true;
      issues.push(
        providerIssue(
          "DesiredContentInvalid",
          `Plugin ${member.pluginId} lacks a bounded ${target.provider} manifest and verification set.`,
          member.pluginId
        )
      );
      members.push({ member, selector, installed: true, enabled, filesMatch: false });
      continue;
    }
    const verified = await verifyMemberFiles(session, selector, member.pluginId, files, facts);
    if (verified.failed) failed = true;
    if (!verified.matches) {
      needsMutation = true;
      issues.push(...verified.issues);
    }
    members.push({
      member,
      selector,
      installed: true,
      enabled,
      filesMatch: verified.matches,
    });
  }

  const marketplaceRefreshRequired =
    !marketplaceExact ||
    (marketplaceRevisionIsUnobservable(marketplace, content.marketplace.source) &&
      members.some((member) => !member.installed || !member.filesMatch));
  if (marketplaceRefreshRequired && marketplaceExact) {
    needsMutation = true;
    issues.push(
      providerIssue(
        "MarketplaceDrift",
        `Marketplace ${identity} must be refreshed before selected bytes can be repaired.`
      )
    );
  }

  const potentialOmittedSelectors = candidateOmittedSelectors(content, inventory);
  const omittedSelectors = Object.freeze(
    marketplaceMatches.length === 1 && marketplaceExact ? potentialOmittedSelectors : []
  );
  if (options.retireOmitted && omittedSelectors.length > 0) {
    needsMutation = true;
    for (const selector of omittedSelectors) {
      issues.push(
        providerIssue(
          "OmittedPluginPresent",
          `Managed plugin ${selector} is absent from the selected complete set.`
        )
      );
    }
  }

  if (mutationIntent && !collision && !failed && needsMutation) {
    if (
      maximumPlannedOperations(
        target,
        marketplace !== undefined,
        marketplaceRefreshRequired,
        members,
        options.retireOmitted ? potentialOmittedSelectors : []
      ) > MAX_OPERATIONS_PER_TARGET
    ) {
      failed = true;
      issues.push(
        providerIssue(
          "DesiredContentInvalid",
          "Selected native changes exceed the per-target operation bound."
        )
      );
    }
    const missing = missingMutationCapabilities(
      target,
      capabilities,
      marketplace !== undefined,
      marketplaceRefreshRequired,
      members,
      options.retireOmitted ? potentialOmittedSelectors : []
    );
    if (missing.length > 0) {
      failed = true;
      issues.push(
        providerIssue(
          "CapabilityMissing",
          `Native provider lacks required commands: ${missing.join(", ")}.`
        )
      );
    }
  }

  return Object.freeze({
    target,
    session,
    capabilities,
    inventory,
    marketplacePresent: marketplace !== undefined,
    marketplaceExact,
    marketplaceRefreshRequired,
    members: Object.freeze(members),
    omittedSelectors,
    facts: Object.freeze(facts),
    issues: Object.freeze(issues.slice(0, MAX_ISSUES_PER_TARGET)),
    collision,
    failed,
    needsMutation,
  });
}

async function reconcileProviderTarget(
  content: SelectedContent,
  assessment: TargetAssessment,
  options: ReconcileOptions
): Promise<ProviderMutationTargetResult> {
  const session = assessment.session;
  const initialInventory = assessment.inventory;
  if (session === undefined || initialInventory === undefined) {
    return failedTarget(assessment.target, [], assessment.facts, [
      ...assessment.issues,
      providerIssue(
        "TargetUnavailable",
        "Native provider session was unavailable after mutation preflight."
      ),
    ]);
  }
  let inventory: NativeProviderInventory = initialInventory;
  const operations: ConfirmedNativeOperation[] = [];
  const issues: ProviderIssue[] = [];
  const forceRefresh = assessment.marketplaceRefreshRequired;

  if (forceRefresh) {
    if (assessment.marketplacePresent) {
      let liveBeforeRemoval: NativeProviderInventory;
      try {
        liveBeforeRemoval = await session.inventory();
      } catch (error) {
        return failedTarget(assessment.target, operations, Object.freeze([]), [
          providerIssue(
            "NativeObservationFailed",
            `Marketplace could not be reobserved before removal: ${nativeFailureDetail(error)}`
          ),
        ]);
      }
      const liveMarketplace = liveBeforeRemoval.marketplaces.filter(
        (marketplace) => marketplace.identity === content.marketplace.identity
      );
      if (
        liveMarketplace.length !== 1 ||
        !marketplaceSourceIsRelated(liveMarketplace[0]!, content.marketplace.source)
      ) {
        return failedTarget(assessment.target, operations, Object.freeze([]), [
          providerIssue(
            "MarketplaceCollision",
            "Marketplace ownership changed after preflight; nothing was removed."
          ),
        ]);
      }
      inventory = liveBeforeRemoval;
      const operation = Object.freeze({
        kind: "marketplace-removed" as const,
        identity: content.marketplace.identity,
      });
      const step = await mutateAndObserve(
        session,
        operation,
        () => session.removeMarketplace({ identity: content.marketplace.identity }),
        (observed) =>
          !observed.marketplaces.some(
            (marketplace) => marketplace.identity === content.marketplace.identity
          )
      );
      const terminal = await mutationTerminal(
        content,
        assessment,
        options,
        operations,
        issues,
        step
      );
      if (terminal !== undefined) return terminal;
      assertCompletedMutationStep(step);
      inventory = step.inventory;
      if (step.kind === "Confirmed") operations.push(operation);
    }
    const operation = Object.freeze({
      kind: "marketplace-added" as const,
      identity: content.marketplace.identity,
    });
    const step = await mutateAndObserve(
      session,
      operation,
      () => session.addMarketplace(content.marketplace.source),
      (observed) => hasOneExactMarketplace(observed, content)
    );
    const terminal = await mutationTerminal(content, assessment, options, operations, issues, step);
    if (terminal !== undefined) return terminal;
    assertCompletedMutationStep(step);
    inventory = step.inventory;
    if (step.kind === "Confirmed") operations.push(operation);
  }

  for (const memberAssessment of assessment.members) {
    const { member, selector } = memberAssessment;
    let live = installedPlugin(inventory, selector);
    if (live !== undefined && (forceRefresh || !memberAssessment.filesMatch)) {
      const operation = Object.freeze({ kind: "plugin-removed" as const, selector });
      const step = await mutateAndObserve(
        session,
        operation,
        () => session.removePlugin({ selector }),
        (observed) => observedPlugin(observed, selector) === undefined
      );
      const terminal = await mutationTerminal(
        content,
        assessment,
        options,
        operations,
        issues,
        step
      );
      if (terminal !== undefined) return terminal;
      assertCompletedMutationStep(step);
      inventory = step.inventory;
      if (step.kind === "Confirmed") operations.push(operation);
      live = undefined;
    }
    if (live === undefined) {
      const operation = Object.freeze({ kind: "plugin-installed" as const, selector });
      const step = await mutateAndObserve(
        session,
        operation,
        () => session.installPlugin({ selector }),
        (observed) => installedPlugin(observed, selector) !== undefined
      );
      const terminal = await mutationTerminal(
        content,
        assessment,
        options,
        operations,
        issues,
        step
      );
      if (terminal !== undefined) return terminal;
      assertCompletedMutationStep(step);
      inventory = step.inventory;
      if (step.kind === "Confirmed") operations.push(operation);
      live = installedPlugin(inventory, selector);
    }
    if (live?.enabled === false && session.provider === "codex") {
      return failedAfterMutation(content, assessment, options, operations, [
        ...issues,
        providerIssue("CapabilityMissing", "Codex did not expose plugin enablement."),
      ]);
    }
    if (live !== undefined && session.provider === "claude" && live.enabled !== true) {
      const operation = Object.freeze({ kind: "plugin-enabled" as const, selector });
      const step = await mutateAndObserve(
        session,
        operation,
        () => session.enablePlugin({ selector }),
        (observed) => installedPlugin(observed, selector)?.enabled === true
      );
      const terminal = await mutationTerminal(
        content,
        assessment,
        options,
        operations,
        issues,
        step
      );
      if (terminal !== undefined) return terminal;
      assertCompletedMutationStep(step);
      inventory = step.inventory;
      if (step.kind === "Confirmed") operations.push(operation);
    }
    const files = verificationFiles(member, assessment.target.provider);
    if (files === null) {
      return failedAfterMutation(content, assessment, options, operations, [
        ...issues,
        providerIssue(
          "DesiredContentInvalid",
          `Plugin ${member.pluginId} lacks a bounded provider verification set.`,
          member.pluginId
        ),
      ]);
    }
    const facts: VerificationFact[] = [];
    const verified = await verifyMemberFiles(session, selector, member.pluginId, files, facts);
    if (!verified.matches) {
      return failedAfterMutation(content, assessment, options, operations, [
        ...issues,
        ...verified.issues,
      ]);
    }
  }

  if (options.retireOmitted) {
    const omittedSelectors = exactManagedOmittedSelectors(content, inventory);
    if (omittedSelectors === null) {
      return failedTarget(assessment.target, operations, Object.freeze([]), [
        ...issues,
        providerIssue(
          "MarketplaceCollision",
          "Managed plugin retirement requires one exact observed marketplace source."
        ),
      ]);
    }
    if (operations.length + omittedSelectors.length > MAX_OPERATIONS_PER_TARGET) {
      return failedTarget(assessment.target, operations, Object.freeze([]), [
        ...issues,
        providerIssue(
          "DesiredContentInvalid",
          "Selected native changes exceed the per-target operation bound."
        ),
      ]);
    }
    for (const selector of omittedSelectors) {
      const operation = Object.freeze({ kind: "plugin-removed" as const, selector });
      const step = await mutateAndObserve(
        session,
        operation,
        () => session.removePlugin({ selector }),
        (observed) => observedPlugin(observed, selector) === undefined
      );
      const terminal = await mutationTerminal(
        content,
        assessment,
        options,
        operations,
        issues,
        step
      );
      if (terminal !== undefined) return terminal;
      assertCompletedMutationStep(step);
      inventory = step.inventory;
      if (step.kind === "Confirmed") operations.push(operation);
    }
  }

  let finalInventory: NativeProviderInventory;
  try {
    finalInventory = await session.inventory();
  } catch (error) {
    return failedTarget(assessment.target, operations, Object.freeze([]), [
      ...issues,
      providerIssue(
        "NativeObservationFailed",
        `Final provider state could not be observed: ${nativeFailureDetail(error)}`
      ),
    ]);
  }
  const finalAssessment = await assessInventory(
    content,
    assessment.target,
    session,
    assessment.capabilities!,
    finalInventory,
    options,
    false
  );
  if (finalAssessment.failed || finalAssessment.collision || finalAssessment.needsMutation) {
    return failedTarget(assessment.target, operations, finalAssessment.facts, [
      ...issues,
      ...finalAssessment.issues,
      providerIssue("VerificationFailed", "Final native provider verification did not converge."),
    ]);
  }
  const completed = {
    target: assessment.target,
    operations: Object.freeze(operations),
    facts: finalAssessment.facts,
    issues: Object.freeze(issues.slice(0, MAX_ISSUES_PER_TARGET)),
  };
  return operations.length === 0
    ? Object.freeze({ ...completed, classification: "Converged" as const })
    : Object.freeze({ ...completed, classification: "Changed" as const });
}

async function mutateAndObserve(
  session: NativeProviderSession,
  operation: ConfirmedNativeOperation,
  mutate: () => Promise<unknown>,
  postcondition: (inventory: NativeProviderInventory) => boolean
): Promise<MutationStep> {
  let phase: NativeProviderCommandPhase = "command-returned";
  try {
    await mutate();
  } catch (error) {
    phase = commandPhase(error);
    try {
      const inventory = await session.inventory();
      if (postcondition(inventory)) {
        return phase === "not-started"
          ? { kind: "AlreadySatisfied", inventory }
          : { kind: "Confirmed", inventory };
      }
      return {
        kind: "Failed",
        issue: providerIssue("NativeCommandFailed", nativeFailureDetail(error)),
      };
    } catch (observationError) {
      if (phase === "not-started") {
        return {
          kind: "Failed",
          issue: providerIssue("NativeCommandFailed", nativeFailureDetail(error)),
        };
      }
      return {
        kind: "Uncertain",
        issue: providerIssue(
          "NativeObservationFailed",
          `Provider state could not be observed after a command started: ${nativeFailureDetail(observationError)}`
        ),
        attempted: { operation, commandPhase: phase },
      };
    }
  }
  try {
    const inventory = await session.inventory();
    return postcondition(inventory)
      ? { kind: "Confirmed", inventory }
      : {
          kind: "Failed",
          issue: providerIssue(
            "VerificationFailed",
            `Native operation ${operation.kind} returned without its postcondition.`
          ),
        };
  } catch (error) {
    return {
      kind: "Uncertain",
      issue: providerIssue(
        "NativeObservationFailed",
        `Provider state could not be observed after a command returned: ${nativeFailureDetail(error)}`
      ),
      attempted: { operation, commandPhase: "command-returned" },
    };
  }
}

async function mutationTerminal(
  content: SelectedContent,
  assessment: TargetAssessment,
  options: ReconcileOptions,
  operations: readonly ConfirmedNativeOperation[],
  issues: readonly ProviderIssue[],
  step: MutationStep
): Promise<ProviderMutationTargetResult | undefined> {
  if (step.kind === "Failed") {
    return failedTarget(
      assessment.target,
      operations,
      await observeTerminalFacts(content, assessment, options),
      [...issues, step.issue]
    );
  }
  if (step.kind === "Uncertain") {
    return Object.freeze({
      target: assessment.target,
      classification: "Uncertain" as const,
      operations: Object.freeze([...operations]),
      attempted: step.attempted,
      facts: await observeTerminalFacts(content, assessment, options),
      issues: Object.freeze([...issues, step.issue].slice(0, MAX_ISSUES_PER_TARGET)),
    });
  }
  return undefined;
}

async function failedAfterMutation(
  content: SelectedContent,
  assessment: TargetAssessment,
  options: ReconcileOptions,
  operations: readonly ConfirmedNativeOperation[],
  issues: readonly ProviderIssue[]
): Promise<ProviderMutationTargetResult> {
  return failedTarget(
    assessment.target,
    operations,
    await observeTerminalFacts(content, assessment, options),
    issues
  );
}

async function observeTerminalFacts(
  content: SelectedContent,
  assessment: TargetAssessment,
  options: ReconcileOptions
): Promise<readonly VerificationFact[]> {
  const session = assessment.session;
  const capabilities = assessment.capabilities;
  if (session === undefined || capabilities === undefined) return Object.freeze([]);
  try {
    const inventory = await session.inventory();
    const observed = await assessInventory(
      content,
      assessment.target,
      session,
      capabilities,
      inventory,
      options,
      false
    );
    return observed.facts;
  } catch {
    return Object.freeze([]);
  }
}

function failedTarget(
  target: ProviderTarget,
  operations: readonly ConfirmedNativeOperation[],
  facts: readonly VerificationFact[],
  issues: readonly ProviderIssue[]
): ProviderMutationTargetResult {
  return Object.freeze({
    target,
    classification: "Failed" as const,
    operations: Object.freeze([...operations]),
    facts: Object.freeze([...facts].slice(0, MAX_FACTS_PER_TARGET)),
    issues: Object.freeze([...issues].slice(0, MAX_ISSUES_PER_TARGET)),
  });
}

async function verifyMemberFiles(
  session: NativeProviderSession,
  selector: string,
  pluginId: SelectedContentMember["pluginId"],
  files: readonly Readonly<{
    path: string;
    contentDigest: string;
    byteLength: number;
  }>[],
  facts: VerificationFact[]
): Promise<Readonly<{ matches: boolean; failed: boolean; issues: readonly ProviderIssue[] }>> {
  const issues: ProviderIssue[] = [];
  let failed = false;
  let observed;
  try {
    observed = await session.readPluginFiles({
      selector,
      files: files.map((file) =>
        Object.freeze({
          relativePath: file.path,
          maxBytes: file.byteLength,
        })
      ),
    });
  } catch (error) {
    return Object.freeze({
      matches: false,
      failed: true,
      issues: Object.freeze([
        providerIssue(
          "NativeObservationFailed",
          `Could not read the selected files for ${selector}: ${nativeFailureDetail(error)}`,
          pluginId
        ),
      ]),
    });
  }
  if (
    !Value.Check(NativeProviderPluginFilesSchema, observed) ||
    observed.selector !== selector ||
    observed.files.length !== files.length
  ) {
    return Object.freeze({
      matches: false,
      failed: true,
      issues: Object.freeze([
        providerIssue(
          "NativeObservationFailed",
          `Native provider returned an invalid file batch for ${selector}.`,
          pluginId
        ),
      ]),
    });
  }
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    const item = observed.files[index]!;
    if (item.relativePath !== file.path) {
      failed = true;
      issues.push(
        providerIssue(
          "NativeObservationFailed",
          `Native provider returned another file for ${selector}/${file.path}.`,
          pluginId
        )
      );
      continue;
    }
    if (item.kind === "Missing" || item.kind === "TooLarge") {
      issues.push(
        providerIssue(
          item.kind === "Missing" ? "PluginFileMissing" : "PluginFileMismatch",
          item.kind === "Missing"
            ? `Installed plugin ${selector} is missing ${file.path}.`
            : `Installed plugin file exceeds the selected size: ${selector}/${file.path}.`,
          pluginId
        )
      );
      continue;
    }
    const bytes = decodeCanonicalBase64(item.contentBase64);
    if (
      bytes === null ||
      item.byteLength !== bytes.byteLength ||
      item.byteLength !== file.byteLength ||
      contentDigest(bytes) !== file.contentDigest
    ) {
      issues.push(
        providerIssue(
          "PluginFileMismatch",
          `Installed plugin file differs from selected content: ${selector}/${file.path}.`,
          pluginId
        )
      );
      continue;
    }
    pushFact(facts, "plugin-file", `${selector}/${file.path}`, file.contentDigest);
  }
  return Object.freeze({ matches: issues.length === 0, failed, issues: Object.freeze(issues) });
}

function missingMutationCapabilities(
  target: ProviderTarget,
  capabilities: NativeProviderCapabilities,
  marketplacePresent: boolean,
  marketplaceRefreshRequired: boolean,
  members: readonly MemberAssessment[],
  omittedSelectors: readonly string[]
): readonly string[] {
  const required = new Set<string>();
  if (marketplaceRefreshRequired) required.add("marketplace-add");
  if (marketplacePresent && marketplaceRefreshRequired) required.add("marketplace-remove");
  for (const member of members) {
    if (!member.installed || !member.filesMatch || marketplaceRefreshRequired) {
      required.add("plugin-install");
    }
    if (member.installed && (!member.filesMatch || marketplaceRefreshRequired)) {
      required.add("plugin-remove");
    }
    if (
      (target.provider === "claude" && (member.enabled !== true || !member.installed)) ||
      (target.provider === "codex" && member.enabled === false)
    ) {
      required.add("plugin-enable");
    }
  }
  if (omittedSelectors.length > 0) required.add("plugin-remove");
  const observed = new Set<string>(capabilities.capabilities);
  return Object.freeze(
    [...required].filter((capability) => !observed.has(capability)).sort(compareText)
  );
}

function maximumPlannedOperations(
  target: ProviderTarget,
  marketplacePresent: boolean,
  marketplaceRefreshRequired: boolean,
  members: readonly MemberAssessment[],
  omittedSelectors: readonly string[]
): number {
  let operations = marketplaceRefreshRequired ? (marketplacePresent ? 2 : 1) : 0;
  for (const member of members) {
    if (!member.installed) operations += 1;
    else if (!member.filesMatch || marketplaceRefreshRequired) operations += 2;
    if (target.provider === "claude" && (member.enabled !== true || !member.installed)) {
      operations += 1;
    }
  }
  return operations + omittedSelectors.length;
}

function assertCompletedMutationStep(step: MutationStep): asserts step is MutationConfirmed {
  if (step.kind !== "Confirmed" && step.kind !== "AlreadySatisfied") {
    throw new Error("Mutation terminal classification was not returned");
  }
}

function unavailableAssessment(
  target: ProviderTarget,
  detail: string,
  error?: unknown,
  session?: NativeProviderSession
): TargetAssessment {
  return Object.freeze({
    target,
    ...(session === undefined ? {} : { session }),
    marketplaceExact: false,
    marketplacePresent: false,
    marketplaceRefreshRequired: false,
    members: Object.freeze([]),
    omittedSelectors: Object.freeze([]),
    facts: Object.freeze([]),
    issues: Object.freeze([
      providerIssue(
        "TargetUnavailable",
        error === undefined ? detail : `${detail}: ${nativeFailureDetail(error)}`
      ),
    ]),
    collision: false,
    failed: true,
    needsMutation: false,
  });
}

function installedPlugin(
  inventory: NativeProviderInventory,
  selector: string
): NativeProviderPluginObservation | undefined {
  return inventory.plugins.find((plugin) => plugin.selector === selector && plugin.installed);
}

function observedPlugin(
  inventory: NativeProviderInventory,
  selector: string
): NativeProviderPluginObservation | undefined {
  return inventory.plugins.find((plugin) => plugin.selector === selector);
}

function hasOneExactMarketplace(
  inventory: NativeProviderInventory,
  content: SelectedContent
): boolean {
  const matches = inventory.marketplaces.filter(
    (marketplace) => marketplace.identity === content.marketplace.identity
  );
  return matches.length === 1 && marketplaceSourceMatches(matches[0]!, content.marketplace.source);
}

function marketplaceRevisionIsUnobservable(
  observed: NativeProviderInventory["marketplaces"][number] | undefined,
  desired: SelectedContent["marketplace"]["source"]
): boolean {
  return (
    desired.kind === "git" &&
    observed?.source?.kind === "git" &&
    observed.source.repositoryUrl === desired.repositoryUrl &&
    observed.source.revision === null
  );
}

function exactManagedOmittedSelectors(
  content: SelectedContent,
  inventory: NativeProviderInventory
): readonly string[] | null {
  return hasOneExactMarketplace(inventory, content)
    ? candidateOmittedSelectors(content, inventory)
    : null;
}

function candidateOmittedSelectors(
  content: SelectedContent,
  inventory: NativeProviderInventory
): readonly string[] {
  const desiredNames = new Set<string>(content.members.map((member) => member.pluginId));
  return Object.freeze(
    [
      ...new Set(
        inventory.plugins
          .filter(
            (plugin) =>
              plugin.marketplaceIdentity === content.marketplace.identity &&
              !desiredNames.has(plugin.name)
          )
          .map((plugin) => plugin.selector)
      ),
    ].sort(compareText)
  );
}

function pushFact(
  facts: VerificationFact[],
  kind: VerificationFact["kind"],
  subject: string,
  detail: string
): void {
  if (facts.length >= MAX_FACTS_PER_TARGET) return;
  facts.push(Object.freeze({ kind, subject, detail }));
}

function decodeCanonicalBase64(value: string): Uint8Array | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    return null;
  }
  const bytes = Buffer.from(value, "base64");
  return bytes.toString("base64") === value ? new Uint8Array(bytes) : null;
}

function commandPhase(error: unknown): NativeProviderCommandPhase {
  return isNativeFailure(error) ? error.commandPhase : "started";
}

function isNativeFailure(error: unknown): error is NativeAgentProviderFailure {
  return isNativeAgentProviderFailure(error);
}

function nativeFailureDetail(error: unknown): string {
  if (isNativeFailure(error)) return error.detail;
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "Native provider failed without a readable diagnostic.";
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

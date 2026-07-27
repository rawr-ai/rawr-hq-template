import type {
  NativeMarketplaceSource,
  NativeProviderCapabilities,
  NativeProviderInventory,
  NativeProviderMarketplaceObservation,
  NativeProviderPluginFiles,
  NativeProviderPluginObservation,
} from "@rawr/resource-native-agent-provider";
import {
  MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES,
  MAX_NATIVE_PROVIDER_PLUGIN_FILES,
} from "@rawr/resource-native-agent-provider";

import { contentDigest } from "../../../../shared/release";
import { decodeBase64 } from "../../../../shared/release/canonical";
import type {
  ProviderId,
  ProviderIssue,
  ProviderMutationTargetResult,
  ProviderStatusTargetResult,
  ProviderTarget,
  VerificationFact,
} from "../dto/provider-lifecycle";
import {
  MAX_CONFIRMED_NATIVE_OPERATIONS,
  MAX_PROVIDER_FACTS,
  MAX_PROVIDER_ISSUES,
} from "../dto/provider-lifecycle";
import type {
  SelectedContent,
  SelectedContentFile,
  SelectedContentMember,
} from "../dto/selected-content";
import { providerIssue } from "./selected-content";

const MAX_OPERATIONS_PER_TARGET = MAX_CONFIRMED_NATIVE_OPERATIONS;

const MAX_PROVIDER_VERIFICATION_FILES = MAX_NATIVE_PROVIDER_PLUGIN_FILES;

/** Determines whether canonical sync may retire omitted managed plugins. */
export interface NativeReconciliationPolicy {
  readonly retireOmitted: boolean;
}

/** One bounded native file batch selected for procedure-owned observation. */
export interface NativePluginFileReadPlan {
  readonly member: SelectedContentMember;
  readonly selector: string;
  readonly files: readonly SelectedContentFile[];
}

/** Pure classification of one native file batch against selected bytes. */
export interface NativePluginFileAssessment {
  readonly selector: string;
  readonly matches: boolean;
  readonly failed: boolean;
  readonly facts: readonly VerificationFact[];
  readonly issues: readonly ProviderIssue[];
}

interface NativeMemberAssessment {
  readonly member: SelectedContentMember;
  readonly selector: string;
  readonly installed: boolean;
  readonly enabled: boolean | null;
  readonly filesMatch: boolean;
}

interface NativeTargetAssessmentBase {
  readonly target: ProviderTarget;
  readonly marketplacePresent: boolean;
  readonly marketplaceExact: boolean;
  readonly marketplaceRefreshRequired: boolean;
  readonly members: readonly NativeMemberAssessment[];
  readonly facts: readonly VerificationFact[];
  readonly issues: readonly ProviderIssue[];
  readonly collision: boolean;
  readonly failed: boolean;
  readonly needsMutation: boolean;
}

/** Validated native target state available for status or mutation planning. */
export interface NativeAvailableTargetAssessment extends NativeTargetAssessmentBase {
  readonly kind: "Available";
  readonly capabilities: NativeProviderCapabilities;
  readonly inventory: NativeProviderInventory;
}

/** Typed target refusal produced when native observation cannot be admitted. */
export interface NativeUnavailableTargetAssessment extends NativeTargetAssessmentBase {
  readonly kind: "Unavailable";
  readonly marketplacePresent: false;
  readonly marketplaceExact: false;
  readonly marketplaceRefreshRequired: false;
  readonly collision: false;
  readonly failed: true;
  readonly needsMutation: false;
}

/** Effect-free Provider preflight result; live sessions remain procedure-local. */
export type NativeTargetAssessment =
  | NativeAvailableTargetAssessment
  | NativeUnavailableTargetAssessment;

function providerPluginSelector(member: SelectedContentMember, identity: string): string {
  return `${member.pluginId}@${identity}`;
}

/** Determines whether an observed marketplace is the exact selected source. */
export function marketplaceSourceMatches(
  observed: NativeProviderMarketplaceObservation,
  desired: NativeMarketplaceSource
): boolean {
  const source = observed.source;
  if (source === null || source.kind !== desired.kind) return false;
  if (source.kind === "local" && desired.kind === "local") return source.root === desired.root;
  if (source.kind !== "git" || desired.kind !== "git") return false;
  return (
    source.repositoryUrl === desired.repositoryUrl &&
    (source.revision === null || source.revision === desired.revision)
  );
}

/** Determines whether an observed marketplace belongs to the selected source family. */
export function marketplaceSourceIsRelated(
  observed: NativeProviderMarketplaceObservation,
  desired: NativeMarketplaceSource
): boolean {
  const source = observed.source;
  if (source === null || source.kind !== desired.kind) return false;
  if (source.kind === "git" && desired.kind === "git") {
    return source.repositoryUrl === desired.repositoryUrl;
  }
  return source.kind === "local" && desired.kind === "local" && source.root === desired.root;
}

/** Selects the bounded payload manifest required for native file verification. */
export function verificationFiles(
  member: SelectedContentMember,
  provider: ProviderId
): readonly SelectedContentFile[] | null {
  const manifestPath =
    provider === "codex" ? ".codex-plugin/plugin.json" : ".claude-plugin/plugin.json";
  if (!member.manifest.some((file) => file.path === manifestPath)) return null;
  if (member.manifest.length > MAX_PROVIDER_VERIFICATION_FILES) return null;
  return Object.freeze(
    [...member.manifest].sort((left, right) => compareText(left.path, right.path))
  );
}

/**
 * Plans the exact native file batches required to assess installed selected members.
 *
 * @remarks
 * The procedure executes these plans in selected-member order. Policy receives
 * only admitted observations and never retains the live provider session.
 */
export function planNativePluginFileReads(
  content: SelectedContent,
  target: ProviderTarget,
  inventory: NativeProviderInventory
): readonly NativePluginFileReadPlan[] {
  const plans: NativePluginFileReadPlan[] = [];
  for (const member of content.members) {
    const selector = providerPluginSelector(member, content.marketplace.identity);
    if (installedPlugin(inventory, selector) === undefined) continue;
    const files = verificationFiles(member, target.provider);
    if (files === null) continue;
    plans.push(Object.freeze({ member, selector, files }));
  }
  return Object.freeze(plans);
}

/**
 * Classifies one TypeBox-admitted native file batch against selected bytes.
 *
 * @remarks
 * Structural validation belongs to the procedure boundary. This policy owns
 * exact member identity, ordering, byte length, and digest semantics.
 */
export function assessNativePluginFiles(
  plan: NativePluginFileReadPlan,
  observed: NativeProviderPluginFiles
): NativePluginFileAssessment {
  const facts: VerificationFact[] = [];
  const issues: ProviderIssue[] = [];
  let failed = false;
  if (observed.selector !== plan.selector || observed.files.length !== plan.files.length) {
    return failedNativePluginFiles(
      plan,
      `Native provider returned an invalid file batch for ${plan.selector}.`
    );
  }
  for (const [index, file] of plan.files.entries()) {
    const item = observed.files.at(index);
    if (item === undefined) {
      return failedNativePluginFiles(
        plan,
        `Native provider omitted a file observation for ${plan.selector}/${file.path}.`
      );
    }
    if (item.relativePath !== file.path) {
      failed = true;
      issues.push(
        providerIssue(
          "NativeObservationFailed",
          `Native provider returned another file for ${plan.selector}/${file.path}.`,
          plan.member.pluginId
        )
      );
      continue;
    }
    if (item.kind === "Missing" || item.kind === "TooLarge") {
      issues.push(
        providerIssue(
          item.kind === "Missing" ? "PluginFileMissing" : "PluginFileMismatch",
          item.kind === "Missing"
            ? `Installed plugin ${plan.selector} is missing ${file.path}.`
            : `Installed plugin file exceeds the selected size: ${plan.selector}/${file.path}.`,
          plan.member.pluginId
        )
      );
      continue;
    }
    const decoded = decodeBase64(
      item.contentBase64,
      `nativeProviderPluginFiles.${plan.selector}.${file.path}`
    );
    const bytes = decoded.ok ? decoded.value : null;
    if (
      bytes === null ||
      bytes.byteLength > MAX_NATIVE_PROVIDER_PLUGIN_FILE_BYTES ||
      item.byteLength !== bytes.byteLength ||
      item.byteLength !== file.byteLength ||
      contentDigest(bytes) !== file.contentDigest
    ) {
      issues.push(
        providerIssue(
          "PluginFileMismatch",
          `Installed plugin file differs from selected content: ${plan.selector}/${file.path}.`,
          plan.member.pluginId
        )
      );
      continue;
    }
    pushFact(facts, "plugin-file", `${plan.selector}/${file.path}`, file.contentDigest);
  }
  return Object.freeze({
    selector: plan.selector,
    matches: issues.length === 0,
    failed,
    facts: Object.freeze(facts),
    issues: Object.freeze(issues),
  });
}

/** Classifies a typed or structurally invalid native file observation. */
export function failedNativePluginFiles(
  plan: NativePluginFileReadPlan,
  detail: string
): NativePluginFileAssessment {
  return Object.freeze({
    selector: plan.selector,
    matches: false,
    failed: true,
    facts: Object.freeze([]),
    issues: Object.freeze([providerIssue("NativeObservationFailed", detail, plan.member.pluginId)]),
  });
}

/**
 * Assesses one validated native target from procedure-observed inventory and file facts.
 *
 * @param content - Exact selected content whose native state is assessed.
 * @param target - Canonical provider target associated with the observation.
 * @param capabilities - TypeBox-admitted provider command capabilities.
 * @param inventory - TypeBox-admitted live provider inventory.
 * @param fileAssessments - Pure classifications of procedure-owned file reads.
 * @param policy - Omitted-member policy for the calling operation.
 * @param mutationIntent - Whether missing command capabilities block this preflight.
 */
export function assessNativeTarget(
  content: SelectedContent,
  target: ProviderTarget,
  capabilities: NativeProviderCapabilities,
  inventory: NativeProviderInventory,
  fileAssessments: readonly NativePluginFileAssessment[],
  policy: NativeReconciliationPolicy,
  mutationIntent: boolean
): NativeAvailableTargetAssessment {
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
    if (live.marketplaceIdentity === identity || !desiredNames.has(live.name)) continue;
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

  const members: NativeMemberAssessment[] = [];
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
    const verified = fileAssessments.find((assessment) => assessment.selector === selector);
    if (verified === undefined) {
      failed = true;
      needsMutation = true;
      issues.push(
        providerIssue(
          "NativeObservationFailed",
          `Native provider did not return the selected file batch for ${selector}.`,
          member.pluginId
        )
      );
      members.push({ member, selector, installed: true, enabled, filesMatch: false });
      continue;
    }
    for (const fact of verified.facts) pushFact(facts, fact.kind, fact.subject, fact.detail);
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

  const candidateOmitted = candidateOmittedSelectors(content, inventory);
  const omittedSelectors = Object.freeze(
    marketplaceMatches.length === 1 && marketplaceExact ? candidateOmitted : []
  );
  if (policy.retireOmitted && omittedSelectors.length > 0) {
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
        policy.retireOmitted ? candidateOmitted : []
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
      policy.retireOmitted ? candidateOmitted : []
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
    kind: "Available",
    target,
    capabilities,
    inventory,
    marketplacePresent: marketplace !== undefined,
    marketplaceExact,
    marketplaceRefreshRequired,
    members: Object.freeze(members),
    facts: Object.freeze(facts),
    issues: Object.freeze(issues.slice(0, MAX_PROVIDER_ISSUES)),
    collision,
    failed,
    needsMutation,
  });
}

/** Projects a typed or structurally invalid native observation as unavailable. */
export function unavailableNativeTarget(
  target: ProviderTarget,
  detail: string
): NativeUnavailableTargetAssessment {
  return Object.freeze({
    kind: "Unavailable",
    target,
    marketplaceExact: false,
    marketplacePresent: false,
    marketplaceRefreshRequired: false,
    members: Object.freeze([]),
    facts: Object.freeze([]),
    issues: Object.freeze([providerIssue("TargetUnavailable", detail)]),
    collision: false,
    failed: true,
    needsMutation: false,
  });
}

/** Projects one pure native assessment into the read-only status contract. */
export function statusTargetResult(assessment: NativeTargetAssessment): ProviderStatusTargetResult {
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

/** Projects a mutation preflight that already matches selected content. */
export function convergedMutationTargetResult(
  assessment: NativeAvailableTargetAssessment
): ProviderMutationTargetResult {
  return Object.freeze({
    target: assessment.target,
    classification: "Converged",
    operations: Object.freeze([]),
    facts: assessment.facts,
    issues: assessment.issues,
  });
}

/** Projects one all-target mutation refusal without losing target-local observations. */
export function blockedTargetResults(
  assessments: readonly NativeTargetAssessment[]
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
            ].slice(0, MAX_PROVIDER_ISSUES)
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

/** Determines whether one full preflight blocks every target mutation. */
export function hasBlockingAssessment(assessments: readonly NativeTargetAssessment[]): boolean {
  return assessments.some((assessment) => assessment.collision || assessment.failed);
}

/** Determines whether every available target already matches the selected content. */
export function allTargetsConverged(
  assessments: readonly NativeTargetAssessment[]
): assessments is readonly NativeAvailableTargetAssessment[] {
  return assessments.every(
    (assessment) =>
      assessment.kind === "Available" &&
      !assessment.collision &&
      !assessment.failed &&
      !assessment.needsMutation
  );
}

/** Selects one installed native plugin observation by exact selector. */
export function installedPlugin(
  inventory: NativeProviderInventory,
  selector: string
): NativeProviderPluginObservation | undefined {
  return inventory.plugins.find((plugin) => plugin.selector === selector && plugin.installed);
}

/** Selects one native plugin observation regardless of installed state. */
export function observedPlugin(
  inventory: NativeProviderInventory,
  selector: string
): NativeProviderPluginObservation | undefined {
  return inventory.plugins.find((plugin) => plugin.selector === selector);
}

/** Determines whether inventory contains exactly one selected marketplace source. */
export function hasOneExactMarketplace(
  inventory: NativeProviderInventory,
  content: SelectedContent
): boolean {
  const matches = inventory.marketplaces.filter(
    (marketplace) => marketplace.identity === content.marketplace.identity
  );
  const marketplace = matches.at(0);
  return (
    matches.length === 1 &&
    marketplace !== undefined &&
    marketplaceSourceMatches(marketplace, content.marketplace.source)
  );
}

/** Selects omitted managed plugins only when marketplace provenance is exact. */
export function exactManagedOmittedSelectors(
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

function missingMutationCapabilities(
  target: ProviderTarget,
  capabilities: NativeProviderCapabilities,
  marketplacePresent: boolean,
  marketplaceRefreshRequired: boolean,
  members: readonly NativeMemberAssessment[],
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
  members: readonly NativeMemberAssessment[],
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

function pushFact(
  facts: VerificationFact[],
  kind: VerificationFact["kind"],
  subject: string,
  detail: string
): void {
  if (facts.length >= MAX_PROVIDER_FACTS) return;
  facts.push(Object.freeze({ kind, subject, detail }));
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

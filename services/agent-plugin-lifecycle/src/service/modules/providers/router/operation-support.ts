import type { ContentAuthority, VerifiedArtifactSnapshotV1 } from "../../../shared/release";

import { equalBytes } from "../model/helpers/canonical";
import { marketplaceState, sameMarketplaceState } from "../model/policy/marketplace";
import {
  createMechanicalProviderEvidence,
  type MechanicalEvidenceSource,
  type ProviderVerificationFact,
} from "../model/dto/mechanical-evidence";
import type { EvaluationProfile } from "../model/dto/mode";
import type { ProviderEvent, ProviderOperationOutcome, TargetOperationOutcome } from "../model/dto/outcome";
import {
  evaluateCapabilities,
  renderCompleteProjection,
  renderTargetedProjection,
  type AgentProviderProjection,
  type CapabilityObservation,
} from "../model/policy/projection";
import { failure, issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../model/errors/deployment-result";
import {
  planTarget,
  type DeploymentAuthority,
  type ProviderMutationAction,
  type ProviderMutationPostState,
  type ProviderTargetPlan,
} from "../model/policy/state-machine";
import { visibleFingerprint, type ManagedMemberClaim } from "../model/policy/receipt";
import type { ProviderTarget } from "../model/dto/provider-target";
import type { ProviderUndoSession, ProviderUndoWriter } from "../ports/undo-writer";
import type { MechanicalEvidencePublisher } from "../ports/evidence";
import type { ProviderTargetMutator, ProviderTargetReader } from "../ports/provider";
import type {
  ProviderMarketplaceMaterializer,
  ProviderPriorProjectionReader,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "../ports/state";

export interface PlanReadDependencies {
  readonly provider: ProviderTargetReader;
  readonly receipts: TargetReceiptReader;
  readonly identities: TargetIdentityReader;
}

export interface ApplyDependencies {
  readonly provider: ProviderTargetReader;
  readonly undoWriter: ProviderUndoWriter;
  readonly marketplaceMaterializer: ProviderMarketplaceMaterializer;
  readonly applyAction: (action: ProviderMutationAction) => Promise<DeploymentResult<ProviderMutationPostState>>;
}

export interface ProjectionApplyDependencies extends ApplyDependencies {
  readonly projectionMaterializer: ProviderProjectionMaterializer;
  readonly priorProjections: ProviderPriorProjectionReader;
}

export interface InverseApplyDependencies extends ApplyDependencies {
  readonly priorProjections: ProviderPriorProjectionReader;
}

export interface DeploymentMutationPorts {
  readonly providerMutator: ProviderTargetMutator;
  readonly receiptWriter: TargetReceiptWriter;
  readonly identityWriter: TargetIdentityWriter;
}

export interface RetireMutationPorts {
  readonly providerMutator: ProviderTargetMutator;
  readonly receiptWriter: TargetReceiptWriter;
  readonly identityWriter: TargetIdentityWriter;
}

interface ProjectionPlanInputBase {
  readonly targets: readonly ProviderTarget[];
  readonly dependencies: PlanReadDependencies;
  readonly authority: (projection: AgentProviderProjection) => DeploymentResult<DeploymentAuthority>;
}

interface CompleteProjectionPlanInput extends ProjectionPlanInputBase {
  readonly snapshot: VerifiedArtifactSnapshotV1;
  readonly sourceKind: "complete";
}

interface TargetedProjectionPlanInput extends ProjectionPlanInputBase {
  readonly snapshot: readonly VerifiedArtifactSnapshotV1[];
  readonly sourceKind: "targeted";
}

type ProjectionPlanInput = CompleteProjectionPlanInput | TargetedProjectionPlanInput;

export async function createProjectionPlans(input: ProjectionPlanInput): Promise<readonly ProviderTargetPlan[]> {
  const plans: ProviderTargetPlan[] = [];
  for (const target of input.targets) {
    const adapterProtocol = input.dependencies.provider.projectionAdapterProtocol(target);
    if (!adapterProtocol.ok) {
      plans.push(blocked(target, null, adapterProtocol.issues));
      continue;
    }
    const projectionResult = input.sourceKind === "complete"
      ? renderCompleteProjection(target.provider, adapterProtocol.value, input.snapshot)
      : renderTargetedProjection(target.provider, adapterProtocol.value, input.snapshot);
    if (!projectionResult.ok) {
      plans.push(blocked(target, null, projectionResult.issues));
      continue;
    }
    const [capabilityResult, inventoryResult, receiptResult, identityResult] = await Promise.all([
      input.dependencies.provider.inspectCapabilities(target, projectionResult.value.artifactAuthority.contentAuthority),
      input.dependencies.provider.readInventory(target, projectionResult.value.artifactAuthority.contentAuthority),
      input.dependencies.receipts.read(target),
      input.dependencies.identities.read(target),
    ]);
    const readIssues = collectReadIssues([capabilityResult, inventoryResult, receiptResult, identityResult]);
    if (!capabilityResult.ok || !inventoryResult.ok || !receiptResult.ok || !identityResult.ok) {
      plans.push(blocked(target, projectionResult.value, readIssues));
      continue;
    }
    const authority = input.authority(projectionResult.value);
    if (!authority.ok) {
      plans.push(blocked(target, projectionResult.value, authority.issues));
      continue;
    }
    plans.push(planTarget({
      authority: authority.value,
      inventory: inventoryResult.value,
      receipt: receiptResult.value,
      targetIdentity: identityResult.value,
      capabilities: evaluateCapabilities(projectionResult.value.capabilityProfile, capabilityResult.value),
    }));
  }
  return Object.freeze(plans);
}

export async function inspectTargetsAsBlocked(
  targets: readonly ProviderTarget[],
  _dependencies: PlanReadDependencies,
  baseIssues: readonly ProviderDeploymentIssue[],
): Promise<readonly ProviderTargetPlan[]> {
  const plans: ProviderTargetPlan[] = [];
  for (const target of targets) {
    plans.push(blocked(target, null, baseIssues));
  }
  return Object.freeze(plans);
}

export async function executePlans(
  plans: readonly ProviderTargetPlan[],
  dependencies: InverseApplyDependencies,
): Promise<readonly TargetOperationOutcome[]> {
  return await executePlansInternal(plans, dependencies, null, dependencies.priorProjections);
}

export async function executeProjectionPlans(
  plans: readonly ProviderTargetPlan[],
  dependencies: ProjectionApplyDependencies,
): Promise<readonly TargetOperationOutcome[]> {
  return await executePlansInternal(
    plans,
    dependencies,
    dependencies.projectionMaterializer,
    dependencies.priorProjections,
  );
}

async function executePlansInternal(
  plans: readonly ProviderTargetPlan[],
  dependencies: ApplyDependencies,
  projectionMaterializer: ProviderProjectionMaterializer | null,
  priorProjections: ProviderPriorProjectionReader,
): Promise<readonly TargetOperationOutcome[]> {
  const outcomes = new Map<string, TargetOperationOutcome>();
  const readOnly = plans.filter((plan) => plan.state === "read-only");
  const mutating = plans.filter((plan) => plan.state === "mutating");
  for (const plan of plans.filter((entry) => entry.state === "blocked")) {
    outcomes.set(plan.target.targetDigest, blockedOutcome(plan));
  }
  for (const plan of readOnly) {
    outcomes.set(plan.target.targetDigest, await executeReadOnlyPlan(plan, dependencies.provider));
  }
  if (mutating.length === 0) return orderOutcomes(plans, outcomes);

  const eligible: ProviderTargetPlan[] = [];
  for (const plan of mutating) {
    const projectionIssues = projectionMaterializer === null
      ? []
      : await materializeRequiredProjections([plan], projectionMaterializer);
    if (projectionIssues.length > 0) {
      outcomes.set(plan.target.targetDigest, failedBeforeApply(plan, projectionIssues));
      continue;
    }
    const marketplaceIssues = await materializeRequiredMarketplaces([plan], dependencies.marketplaceMaterializer);
    if (marketplaceIssues.length > 0) {
      outcomes.set(plan.target.targetDigest, failedBeforeApply(plan, marketplaceIssues));
      continue;
    }
    const inverseIssues = await verifyInverseSources([plan], priorProjections);
    if (inverseIssues.length > 0) {
      outcomes.set(plan.target.targetDigest, failedBeforeApply(plan, inverseIssues));
      continue;
    }
    eligible.push(plan);
  }
  if (eligible.length === 0) return orderOutcomes(plans, outcomes);

  const candidate = Object.freeze({ protocol: "agent-plugin-lifecycle/provider-undo@v1" as const, plans: Object.freeze(eligible) });
  const preflight = await dependencies.undoWriter.preflight(candidate);
  if (!preflight.ok) {
    for (const plan of eligible) outcomes.set(plan.target.targetDigest, failedBeforeApply(plan, preflight.issues));
    return orderOutcomes(plans, outcomes);
  }
  const begun = await dependencies.undoWriter.begin(candidate);
  if (!begun.ok) {
    for (const plan of eligible) outcomes.set(plan.target.targetDigest, failedBeforeApply(plan, begun.issues));
    return orderOutcomes(plans, outcomes);
  }

  let capsuleUsable = true;
  const aggregateIssues: ProviderDeploymentIssue[] = [];
  for (const plan of eligible) {
    if (!capsuleUsable) {
      const unavailable = [issue("CAPSULE_FAILED", "capsule", "Capsule session became unavailable before this target")];
      aggregateIssues.push(...unavailable);
      outcomes.set(plan.target.targetDigest, failedBeforeApply(plan, unavailable));
      continue;
    }
    const result = await executeMutatingPlan(plan, dependencies, begun.value);
    outcomes.set(plan.target.targetDigest, result.outcome);
    aggregateIssues.push(...result.outcome.issues);
    if (result.capsuleFailed) capsuleUsable = false;
  }
  const terminal = aggregateIssues.length > 0
    ? await begun.value.fail(aggregateIssues)
    : await begun.value.settle();
  if (!terminal.ok) {
    const terminalIssues = terminal.issues;
    for (const plan of eligible) {
      const prior = outcomes.get(plan.target.targetDigest);
      if (prior !== undefined) outcomes.set(plan.target.targetDigest, appendFailure(prior, terminalIssues));
    }
  }
  return orderOutcomes(plans, outcomes);
}

async function verifyInverseSources(
  plans: readonly ProviderTargetPlan[],
  priorProjections: ProviderPriorProjectionReader,
): Promise<readonly ProviderDeploymentIssue[]> {
  const priorMembers = new Map<
    string,
    Readonly<{
      projectionDigest: Extract<ProviderMutationAction, { kind: "EnableMember" | "RetireMember" }>["priorProjectionDigest"];
      prior: Extract<ProviderMutationAction, { kind: "EnableMember" | "RetireMember" }>["prior"];
    }>
  >();
  for (const plan of plans) {
    for (const step of plan.steps) {
      if (
        step.kind === "mutate"
        && (step.action.kind === "EnableMember" || step.action.kind === "RetireMember")
      ) {
        priorMembers.set(
          `${step.action.priorProjectionDigest}/${step.action.prior.memberFingerprint}`,
          Object.freeze({ projectionDigest: step.action.priorProjectionDigest, prior: step.action.prior }),
        );
      }
    }
  }
  const issues: ProviderDeploymentIssue[] = [];
  for (const { projectionDigest, prior } of priorMembers.values()) {
    const source = await priorProjections.readArchivedMember(projectionDigest, prior);
    if (!source.ok) issues.push(...source.issues);
  }
  return Object.freeze(issues);
}

async function materializeRequiredProjections(
  plans: readonly ProviderTargetPlan[],
  materializer: ProviderProjectionMaterializer,
): Promise<readonly ProviderDeploymentIssue[]> {
  const projections = new Map<string, AgentProviderProjection>();
  for (const plan of plans) {
    if (plan.projection === null) {
      return [issue("PROJECTION_MISMATCH", "target.plan.projection", "Mutating deployment plan has no provider projection")];
    }
    projections.set(plan.projection.projectionDigest, plan.projection);
  }
  const issues: ProviderDeploymentIssue[] = [];
  for (const projection of projections.values()) {
    const materialized = await materializer.materialize(projection);
    if (!materialized.ok) issues.push(...materialized.issues);
  }
  return Object.freeze(issues);
}

async function materializeRequiredMarketplaces(
  plans: readonly ProviderTargetPlan[],
  materializer: ProviderMarketplaceMaterializer,
): Promise<readonly ProviderDeploymentIssue[]> {
  const registrations = new Map<
    string,
    Readonly<{
      provider: ProviderTarget["provider"];
      registration: NonNullable<Extract<ProviderMutationAction, { kind: "SetMarketplace" }>["registration"]>;
    }>
  >();
  for (const plan of plans) {
    for (const step of plan.steps) {
      if (step.kind !== "mutate") continue;
      const registration = step.action.kind === "SetMarketplace"
        ? step.action.registration
        : step.action.kind === "InstallMember"
          || step.action.kind === "EnableMember"
          ? step.action.activeMarketplace
          : null;
      if (registration !== null) {
        registrations.set(registration.projectionDigest, Object.freeze({
          provider: step.action.target.provider,
          registration,
        }));
      }
    }
  }
  const issues: ProviderDeploymentIssue[] = [];
  for (const { provider, registration } of registrations.values()) {
    const materialized = await materializer.materialize(provider, registration);
    if (!materialized.ok) issues.push(...materialized.issues);
  }
  return Object.freeze(issues);
}

export async function attachMechanicalEvidence(
  outcome: ProviderOperationOutcome,
  plans: readonly ProviderTargetPlan[],
  source: MechanicalEvidenceSource,
  evaluationProfile: EvaluationProfile,
  publisher: MechanicalEvidencePublisher,
): Promise<ProviderOperationOutcome> {
  const facts: ProviderVerificationFact[] = [];
  for (const plan of plans) {
    if (plan.projection === null) continue;
    const targetOutcome = outcome.targets.find((candidate) => candidate.target.targetDigest === plan.target.targetDigest);
    if (targetOutcome === undefined) continue;
    const common = {
      targetDigest: plan.target.targetDigest,
      provider: plan.target.provider,
      projectionDigest: plan.projection.projectionDigest,
      adapterProtocol: plan.projection.adapterProtocol,
      capabilityProfileDigest: plan.projection.capabilityProfile.capabilityProfileDigest,
      payloadDigests: plan.projection.members.map((member) => member.releaseRef.artifactDigest),
    } as const;
    facts.push(targetOutcome.status === "failed" || targetOutcome.status === "blocked"
      ? Object.freeze({
        kind: "failed",
        ...common,
        failureCodes: targetOutcome.issues.length === 0
          ? ["VISIBILITY_FAILED" as const]
          : targetOutcome.issues.map((entry) => entry.code),
      })
      : Object.freeze({ kind: "verified", ...common, visibleFingerprint: targetOutcome.visibleFingerprint ?? "unavailable" }));
  }
  if (facts.length !== plans.length) return outcome;
  const evidence = createMechanicalProviderEvidence(source, evaluationProfile, facts);
  const inspected = await publisher.inspect(evidence.evidenceDigest);
  if (!inspected.ok) return evidenceFailure(outcome, inspected.issues);
  if (inspected.value.kind === "present") {
    return equalBytes(inspected.value.bytes, evidence.bytes)
      ? Object.freeze({ ...outcome, evidence: inspected.value.handle.evidenceDigest })
      : evidenceFailure(outcome, [issue("EVIDENCE_FAILED", "evidence", "Existing evidence bytes do not match their digest")]);
  }
  const published = await publisher.publish(evidence);
  return published.ok
    ? Object.freeze({ ...outcome, evidence: published.value.evidenceDigest })
    : evidenceFailure(outcome, published.issues);
}

export function aggregateOutcome(targets: readonly TargetOperationOutcome[]): ProviderOperationOutcome {
  const issues = targets.flatMap((target) => target.issues);
  const failures = targets.filter((target) => target.status === "blocked" || target.status === "failed");
  const successes = targets.filter((target) => target.status === "mutated" || target.status === "read-only-converged");
  const status = failures.length === 0
    ? targets.some((target) => target.status === "mutated") ? "Mutated" : "ReadOnlyConverged"
    : successes.length > 0
      ? "PartialFailure"
      : targets.every((target) => target.status === "blocked") ? "Blocked" : "Failed";
  return Object.freeze({ status, targets: Object.freeze([...targets]), evidence: null, issues: Object.freeze(issues) });
}

export function capabilityReadIssue(observation: CapabilityObservation, projection: AgentProviderProjection): readonly ProviderDeploymentIssue[] {
  const evaluation = evaluateCapabilities(projection.capabilityProfile, observation);
  return evaluation.compatible
    ? []
    : [issue("CAPABILITY_MISMATCH", "target.capabilities", "Provider capability profile is incompatible", evaluation.missing.join(","), "missing")];
}

async function executeReadOnlyPlan(
  plan: ProviderTargetPlan,
  provider: ProviderTargetReader,
): Promise<TargetOperationOutcome> {
  if (plan.projection === null) {
    return Object.freeze({
      target: plan.target,
      status: "read-only-converged",
      events: Object.freeze([
        Object.freeze({ phase: "planned", target: plan.target, plan }),
        Object.freeze({ phase: "skipped", target: plan.target, reason: "read-only-converged" }),
      ]),
      issues: Object.freeze([]),
      visibleFingerprint: null,
    });
  }
  const verified = await provider.verifyProjection(plan.target, plan.projection);
  if (!verified.ok) {
    return Object.freeze({
      target: plan.target,
      status: "failed",
      events: Object.freeze([
        Object.freeze({ phase: "planned", target: plan.target, plan }),
        Object.freeze({ phase: "failed", target: plan.target, issues: verified.issues }),
      ]),
      issues: verified.issues,
      visibleFingerprint: null,
    });
  }
  const managedStep = plan.steps.find((step) => step.kind === "verify-managed");
  if (managedStep !== undefined) {
    const managed = await verifyManagedTarget(
      provider,
      plan.target,
      managedStep.claims,
      managedStep.marketplace,
      plan.projection.artifactAuthority.contentAuthority,
    );
    if (!managed.ok) {
      return Object.freeze({
        target: plan.target,
        status: "failed",
        events: Object.freeze([
          Object.freeze({ phase: "planned", target: plan.target, plan }),
          Object.freeze({ phase: "failed", target: plan.target, issues: managed.issues }),
        ]),
        issues: managed.issues,
        visibleFingerprint: null,
      });
    }
  }
  return Object.freeze({
    target: plan.target,
    status: "read-only-converged",
    events: Object.freeze([
      Object.freeze({ phase: "planned", target: plan.target, plan }),
      Object.freeze({ phase: "verified", target: plan.target, visibleFingerprint: verified.value.visibleFingerprint }),
      Object.freeze({ phase: "skipped", target: plan.target, reason: "read-only-converged" }),
    ]),
    issues: Object.freeze([]),
    visibleFingerprint: verified.value.visibleFingerprint,
  });
}

async function executeMutatingPlan(
  plan: ProviderTargetPlan,
  dependencies: ApplyDependencies,
  session: ProviderUndoSession,
): Promise<{ readonly outcome: TargetOperationOutcome; readonly capsuleFailed: boolean }> {
  const events: ProviderEvent[] = [Object.freeze({ phase: "planned", target: plan.target, plan })];
  let fingerprint: string | null = null;
  let pendingRetirement: Extract<ProviderMutationAction, { kind: "RetireMember" }> | null = null;
  for (const step of plan.steps) {
    if (step.kind === "verify") {
      const verified = await dependencies.provider.verifyProjection(plan.target, step.projection);
      if (!verified.ok) return { outcome: failedOutcome(plan.target, events, verified.issues, fingerprint), capsuleFailed: false };
      fingerprint = verified.value.visibleFingerprint;
      events.push(Object.freeze({ phase: "verified", target: plan.target, visibleFingerprint: fingerprint }));
      continue;
    }
    if (step.kind === "verify-managed") {
      const verified = await verifyManagedTarget(
        dependencies.provider,
        plan.target,
        step.claims,
        step.marketplace,
        planContentAuthority(plan),
      );
      if (!verified.ok) {
        return { outcome: failedOutcome(plan.target, events, verified.issues, fingerprint), capsuleFailed: false };
      }
      fingerprint = verified.value;
      events.push(Object.freeze({ phase: "verified", target: plan.target, visibleFingerprint: fingerprint }));
      continue;
    }
    if (step.kind === "verify-retired") {
      if (pendingRetirement === null || pendingRetirement.prior.nativeIdentity !== step.nativeIdentity) {
        return {
          outcome: failedOutcome(plan.target, events, [issue("MUTATION_FAILED", "target.plan", "Retirement verification does not follow its exact applied action")], fingerprint),
          capsuleFailed: false,
        };
      }
      const inventory = await dependencies.provider.readInventory(
        plan.target,
        pendingRetirement.prior.artifactAuthority.contentAuthority,
      );
      if (!inventory.ok) return { outcome: failedOutcome(plan.target, events, inventory.issues, fingerprint), capsuleFailed: false };
      if (
        inventory.value.members.some((member) => member.nativeIdentity === step.nativeIdentity)
        || inventory.value.standaloneExposures.some((exposure) => exposure.nativeIdentity === step.nativeIdentity)
      ) {
        return {
          outcome: failedOutcome(plan.target, events, [issue("VISIBILITY_FAILED", "target.inventory", "Retired native member or configured exposure remains visible", "absent", step.nativeIdentity)], fingerprint),
          capsuleFailed: false,
        };
      }
      fingerprint = inventory.value.inventoryFingerprint;
      events.push(Object.freeze({ phase: "retired", target: plan.target, action: pendingRetirement }));
      events.push(Object.freeze({ phase: "verified", target: plan.target, visibleFingerprint: fingerprint }));
      pendingRetirement = null;
      continue;
    }
    const staged = await session.stage(step.action);
    if (!staged.ok) return { outcome: failedOutcome(plan.target, events, staged.issues, fingerprint), capsuleFailed: true };
    const applied = await dependencies.applyAction(step.action);
    if (!applied.ok) return { outcome: failedOutcome(plan.target, events, applied.issues, fingerprint), capsuleFailed: false };
    events.push(Object.freeze({ phase: "applied", target: plan.target, action: step.action }));
    if (step.action.kind === "RetireMember") pendingRetirement = step.action;
    const recorded = await session.applied(Object.freeze({ action: step.action, post: applied.value }));
    if (!recorded.ok) return { outcome: failedOutcome(plan.target, events, recorded.issues, fingerprint), capsuleFailed: true };
  }
  if (pendingRetirement !== null) {
    return {
      outcome: failedOutcome(plan.target, events, [issue("MUTATION_FAILED", "target.plan", "Applied retirement was not verified before target settlement")], fingerprint),
      capsuleFailed: false,
    };
  }
  return {
    capsuleFailed: false,
    outcome: Object.freeze({
      target: plan.target,
      status: "mutated",
      events: Object.freeze(events),
      issues: Object.freeze([]),
      visibleFingerprint: fingerprint,
    }),
  };
}

async function verifyManagedTarget(
  provider: ProviderTargetReader,
  target: ProviderTarget,
  claims: readonly ManagedMemberClaim[],
  registration: Extract<ProviderTargetPlan["steps"][number], { kind: "verify-managed" }>["marketplace"],
  plannedAuthority?: ContentAuthority,
): Promise<DeploymentResult<string>> {
  const authority = plannedAuthority ?? claims[0]?.artifactAuthority.contentAuthority;
  if (authority === undefined) {
    return failure([issue("VISIBILITY_FAILED", "target.managedMembers", "Managed verification has no content authority")]);
  }
  const inventory = await provider.readInventory(target, authority);
  if (!inventory.ok) return inventory;
  const expectedMarketplace = registration === null
    ? Object.freeze({ kind: "absent" as const })
    : Object.freeze({ kind: "present" as const, state: marketplaceState(registration) });
  const marketplaceMatches = inventory.value.marketplace.kind === "absent"
    ? expectedMarketplace.kind === "absent"
    : expectedMarketplace.kind === "present"
      && sameMarketplaceState(inventory.value.marketplace.state, expectedMarketplace.state);
  if (!marketplaceMatches) {
    return failure([issue(
      "VISIBILITY_FAILED",
      "target.marketplace",
      "Live marketplace does not match the exact managed release-set registration",
    )]);
  }
  for (const claim of claims) {
    const related = inventory.value.members.filter((member) =>
      member.pluginId === claim.pluginId || member.nativeIdentity === claim.nativeIdentity);
    const standalone = inventory.value.standaloneExposures.some((exposure) =>
      exposure.nativeIdentity === claim.nativeIdentity);
    const member = related[0];
    if (
      standalone
      || related.length !== 1
      || member === undefined
      || member.pluginId !== claim.pluginId
      || member.nativeIdentity !== claim.nativeIdentity
      || member.providerSourceIdentity !== claim.providerSourceIdentity
      || member.artifactAuthority.protocol !== claim.artifactAuthority.protocol
      || member.artifactAuthority.contentAuthority !== claim.artifactAuthority.contentAuthority
      || member.artifactAuthority.sourceCommit !== claim.artifactAuthority.sourceCommit
      || member.memberFingerprint !== claim.memberFingerprint
      || member.enablement !== "enabled"
    ) {
      return failure([issue(
        "VISIBILITY_FAILED",
        `target.managedMembers.${claim.pluginId}`,
        "Managed member does not match its exact effective receipt claim",
        claim.memberFingerprint,
        member?.memberFingerprint ?? (standalone ? "standalone exposure" : "absent"),
      )]);
    }
  }
  return success(visibleFingerprint(claims));
}

function planContentAuthority(plan: ProviderTargetPlan): ContentAuthority | undefined {
  if (plan.projection !== null) return plan.projection.artifactAuthority.contentAuthority;
  for (const step of plan.steps) {
    if (step.kind !== "mutate") continue;
    const action = step.action;
    if (action.kind === "RetireMember") return action.prior.artifactAuthority.contentAuthority;
    if (action.kind === "InstallMember" || action.kind === "EnableMember") {
      return action.member.artifactAuthority.contentAuthority;
    }
    if (action.kind === "SetMarketplace") {
      const authority = action.registration?.marketplaceIdentity
        ?? action.priorRegistration?.marketplaceIdentity;
      if (authority !== undefined) return authority;
    }
  }
  return undefined;
}

function blocked(target: ProviderTarget, projection: AgentProviderProjection | null, issues: readonly ProviderDeploymentIssue[]): ProviderTargetPlan {
  return Object.freeze({ target, state: "blocked", projection, steps: Object.freeze([]), issues: Object.freeze([...issues]) });
}

function blockedOutcome(plan: ProviderTargetPlan): TargetOperationOutcome {
  return Object.freeze({
    target: plan.target,
    status: "blocked",
    events: Object.freeze([
      Object.freeze({ phase: "planned", target: plan.target, plan }),
      Object.freeze({ phase: "blocked", target: plan.target, issues: plan.issues }),
    ]),
    issues: plan.issues,
    visibleFingerprint: null,
  });
}

function failedBeforeApply(plan: ProviderTargetPlan, issues: readonly ProviderDeploymentIssue[]): TargetOperationOutcome {
  return Object.freeze({
    target: plan.target,
    status: "failed",
    events: Object.freeze([
      Object.freeze({ phase: "planned", target: plan.target, plan }),
      Object.freeze({ phase: "failed", target: plan.target, issues }),
    ]),
    issues: Object.freeze([...issues]),
    visibleFingerprint: null,
  });
}

function failedOutcome(
  target: ProviderTarget,
  events: readonly ProviderEvent[],
  issues: readonly ProviderDeploymentIssue[],
  visibleFingerprint: string | null,
): TargetOperationOutcome {
  return Object.freeze({
    target,
    status: "failed",
    events: Object.freeze([...events, Object.freeze({ phase: "failed", target, issues })]),
    issues: Object.freeze([...issues]),
    visibleFingerprint,
  });
}

function appendFailure(outcome: TargetOperationOutcome, issues: readonly ProviderDeploymentIssue[]): TargetOperationOutcome {
  return Object.freeze({
    ...outcome,
    status: "failed",
    events: Object.freeze([...outcome.events, Object.freeze({ phase: "failed", target: outcome.target, issues })]),
    issues: Object.freeze([...outcome.issues, ...issues]),
  });
}

function evidenceFailure(
  outcome: ProviderOperationOutcome,
  issues: readonly ProviderDeploymentIssue[],
): ProviderOperationOutcome {
  return Object.freeze({
    ...outcome,
    status: outcome.targets.some((target) => target.status === "mutated" || target.status === "read-only-converged") ? "PartialFailure" : "Failed",
    issues: Object.freeze([...outcome.issues, ...issues]),
  });
}

function collectReadIssues(results: readonly DeploymentResult<unknown>[]): readonly ProviderDeploymentIssue[] {
  return Object.freeze(results.flatMap((result) => result.ok ? [] : result.issues));
}

function orderOutcomes(
  plans: readonly ProviderTargetPlan[],
  outcomes: ReadonlyMap<string, TargetOperationOutcome>,
): readonly TargetOperationOutcome[] {
  return Object.freeze(plans.flatMap((plan) => {
    const outcome = outcomes.get(plan.target.targetDigest);
    return outcome === undefined ? [] : [outcome];
  }));
}

export function createDeploymentActionApplier(
  ports: DeploymentMutationPorts,
): (action: ProviderMutationAction) => Promise<DeploymentResult<ProviderMutationPostState>> {
  return async (action) => {
    switch (action.kind) {
      case "AdmitTargetIdentity": {
        const applied = await ports.identityWriter.admit(action.target, action.sidecar);
        return applied.ok
          ? success(Object.freeze({ kind: "identity", observation: Object.freeze({ kind: "present", sidecar: applied.value }) }))
          : applied;
      }
      case "SetMarketplace": {
        const applied = await ports.providerMutator.apply(action);
        if (!applied.ok) return applied;
        return applied.value.actionKind === "SetMarketplace"
          ? success(Object.freeze({ kind: "marketplace", observation: applied.value.postMarketplace }))
          : failure([issue("MUTATION_FAILED", "provider.mutation", "Provider returned a member observation for a marketplace action")]);
      }
      case "InstallMember":
      case "EnableMember":
      case "RetireMember": {
        const applied = await ports.providerMutator.apply(action);
        if (!applied.ok) return applied;
        return applied.value.actionKind !== "SetMarketplace"
          ? success(Object.freeze({ kind: "member", member: applied.value.postMember }))
          : failure([issue("MUTATION_FAILED", "provider.mutation", "Provider returned a marketplace observation for a member action")]);
      }
      case "PublishReceipt": {
        const applied = await ports.receiptWriter.publish(action.target, action.prior, action.receipt);
        return applied.ok
          ? success(Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "present", receipt: applied.value }) }))
          : applied;
      }
      case "NormalizeReceipt": {
        const applied = await ports.receiptWriter.publish(action.target, { kind: "present", receipt: action.prior }, action.receipt);
        return applied.ok
          ? success(Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "present", receipt: applied.value }) }))
          : applied;
      }
      case "RemoveReceipt": {
        const applied = await ports.receiptWriter.remove(action.target, action.prior);
        return applied.ok
          ? success(Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "absent" }) }))
          : applied;
      }
    }
  };
}

export function createRetireActionApplier(
  ports: RetireMutationPorts,
): (action: ProviderMutationAction) => Promise<DeploymentResult<ProviderMutationPostState>> {
  return async (action) => {
    switch (action.kind) {
      case "AdmitTargetIdentity": {
        const applied = await ports.identityWriter.admit(action.target, action.sidecar);
        return applied.ok
          ? success(Object.freeze({ kind: "identity", observation: Object.freeze({ kind: "present", sidecar: applied.value }) }))
          : applied;
      }
      case "SetMarketplace": {
        const applied = await ports.providerMutator.apply(action);
        if (!applied.ok) return applied;
        return applied.value.actionKind === "SetMarketplace"
          ? success(Object.freeze({ kind: "marketplace", observation: applied.value.postMarketplace }))
          : failure([issue("MUTATION_FAILED", "provider.mutation", "Provider returned a member observation for a marketplace action")]);
      }
      case "RetireMember": {
        const applied = await ports.providerMutator.apply(action);
        if (!applied.ok) return applied;
        return applied.value.actionKind !== "SetMarketplace"
          ? success(Object.freeze({ kind: "member", member: applied.value.postMember }))
          : failure([issue("MUTATION_FAILED", "provider.mutation", "Provider returned a marketplace observation for a member action")]);
      }
      case "PublishReceipt": {
        const applied = await ports.receiptWriter.publish(action.target, action.prior, action.receipt);
        return applied.ok
          ? success(Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "present", receipt: applied.value }) }))
          : applied;
      }
      case "NormalizeReceipt": {
        const applied = await ports.receiptWriter.publish(action.target, { kind: "present", receipt: action.prior }, action.receipt);
        return applied.ok
          ? success(Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "present", receipt: applied.value }) }))
          : applied;
      }
      case "RemoveReceipt": {
        const applied = await ports.receiptWriter.remove(action.target, action.prior);
        return applied.ok
          ? success(Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "absent" }) }))
          : applied;
      }
      case "EnableMember":
      case "InstallMember":
        return failure([issue(
          "MUTATION_FAILED",
          "action.kind",
          "Managed-retire application received an impossible action",
          "AdmitTargetIdentity|SetMarketplace|RetireMember|PublishReceipt|NormalizeReceipt|RemoveReceipt",
          action.kind,
        )]);
    }
  };
}

export function resultFailure<T>(issues: readonly ProviderDeploymentIssue[]): DeploymentResult<T> {
  const first = issues[0] ?? issue("MUTATION_FAILED", "operation", "Operation failed without a specific issue");
  return failure([first, ...issues.slice(1)]);
}

export { success };

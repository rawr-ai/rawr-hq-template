import type { ContentAuthority, VerifiedArtifactSnapshotV1 } from "../../../shared/release";
import {
  createMechanicalProviderEvidence,
  type MechanicalEvidenceSource,
  type ProviderVerificationFact,
} from "../model/dto/mechanical-evidence";
import type { EvaluationProfile } from "../model/dto/mode";
import type {
  ProviderEvent,
  ProviderOperationOutcome,
  TargetOperationOutcome,
  UnboundTargetOperationOutcome,
} from "../model/dto/outcome";
import type { ProviderTarget } from "../model/dto/provider-target";
import {
  type DeploymentResult,
  failure,
  issue,
  type NonEmptyReadonlyArray,
  type ProviderDeploymentIssue,
  success,
} from "../model/errors/deployment-result";
import { equalBytes } from "../model/helpers/canonical";
import { marketplaceState, sameMarketplaceState } from "../model/policy/marketplace";
import {
  type AgentProviderProjection,
  type CapabilityObservation,
  evaluateCapabilities,
  renderCompleteProjection,
  renderTargetedProjection,
} from "../model/policy/projection";
import { type ManagedMemberClaim, visibleFingerprint } from "../model/policy/receipt";
import {
  type DeploymentAuthority,
  type NativeProviderMutationAction,
  type ProviderMutationAction,
  type ProviderTargetPlan,
  planTarget,
} from "../model/policy/state-machine";
import type { MechanicalEvidencePublisher } from "../model/repositories/evidence";
import type {
  NativeMutationAttempt,
  ProviderTargetMutator,
  ProviderTargetReader,
} from "../model/repositories/provider";
import type {
  ProviderMarketplaceMaterializer,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "../model/repositories/state";

export interface PlanReadDependencies {
  readonly provider: ProviderTargetReader;
  readonly receipts: TargetReceiptReader;
  readonly identities: TargetIdentityReader;
}

export interface ApplyDependencies {
  readonly provider: ProviderTargetReader;
  readonly marketplaceMaterializer: ProviderMarketplaceMaterializer;
  readonly applyNativeAction: (
    action: NativeProviderMutationAction
  ) => Promise<NativeMutationAttempt>;
  readonly applyRecordAction: (action: RecordMutationAction) => Promise<DefiniteMutationAttempt>;
}

type RecordMutationAction = Exclude<ProviderMutationAction, NativeProviderMutationAction>;
type DefiniteMutationAttempt = Exclude<NativeMutationAttempt, { kind: "uncertain" }>;

export interface ProjectionApplyDependencies extends ApplyDependencies {
  readonly projectionMaterializer: ProviderProjectionMaterializer;
}

export interface DeploymentMutationPorts {
  readonly providerMutator: ProviderTargetMutator;
  readonly receiptWriter: TargetReceiptWriter;
  readonly identityWriter: TargetIdentityWriter;
}

interface ProjectionPlanInputBase {
  readonly targets: readonly ProviderTarget[];
  readonly dependencies: PlanReadDependencies;
  readonly authority: (
    projection: AgentProviderProjection
  ) => DeploymentResult<DeploymentAuthority>;
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

export async function createProjectionPlans(
  input: ProjectionPlanInput
): Promise<readonly ProviderTargetPlan[]> {
  const plans: ProviderTargetPlan[] = [];
  for (const target of input.targets) {
    const adapterProtocol = input.dependencies.provider.projectionAdapterProtocol(target);
    if (!adapterProtocol.ok) {
      plans.push(blocked(target, null, adapterProtocol.issues));
      continue;
    }
    const projectionResult =
      input.sourceKind === "complete"
        ? renderCompleteProjection(target.provider, adapterProtocol.value, input.snapshot)
        : renderTargetedProjection(target.provider, adapterProtocol.value, input.snapshot);
    if (!projectionResult.ok) {
      plans.push(blocked(target, null, projectionResult.issues));
      continue;
    }
    const [capabilityResult, inventoryResult, receiptResult, identityResult] = await Promise.all([
      input.dependencies.provider.inspectCapabilities(
        target,
        projectionResult.value.artifactAuthority.contentAuthority
      ),
      input.dependencies.provider.readInventory(
        target,
        projectionResult.value.artifactAuthority.contentAuthority
      ),
      input.dependencies.receipts.read(target),
      input.dependencies.identities.read(target),
    ]);
    const readIssues = collectReadIssues([
      capabilityResult,
      inventoryResult,
      receiptResult,
      identityResult,
    ]);
    if (!capabilityResult.ok || !inventoryResult.ok || !receiptResult.ok || !identityResult.ok) {
      plans.push(blocked(target, projectionResult.value, readIssues));
      continue;
    }
    const authority = input.authority(projectionResult.value);
    if (!authority.ok) {
      plans.push(blocked(target, projectionResult.value, authority.issues));
      continue;
    }
    plans.push(
      planTarget({
        authority: authority.value,
        inventory: inventoryResult.value,
        receipt: receiptResult.value,
        targetIdentity: identityResult.value,
        capabilities: evaluateCapabilities(
          projectionResult.value.capabilityProfile,
          capabilityResult.value
        ),
      })
    );
  }
  return Object.freeze(plans);
}

export async function inspectTargetsAsBlocked(
  targets: readonly ProviderTarget[],
  _dependencies: PlanReadDependencies,
  baseIssues: readonly ProviderDeploymentIssue[]
): Promise<readonly ProviderTargetPlan[]> {
  const plans: ProviderTargetPlan[] = [];
  for (const target of targets) {
    plans.push(blocked(target, null, baseIssues));
  }
  return Object.freeze(plans);
}

export async function executePlans(
  plans: readonly ProviderTargetPlan[],
  dependencies: ApplyDependencies
): Promise<readonly UnboundTargetOperationOutcome[]> {
  return await executePlansInternal(plans, dependencies, null);
}

export async function executeProjectionPlans(
  plans: readonly ProviderTargetPlan[],
  dependencies: ProjectionApplyDependencies
): Promise<readonly UnboundTargetOperationOutcome[]> {
  return await executePlansInternal(plans, dependencies, dependencies.projectionMaterializer);
}

async function executePlansInternal(
  plans: readonly ProviderTargetPlan[],
  dependencies: ApplyDependencies,
  projectionMaterializer: ProviderProjectionMaterializer | null
): Promise<readonly UnboundTargetOperationOutcome[]> {
  const outcomes = new Map<string, UnboundTargetOperationOutcome>();
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
    const projectionIssues =
      projectionMaterializer === null
        ? []
        : await materializeRequiredProjections([plan], projectionMaterializer);
    if (projectionIssues.length > 0) {
      outcomes.set(plan.target.targetDigest, failedBeforeApply(plan, projectionIssues));
      continue;
    }
    const marketplaceIssues = await materializeRequiredMarketplaces(
      [plan],
      dependencies.marketplaceMaterializer
    );
    if (marketplaceIssues.length > 0) {
      outcomes.set(plan.target.targetDigest, failedBeforeApply(plan, marketplaceIssues));
      continue;
    }
    eligible.push(plan);
  }
  if (eligible.length === 0) return orderOutcomes(plans, outcomes);

  for (const plan of eligible) {
    outcomes.set(plan.target.targetDigest, await executeMutatingPlan(plan, dependencies));
  }
  return orderOutcomes(plans, outcomes);
}

async function materializeRequiredProjections(
  plans: readonly ProviderTargetPlan[],
  materializer: ProviderProjectionMaterializer
): Promise<readonly ProviderDeploymentIssue[]> {
  const projections = new Map<string, AgentProviderProjection>();
  for (const plan of plans) {
    if (plan.projection === null) {
      return [
        issue(
          "PROJECTION_MISMATCH",
          "target.plan.projection",
          "Mutating deployment plan has no provider projection"
        ),
      ];
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
  materializer: ProviderMarketplaceMaterializer
): Promise<readonly ProviderDeploymentIssue[]> {
  const registrations = new Map<
    string,
    Readonly<{
      provider: ProviderTarget["provider"];
      registration: NonNullable<
        Extract<ProviderMutationAction, { kind: "SetMarketplace" }>["registration"]
      >;
    }>
  >();
  for (const plan of plans) {
    for (const step of plan.steps) {
      if (step.kind !== "mutate") continue;
      const registration =
        step.action.kind === "SetMarketplace"
          ? step.action.registration
          : step.action.kind === "InstallMember" || step.action.kind === "EnableMember"
            ? step.action.activeMarketplace
            : null;
      if (registration !== null) {
        registrations.set(
          registration.projectionDigest,
          Object.freeze({
            provider: step.action.target.provider,
            registration,
          })
        );
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

export async function attachMechanicalEvidence<TTarget extends TargetOperationOutcome>(
  outcome: ProviderOperationOutcome<TTarget>,
  plans: readonly ProviderTargetPlan[],
  source: MechanicalEvidenceSource,
  evaluationProfile: EvaluationProfile,
  publisher: MechanicalEvidencePublisher
): Promise<ProviderOperationOutcome<TTarget>> {
  const facts: ProviderVerificationFact[] = [];
  for (const plan of plans) {
    if (plan.projection === null) continue;
    const targetOutcome = outcome.targets.find(
      (candidate) => candidate.target.targetDigest === plan.target.targetDigest
    );
    if (targetOutcome === undefined) continue;
    const common = {
      targetDigest: plan.target.targetDigest,
      provider: plan.target.provider,
      projectionDigest: plan.projection.projectionDigest,
      adapterProtocol: plan.projection.adapterProtocol,
      capabilityProfileDigest: plan.projection.capabilityProfile.capabilityProfileDigest,
      payloadDigests: plan.projection.members.map((member) => member.releaseRef.artifactDigest),
    } as const;
    facts.push(
      targetOutcome.status === "failed" || targetOutcome.status === "blocked"
        ? Object.freeze({
            kind: "failed",
            ...common,
            failureCodes:
              targetOutcome.issues.length === 0
                ? ["VISIBILITY_FAILED" as const]
                : targetOutcome.issues.map((entry) => entry.code),
          })
        : Object.freeze({
            kind: "verified",
            ...common,
            visibleFingerprint: targetOutcome.visibleFingerprint ?? "unavailable",
          })
    );
  }
  if (facts.length !== plans.length) return outcome;
  const evidence = createMechanicalProviderEvidence(source, evaluationProfile, facts);
  const inspected = await publisher.inspect(evidence.evidenceDigest);
  if (!inspected.ok) return evidenceFailure(outcome, inspected.issues);
  if (inspected.value.kind === "present") {
    return equalBytes(inspected.value.bytes, evidence.bytes)
      ? Object.freeze({ ...outcome, evidence: inspected.value.handle.evidenceDigest })
      : evidenceFailure(outcome, [
          issue("EVIDENCE_FAILED", "evidence", "Existing evidence bytes do not match their digest"),
        ]);
  }
  const published = await publisher.publish(evidence);
  return published.ok
    ? Object.freeze({ ...outcome, evidence: published.value.evidenceDigest })
    : evidenceFailure(outcome, published.issues);
}

export function aggregateOutcome<TTarget extends TargetOperationOutcome>(
  targets: readonly TTarget[]
): ProviderOperationOutcome<TTarget> {
  const issues = targets.flatMap((target) => target.issues);
  const failures = targets.filter(
    (target) => target.status === "blocked" || target.status === "failed"
  );
  const successes = targets.filter(
    (target) => target.status === "mutated" || target.status === "read-only-converged"
  );
  const status =
    failures.length === 0
      ? targets.some((target) => target.status === "mutated")
        ? "Mutated"
        : "ReadOnlyConverged"
      : successes.length > 0
        ? "PartialFailure"
        : targets.every((target) => target.status === "blocked")
          ? "Blocked"
          : "Failed";
  return Object.freeze({
    status,
    targets: Object.freeze([...targets]),
    evidence: null,
    issues: Object.freeze(issues),
  });
}

export function capabilityReadIssue(
  observation: CapabilityObservation,
  projection: AgentProviderProjection
): readonly ProviderDeploymentIssue[] {
  const evaluation = evaluateCapabilities(projection.capabilityProfile, observation);
  return evaluation.compatible
    ? []
    : [
        issue(
          "CAPABILITY_MISMATCH",
          "target.capabilities",
          "Provider capability profile is incompatible",
          evaluation.missing.join(","),
          "missing"
        ),
      ];
}

async function executeReadOnlyPlan(
  plan: ProviderTargetPlan,
  provider: ProviderTargetReader
): Promise<UnboundTargetOperationOutcome> {
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
      projectionBinding: null,
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
      projectionBinding: null,
    });
  }
  const managedStep = plan.steps.find((step) => step.kind === "verify-managed");
  if (managedStep !== undefined) {
    const managed = await verifyManagedTarget(
      provider,
      plan.target,
      managedStep.claims,
      managedStep.marketplace,
      plan.projection.artifactAuthority.contentAuthority
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
        projectionBinding: null,
      });
    }
  }
  return Object.freeze({
    target: plan.target,
    status: "read-only-converged",
    events: Object.freeze([
      Object.freeze({ phase: "planned", target: plan.target, plan }),
      Object.freeze({
        phase: "verified",
        target: plan.target,
        visibleFingerprint: verified.value.visibleFingerprint,
      }),
      Object.freeze({ phase: "skipped", target: plan.target, reason: "read-only-converged" }),
    ]),
    issues: Object.freeze([]),
    visibleFingerprint: verified.value.visibleFingerprint,
    projectionBinding: null,
  });
}

async function executeMutatingPlan(
  plan: ProviderTargetPlan,
  dependencies: ApplyDependencies
): Promise<UnboundTargetOperationOutcome> {
  const events: ProviderEvent[] = [Object.freeze({ phase: "planned", target: plan.target, plan })];
  let fingerprint: string | null = null;
  let pendingRetirement: Extract<ProviderMutationAction, { kind: "RetireMember" }> | null = null;
  for (const step of plan.steps) {
    if (step.kind === "verify") {
      const verified = await dependencies.provider.verifyProjection(plan.target, step.projection);
      if (!verified.ok) return failedOutcome(plan.target, events, verified.issues, fingerprint);
      fingerprint = verified.value.visibleFingerprint;
      events.push(
        Object.freeze({ phase: "verified", target: plan.target, visibleFingerprint: fingerprint })
      );
      continue;
    }
    if (step.kind === "verify-managed") {
      const verified = await verifyManagedTarget(
        dependencies.provider,
        plan.target,
        step.claims,
        step.marketplace,
        planContentAuthority(plan)
      );
      if (!verified.ok) {
        return failedOutcome(plan.target, events, verified.issues, fingerprint);
      }
      fingerprint = verified.value;
      events.push(
        Object.freeze({ phase: "verified", target: plan.target, visibleFingerprint: fingerprint })
      );
      continue;
    }
    if (step.kind === "verify-retired") {
      if (
        pendingRetirement === null ||
        pendingRetirement.member.nativeIdentity !== step.nativeIdentity
      ) {
        return failedOutcome(
          plan.target,
          events,
          [
            issue(
              "MUTATION_FAILED",
              "target.plan",
              "Retirement verification does not follow its exact applied action"
            ),
          ],
          fingerprint
        );
      }
      const inventory = await dependencies.provider.readInventory(
        plan.target,
        pendingRetirement.member.artifactAuthority.contentAuthority
      );
      if (!inventory.ok) return failedOutcome(plan.target, events, inventory.issues, fingerprint);
      if (
        inventory.value.members.some((member) => member.nativeIdentity === step.nativeIdentity) ||
        inventory.value.standaloneExposures.some(
          (exposure) => exposure.nativeIdentity === step.nativeIdentity
        )
      ) {
        return failedOutcome(
          plan.target,
          events,
          [
            issue(
              "VISIBILITY_FAILED",
              "target.inventory",
              "Retired native member or configured exposure remains visible",
              "absent",
              step.nativeIdentity
            ),
          ],
          fingerprint
        );
      }
      fingerprint = inventory.value.inventoryFingerprint;
      events.push(
        Object.freeze({ phase: "retired", target: plan.target, action: pendingRetirement })
      );
      events.push(
        Object.freeze({ phase: "verified", target: plan.target, visibleFingerprint: fingerprint })
      );
      pendingRetirement = null;
      continue;
    }
    let attempt: NativeMutationAttempt;
    if (isNativeMutationAction(step.action)) {
      attempt = await dependencies.applyNativeAction(step.action);
      if (attempt.kind === "uncertain") {
        events.push(
          Object.freeze({
            phase: "uncertain",
            target: plan.target,
            action: step.action,
            lastKnown: attempt.lastKnown,
            issues: attempt.issues,
          })
        );
        return failedOutcome(plan.target, events, attempt.issues, fingerprint);
      }
    } else {
      attempt = await dependencies.applyRecordAction(step.action);
    }
    if (attempt.kind === "not-applied") {
      return failedOutcome(plan.target, events, attempt.issues, fingerprint);
    }
    events.push(Object.freeze({ phase: "applied", target: plan.target, action: step.action }));
    if (step.action.kind === "RetireMember") pendingRetirement = step.action;
  }
  if (pendingRetirement !== null) {
    return failedOutcome(
      plan.target,
      events,
      [
        issue(
          "MUTATION_FAILED",
          "target.plan",
          "Applied retirement was not verified before target settlement"
        ),
      ],
      fingerprint
    );
  }
  return Object.freeze({
    target: plan.target,
    status: "mutated",
    events: Object.freeze(events),
    issues: Object.freeze([]),
    visibleFingerprint: fingerprint,
    projectionBinding: null,
  });
}

function isNativeMutationAction(
  action: ProviderMutationAction
): action is NativeProviderMutationAction {
  switch (action.kind) {
    case "SetMarketplace":
    case "InstallMember":
    case "EnableMember":
    case "RetireMember":
      return true;
    case "AdmitTargetIdentity":
    case "PublishReceipt":
      return false;
  }
}

async function verifyManagedTarget(
  provider: ProviderTargetReader,
  target: ProviderTarget,
  claims: readonly ManagedMemberClaim[],
  registration: Extract<
    ProviderTargetPlan["steps"][number],
    { kind: "verify-managed" }
  >["marketplace"],
  plannedAuthority?: ContentAuthority
): Promise<DeploymentResult<string>> {
  const authority = plannedAuthority ?? claims[0]?.artifactAuthority.contentAuthority;
  if (authority === undefined) {
    return failure([
      issue(
        "VISIBILITY_FAILED",
        "target.managedMembers",
        "Managed verification has no content authority"
      ),
    ]);
  }
  const inventory = await provider.readInventory(target, authority);
  if (!inventory.ok) return inventory;
  const expectedMarketplace =
    registration === null
      ? Object.freeze({ kind: "absent" as const })
      : Object.freeze({ kind: "present" as const, state: marketplaceState(registration) });
  const marketplaceMatches =
    inventory.value.marketplace.kind === "absent"
      ? expectedMarketplace.kind === "absent"
      : expectedMarketplace.kind === "present" &&
        sameMarketplaceState(inventory.value.marketplace.state, expectedMarketplace.state);
  if (!marketplaceMatches) {
    return failure([
      issue(
        "VISIBILITY_FAILED",
        "target.marketplace",
        "Live marketplace does not match the exact managed release-set registration"
      ),
    ]);
  }
  for (const claim of claims) {
    const related = inventory.value.members.filter(
      (member) =>
        member.pluginId === claim.pluginId || member.nativeIdentity === claim.nativeIdentity
    );
    const standalone = inventory.value.standaloneExposures.some(
      (exposure) => exposure.nativeIdentity === claim.nativeIdentity
    );
    const member = related[0];
    if (
      standalone ||
      related.length !== 1 ||
      member === undefined ||
      member.pluginId !== claim.pluginId ||
      member.nativeIdentity !== claim.nativeIdentity ||
      member.providerSourceIdentity !== claim.providerSourceIdentity ||
      member.artifactAuthority.protocol !== claim.artifactAuthority.protocol ||
      member.artifactAuthority.contentAuthority !== claim.artifactAuthority.contentAuthority ||
      member.artifactAuthority.sourceCommit !== claim.artifactAuthority.sourceCommit ||
      member.memberFingerprint !== claim.memberFingerprint ||
      member.enablement !== "enabled"
    ) {
      return failure([
        issue(
          "VISIBILITY_FAILED",
          `target.managedMembers.${claim.pluginId}`,
          "Managed member does not match its exact effective receipt claim",
          claim.memberFingerprint,
          member?.memberFingerprint ?? (standalone ? "standalone exposure" : "absent")
        ),
      ]);
    }
  }
  return success(visibleFingerprint(claims));
}

function planContentAuthority(plan: ProviderTargetPlan): ContentAuthority | undefined {
  if (plan.projection !== null) return plan.projection.artifactAuthority.contentAuthority;
  for (const step of plan.steps) {
    if (step.kind !== "mutate") continue;
    const action = step.action;
    if (action.kind === "RetireMember") return action.member.artifactAuthority.contentAuthority;
    if (action.kind === "InstallMember" || action.kind === "EnableMember") {
      return action.member.artifactAuthority.contentAuthority;
    }
    if (action.kind === "SetMarketplace") {
      const authority = action.registration?.marketplaceIdentity;
      if (authority !== undefined) return authority;
    }
  }
  return undefined;
}

function blocked(
  target: ProviderTarget,
  projection: AgentProviderProjection | null,
  issues: readonly ProviderDeploymentIssue[]
): ProviderTargetPlan {
  return Object.freeze({
    target,
    state: "blocked",
    projection,
    steps: Object.freeze([]),
    issues: Object.freeze([...issues]),
  });
}

function blockedOutcome(plan: ProviderTargetPlan): UnboundTargetOperationOutcome {
  return Object.freeze({
    target: plan.target,
    status: "blocked",
    events: Object.freeze([
      Object.freeze({ phase: "planned", target: plan.target, plan }),
      Object.freeze({ phase: "blocked", target: plan.target, issues: plan.issues }),
    ]),
    issues: plan.issues,
    visibleFingerprint: null,
    projectionBinding: null,
  });
}

function failedBeforeApply(
  plan: ProviderTargetPlan,
  issues: readonly ProviderDeploymentIssue[]
): UnboundTargetOperationOutcome {
  return Object.freeze({
    target: plan.target,
    status: "failed",
    events: Object.freeze([
      Object.freeze({ phase: "planned", target: plan.target, plan }),
      Object.freeze({ phase: "failed", target: plan.target, issues }),
    ]),
    issues: Object.freeze([...issues]),
    visibleFingerprint: null,
    projectionBinding: null,
  });
}

function failedOutcome(
  target: ProviderTarget,
  events: readonly ProviderEvent[],
  issues: readonly ProviderDeploymentIssue[],
  visibleFingerprint: string | null
): UnboundTargetOperationOutcome {
  return Object.freeze({
    target,
    status: "failed",
    events: Object.freeze([...events, Object.freeze({ phase: "failed", target, issues })]),
    issues: Object.freeze([...issues]),
    visibleFingerprint,
    projectionBinding: null,
  });
}

function evidenceFailure<TTarget extends TargetOperationOutcome>(
  outcome: ProviderOperationOutcome<TTarget>,
  issues: readonly ProviderDeploymentIssue[]
): ProviderOperationOutcome<TTarget> {
  return Object.freeze({
    ...outcome,
    status: outcome.targets.some(
      (target) => target.status === "mutated" || target.status === "read-only-converged"
    )
      ? "PartialFailure"
      : "Failed",
    issues: Object.freeze([...outcome.issues, ...issues]),
  });
}

function collectReadIssues(
  results: readonly DeploymentResult<unknown>[]
): readonly ProviderDeploymentIssue[] {
  return Object.freeze(results.flatMap((result) => (result.ok ? [] : result.issues)));
}

function orderOutcomes(
  plans: readonly ProviderTargetPlan[],
  outcomes: ReadonlyMap<string, UnboundTargetOperationOutcome>
): readonly UnboundTargetOperationOutcome[] {
  return Object.freeze(
    plans.flatMap((plan) => {
      const outcome = outcomes.get(plan.target.targetDigest);
      return outcome === undefined ? [] : [outcome];
    })
  );
}

export function createDeploymentActionAppliers(
  ports: DeploymentMutationPorts
): Pick<ApplyDependencies, "applyNativeAction" | "applyRecordAction"> {
  const applyRecordAction = async (
    action: RecordMutationAction
  ): Promise<DefiniteMutationAttempt> => {
    switch (action.kind) {
      case "AdmitTargetIdentity": {
        const applied = await ports.identityWriter.admit(action.target, action.sidecar);
        return applied.ok ? mutationApplied() : mutationNotApplied(applied.issues);
      }
      case "PublishReceipt": {
        const applied = await ports.receiptWriter.publish(
          action.target,
          action.prior,
          action.receipt
        );
        return applied.ok ? mutationApplied() : mutationNotApplied(applied.issues);
      }
    }
  };
  return Object.freeze({
    applyNativeAction: async (action) => await ports.providerMutator.apply(action),
    applyRecordAction,
  });
}

function mutationApplied(): DefiniteMutationAttempt {
  return Object.freeze({ kind: "applied" });
}

function mutationNotApplied(
  issues: NonEmptyReadonlyArray<ProviderDeploymentIssue>
): DefiniteMutationAttempt {
  return Object.freeze({ kind: "not-applied", issues });
}

export function resultFailure<T>(issues: readonly ProviderDeploymentIssue[]): DeploymentResult<T> {
  const first =
    issues[0] ?? issue("MUTATION_FAILED", "operation", "Operation failed without a specific issue");
  return failure([first, ...issues.slice(1)]);
}

export { success };

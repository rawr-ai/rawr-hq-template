import type {
  ArtifactReader as BuildArtifactReader,
  MechanicalEvidenceStore as BuildEvidenceStore,
} from "@rawr/agent-plugin-build";
import {
  createMechanicalEvidenceHandle as createPromotionEvidenceHandle,
  type CurrentMainResolution,
} from "@rawr/agent-plugin-promotion";
import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  parseReleaseSetDigest,
  payloadEntryBytes,
  type AgentPluginRelease,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-release";
import {
  createCompleteNativeHomesObservation,
  createMechanicalProviderEvidence,
  createProviderInventory,
  createTargetIdentitySidecar,
  marketplaceState,
  parseAdapterProtocol,
  parseCanonicalStatusRequest,
  parseProviderDeploymentRequest,
  parseProviderTarget,
  planTarget,
  renderCompleteProjection,
  type CompleteNativeHomesApplication,
  type CanonicalStatusDependencies,
  type CanonicalSyncDependencies,
  type CompleteTestDependencies,
  type DeploymentResult,
  type ManagedRetireDependencies,
  type NativeMemberObservation,
  type ProviderMutationAction,
  type ProviderMutationPostState,
  type TargetedTestDependencies,
} from "@rawr/agent-provider-deployment";
import type { ProviderOwnerRuntime } from "@rawr/agent-provider-deployment/owner-protocol";
import { describe, expect, it } from "vitest";

import { productFixture } from "../../../../packages/agent-plugin-release/test/fixtures";
import {
  governedObservation,
  mustPromotion,
  promotionFixture,
} from "../../../../services/agent-plugin-promotion/test/fixtures";
import {
  createControllerProviderCapsuleWriter,
  createControllerCanonicalStatusApplication,
  createControllerCanonicalSyncApplication,
  createControllerCompleteTestApplication,
  createControllerManagedRetireApplication,
  createControllerTargetedTestApplication,
  createExportKnownNativeHomesReader,
  createPromotionCanonicalChannelReader,
  createPromotionMechanicalEvidenceReader,
  createProviderMechanicalEvidencePublisher,
  createProviderOwnerProtocolRegistrationV1,
  createProviderVerifiedReleaseReader,
  type CurrentMainResolver,
} from "../../src/lib/agent-plugins/composition";
import type {
  CapsuleActionHandle,
  CapsuleApplyingSessionV1,
  CapsuleGeneration,
  CapsuleUndoWriterV1,
} from "../../src/lib/agent-plugins/undo/contract";

describe("agent plugin lifecycle composition", () => {
  it("keeps five inert application factories on their exact disjoint port sets", async () => {
    const portSets = {
      targeted: dependencyKeys<TargetedTestDependencies>()({
        releases: true,
        provider: true,
        providerMutator: true,
        receipts: true,
        receiptWriter: true,
        identities: true,
        identityWriter: true,
        projectionMaterializer: true,
        marketplaceMaterializer: true,
        priorProjections: true,
        capsule: true,
        evidence: true,
      }),
      complete: dependencyKeys<CompleteTestDependencies>()({
        releases: true,
        provider: true,
        providerMutator: true,
        receipts: true,
        receiptWriter: true,
        identities: true,
        identityWriter: true,
        projectionMaterializer: true,
        marketplaceMaterializer: true,
        priorProjections: true,
        capsule: true,
        evidence: true,
      }),
      canonicalSync: dependencyKeys<CanonicalSyncDependencies>()({
        channel: true,
        releases: true,
        provider: true,
        providerMutator: true,
        receipts: true,
        receiptWriter: true,
        identities: true,
        identityWriter: true,
        projectionMaterializer: true,
        marketplaceMaterializer: true,
        priorProjections: true,
        capsule: true,
      }),
      canonicalStatus: dependencyKeys<CanonicalStatusDependencies>()({
        channel: true,
        releases: true,
        provider: true,
        receipts: true,
      }),
      managedRetire: dependencyKeys<ManagedRetireDependencies>()({
        provider: true,
        providerMutator: true,
        receipts: true,
        receiptWriter: true,
        identities: true,
        identityWriter: true,
        capsule: true,
        priorProjections: true,
        marketplaceMaterializer: true,
      }),
    };
    expect(portSets.canonicalStatus).toEqual(["channel", "provider", "receipts", "releases"]);
    expect(portSets.canonicalStatus).not.toContain("providerMutator");
    expect(portSets.canonicalStatus).not.toContain("capsule");
    expect(portSets.canonicalStatus).not.toContain("evidence");

    let dependencyConstructions = 0;
    const unconstructed = () => {
      dependencyConstructions += 1;
      throw new Error("invalid input must not construct production ports");
    };
    const applications = [
      createControllerTargetedTestApplication(unconstructed),
      createControllerCompleteTestApplication(unconstructed),
      createControllerCanonicalSyncApplication(unconstructed),
      createControllerCanonicalStatusApplication(unconstructed),
      createControllerManagedRetireApplication(unconstructed),
    ];
    for (const application of applications) expect((await application({})).ok).toBe(false);
    expect(dependencyConstructions).toBe(0);
  });

  it("adapts the build artifact owner without rebuilding or changing snapshots", async () => {
    const fixture = providerFixture();
    let reads = 0;
    const buildReader: BuildArtifactReader = {
      async read(ref) {
        reads += 1;
        return ref.kind === "complete-set" && ref.releaseSetDigest === fixture.snapshot.ref.releaseSetDigest
          ? { kind: "Verified", snapshot: fixture.snapshot }
          : { kind: "Missing", ref };
      },
    };

    const reader = createProviderVerifiedReleaseReader(buildReader);
    const found = await reader.read(fixture.snapshot.ref);
    expect(found).toEqual({ ok: true, value: fixture.snapshot });

    const unknownDigest = parseReleaseSetDigest(`rs1_${"f".repeat(64)}`, "unknown.releaseSetDigest");
    if (!unknownDigest.ok) throw new Error("Invalid unknown release-set fixture");
    const unknown = createCompleteSetArtifactRef(unknownDigest.value);
    const missing = await reader.read(unknown);
    expect(missing.ok).toBe(false);
    expect(reads).toBe(2);
  });

  it("publishes provider evidence once and decodes the same bytes for promotion", async () => {
    const fixture = providerFixture();
    const evidence = createMechanicalProviderEvidence(
      { kind: "complete-test", releaseSet: fixture.snapshot.ref },
      fixture.request.evaluationProfile,
      [{
        kind: "verified",
        targetDigest: fixture.target.targetDigest,
        provider: fixture.target.provider,
        projectionDigest: fixture.projection.projectionDigest,
        adapterProtocol: fixture.projection.adapterProtocol,
        capabilityProfileDigest: fixture.projection.capabilityProfile.capabilityProfileDigest,
        visibleFingerprint: `vf1_${"a".repeat(64)}`,
        payloadDigests: fixture.projection.members.map((member) => member.releaseRef.artifactDigest),
      }],
    );
    const memory = new Map<string, Uint8Array>();
    let publications = 0;
    const store: BuildEvidenceStore = {
      async read(handle) {
        const bytes = memory.get(handle.digest);
        return bytes === undefined
          ? { kind: "Missing", handle }
          : { kind: "Verified", handle, bytes: new Uint8Array(bytes) };
      },
      async publish(handle, bytes) {
        publications += 1;
        if (memory.has(handle.digest)) return { kind: "ReadOnlyConverged", handle };
        memory.set(handle.digest, new Uint8Array(bytes));
        return { kind: "Published", handle };
      },
    };

    const publisher = createProviderMechanicalEvidencePublisher(store);
    const first = await publisher.publish(evidence);
    const second = await publisher.publish(evidence);
    expect(first.ok && first.value.evidenceDigest).toBe(evidence.evidenceDigest);
    expect(second.ok && second.value.evidenceDigest).toBe(evidence.evidenceDigest);
    expect(publications).toBe(2);

    const promotionHandle = mustPromotion(createPromotionEvidenceHandle({
      protocol: "agent-plugin-mechanical-evidence/v1",
      digest: evidence.evidenceDigest,
      byteLength: evidence.bytes.byteLength,
    }));
    const observed = await createPromotionMechanicalEvidenceReader(store).read(promotionHandle);
    if (!observed.ok) {
      throw new Error(`${observed.failure.code}: ${observed.failure.message}`);
    }
    expect(observed.observation.projections).toEqual([{
      provider: fixture.projection.provider,
      projectionDigest: fixture.projection.projectionDigest,
      adapterProtocol: fixture.projection.adapterProtocol,
      capabilityProfileDigest: fixture.projection.capabilityProfile.capabilityProfileDigest,
    }]);
    expect(observed.observation.targets[0]).toMatchObject({
      targetIdentity: fixture.target.targetDigest,
      outcome: "passed",
    });
  });

  it("translates governed current-main identities into provider-owned channel values", async () => {
    const fixture = promotionFixture();
    const provider = providerFixture();
    let resolverCalls = 0;
    const resolution: CurrentMainResolution = {
      kind: "CURRENT_ELIGIBLE",
      observation: {
        record: fixture.currentMain,
        policy: fixture.policy,
        acceptance: governedObservation(fixture),
        promotion: fixture.promotion,
      },
    };
    const resolver: CurrentMainResolver = async () => {
      resolverCalls += 1;
      return resolution;
    };
    const request = mustProvider(parseCanonicalStatusRequest({
      kind: "canonical-status",
      channel: "current-main",
      locator: {
        repositoryIdentity: fixture.locator.expectedRepositoryIdentity,
        workspaceRoot: fixture.locator.workspacePath,
      },
      targets: [{ provider: provider.target.provider, home: provider.target.home }],
    }));

    const result = await createPromotionCanonicalChannelReader(resolver).resolve(request.locator);
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.kind !== "current-eligible") return;
    expect(resolverCalls).toBe(1);
    expect(result.value.projections.map((binding) => ({
      provider: binding.provider,
      projectionDigest: binding.projectionDigest,
      capabilityProfileDigest: binding.capabilityProfileDigest,
    }))).toEqual(fixture.currentMain.body.projections.map((binding) => ({
      provider: binding.provider,
      projectionDigest: binding.projectionDigest,
      capabilityProfileDigest: binding.capabilityProfileDigest,
    })));
    expect(result.value.acceptanceDigest).toBe(fixture.acceptance.acceptanceDigest);
    expect(result.value.promotionDigest).toBe(fixture.promotion.attestationDigest);
  });

  it("projects the complete provider-home observation into the export read model", async () => {
    const fixture = providerFixture();
    const homes = mustProvider(createCompleteNativeHomesObservation([
      createTargetIdentitySidecar(fixture.target),
    ]));
    const application: CompleteNativeHomesApplication = async () => providerSuccess(homes);

    const observed = await createExportKnownNativeHomesReader(application).readCompleteSnapshot();
    expect(observed.kind).toBe("Verified");
    if (observed.kind !== "Verified") return;
    expect(observed.snapshot.homes).toEqual([{
      provider: fixture.target.provider,
      canonicalPath: fixture.target.home,
    }]);
    expect(observed.snapshot.snapshotDigest).toMatch(/^nh1_[0-9a-f]{64}$/u);
  });

  it("composes one provider owner registration and one exact applied capsule prefix", async () => {
    const fixture = providerFixture();
    const candidate = {
      protocol: "agent-provider-deployment@v1" as const,
      plans: [fixture.plan],
    };
    const captured: { input?: Parameters<CapsuleUndoWriterV1["begin"]>[0] } = {};
    const staged: CapsuleActionHandle[] = [];
    const applied: unknown[] = [];
    const controller: CapsuleUndoWriterV1 = {
      async preflight() {
        return { kind: "Accepted" };
      },
      async begin(input) {
        captured.input = input;
        const session = capsuleSession(staged, applied);
        return {
          kind: "Accepted",
          generation: capsuleGeneration(),
          admittedActions: input.actions.map((_, index) => ({ actionHandle: capsuleHandle(index) })),
          session,
        };
      },
    };
    const writer = createControllerProviderCapsuleWriter(controller, "personal-rawr-hq");
    expect((await writer.preflight(candidate)).ok).toBe(true);
    const begun = await writer.begin(candidate);
    expect(begun.ok).toBe(true);
    if (!begun.ok) return;

    const actions = fixture.plan.steps.flatMap((step) => step.kind === "mutate" ? [step.action] : []);
    for (const action of actions) {
      expect((await begun.value.stage(action)).ok).toBe(true);
      const post = appliedPost(action);
      if (action.kind === "InstallMember" && post.kind === "member" && post.member !== null) {
        const invalid = Object.freeze({
          kind: "member" as const,
          member: Object.freeze({ ...post.member, enablement: "disabled" as const }),
        });
        expect((await begun.value.applied({ action, post: invalid })).ok).toBe(false);
      }
      expect((await begun.value.applied({ action, post })).ok).toBe(true);
    }
    expect((await begun.value.settle()).ok).toBe(true);
    expect(staged).toHaveLength(actions.length);
    expect(applied).toHaveLength(actions.length);
    expect(captured.input?.targets).toHaveLength(1);
    expect(captured.input?.actions).toHaveLength(actions.length);
    expect(applied).toContainEqual(expect.objectContaining({
      post: expect.objectContaining({
        kind: "member",
        member: expect.objectContaining({ enablement: "enabled" }),
      }),
    }));

    const registration = createProviderOwnerProtocolRegistrationV1(inertOwnerRuntime());
    const encodedAction = captured.input?.actions[0]?.action;
    const parsedAction = registration.codec.parseAction(encodedAction);
    expect(registration.codec.inspectAction(parsedAction).actionType).toBe("ProviderMutationActionV1");
    expect(registration.codec.parseAction(registration.codec.encodeAction(parsedAction))).toEqual(parsedAction);
  });

  it("rejects a capsule content-authority mismatch before any controller call", async () => {
    const fixture = providerFixture();
    let controllerCalls = 0;
    const controller: CapsuleUndoWriterV1 = {
      async preflight() {
        controllerCalls += 1;
        return { kind: "Accepted" };
      },
      async begin(input) {
        controllerCalls += 1;
        return {
          kind: "Accepted",
          generation: capsuleGeneration(),
          admittedActions: input.actions.map((_, index) => ({ actionHandle: capsuleHandle(index) })),
          session: capsuleSession([], []),
        };
      },
    };
    const candidate = {
      protocol: "agent-provider-deployment@v1" as const,
      plans: [fixture.plan],
    };
    const writer = createControllerProviderCapsuleWriter(controller, "wrong-content-authority");

    expect((await writer.preflight(candidate)).ok).toBe(false);
    expect((await writer.begin(candidate)).ok).toBe(false);
    expect(controllerCalls).toBe(0);
  });
});

function providerFixture() {
  const product = productFixture();
  const members = [releaseSnapshot(product.alphaRelease), releaseSnapshot(product.betaRelease)];
  const snapshot: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }> = {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(product.releaseSet.releaseSetDigest),
    releaseSet: product.releaseSet,
    members,
  };
  const adapterProtocol = mustProvider(parseAdapterProtocol("codex-native-adapter@v1"));
  const projection = mustProvider(renderCompleteProjection("codex", adapterProtocol, snapshot));
  const target = mustProvider(parseProviderTarget({ provider: "codex", home: "/tmp/rawr-c3-composition" }));
  const request = mustProvider(parseProviderDeploymentRequest({
    kind: "complete-test",
    releaseSet: {
      kind: snapshot.ref.kind,
      releaseSetDigest: snapshot.ref.releaseSetDigest,
    },
    evaluationProfile: "fresh-agent-v1",
    targets: [{ provider: target.provider, home: target.home }],
  }));
  if (request.kind !== "complete-test") throw new Error("Expected complete-test fixture");
  const plan = planTarget({
    authority: { kind: "complete-test", request, projection },
    inventory: createProviderInventory(target, []),
    receipt: { kind: "absent" },
    targetIdentity: { kind: "absent" },
    capabilities: { compatible: true, missing: [] },
  });
  if (plan.state !== "mutating") throw new Error("Expected mutating provider plan");
  return { snapshot, projection, target, request, plan };
}

function appliedPost(action: ProviderMutationAction): ProviderMutationPostState {
  switch (action.kind) {
    case "AdmitTargetIdentity":
      return Object.freeze({ kind: "identity", observation: Object.freeze({ kind: "present", sidecar: action.sidecar }) });
    case "SetMarketplace":
      return Object.freeze({
        kind: "marketplace",
        observation: action.registration === null
          ? Object.freeze({ kind: "absent" })
          : Object.freeze({ kind: "present", state: marketplaceState(action.registration) }),
      });
    case "InstallMember":
      return Object.freeze({ kind: "member", member: projectedPostMember(action, "enabled") });
    case "EnableMember":
      return Object.freeze({ kind: "member", member: Object.freeze({ ...action.prior, enablement: "enabled" }) });
    case "RetireMember":
      return Object.freeze({ kind: "member", member: null });
    case "PublishReceipt":
    case "NormalizeReceipt":
      return Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "present", receipt: action.receipt }) });
    case "RemoveReceipt":
      return Object.freeze({ kind: "receipt", observation: Object.freeze({ kind: "absent" }) });
  }
}

function projectedPostMember(
  action: Extract<ProviderMutationAction, { kind: "InstallMember" }>,
  enablement: NativeMemberObservation["enablement"],
): NativeMemberObservation {
  return Object.freeze({
    pluginId: action.member.pluginId,
    nativeIdentity: action.member.nativeIdentity,
    artifactAuthority: action.member.artifactAuthority,
    providerSourceIdentity: action.member.providerSourceIdentity,
    memberFingerprint: action.member.memberFingerprint,
    enablement,
    visibleSkills: action.member.visible.skills,
    visibleHooks: action.member.visible.hooks,
  });
}

function releaseSnapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return {
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  };
}

function capsuleSession(
  staged: CapsuleActionHandle[],
  applied: unknown[],
): CapsuleApplyingSessionV1 {
  return {
    async stage({ actionHandle }) {
      staged.push(actionHandle);
      return { kind: "Accepted", generation: capsuleGeneration() };
    },
    async discardStaged() {
      return { kind: "Accepted", generation: capsuleGeneration() };
    },
    async markApplied({ observedPost }) {
      applied.push(observedPost);
      return { kind: "Accepted", generation: capsuleGeneration() };
    },
    async suspend() {
      return { kind: "Released" };
    },
    async settle() {
      return { kind: "Accepted", generation: capsuleGeneration(), synchronization: { kind: "Released" } };
    },
    async abort() {
      return { kind: "Accepted", generation: capsuleGeneration(), synchronization: { kind: "Released" } };
    },
  };
}

function inertOwnerRuntime(): ProviderOwnerRuntime {
  return {
    readIdentity: async () => providerSuccess({ kind: "absent" }),
    removeIdentityExact: async () => providerSuccess(null),
    readMarketplace: async () => providerSuccess({ kind: "absent" }),
    restoreMarketplaceExact: async () => providerSuccess(null),
    readMember: async () => providerSuccess(null),
    restoreMemberExact: async () => providerSuccess(null),
    readReceipt: async () => providerSuccess({ kind: "absent" }),
    restoreReceiptExact: async () => providerSuccess(null),
  };
}

function capsuleGeneration(): CapsuleGeneration {
  return "cg1_composition";
}

function capsuleHandle(index: number): CapsuleActionHandle {
  return `ca1_composition_${index}`;
}

function providerSuccess<T>(value: T): DeploymentResult<T> {
  return Object.freeze({ ok: true, value });
}

function dependencyKeys<T extends object>() {
  return (keys: Record<keyof T, true>): readonly string[] => Object.freeze(Object.keys(keys).sort());
}

function mustProvider<T>(result: DeploymentResult<T>): T {
  if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join("; "));
  return result.value;
}

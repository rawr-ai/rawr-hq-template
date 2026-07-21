import { schema } from "@rawr/hq-sdk";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

import {
  CanonicalStatusInputSchema,
  CanonicalStatusResultSchema,
  type CanonicalStatusProcedureResult,
  CanonicalSyncInputSchema,
  CanonicalSyncResultSchema,
  type CanonicalSyncProcedureResult,
  CompleteTestInputSchema,
  CompleteTestResultSchema,
  type CompleteTestProcedureResult,
  TargetedTestInputSchema,
  TargetedTestResultSchema,
} from "../../../src/service/modules/providers/schemas";
import type {
  CanonicalStatusInput,
  CanonicalSyncInput,
  CompleteTestInput,
  TargetedTestInput,
} from "../../../src/service/modules/providers/model/dto/mode";
import {
  parseCanonicalStatusRequest,
  parseProviderDeploymentRequest,
} from "../../../src/service/modules/providers/model/dto/mode";
import {
  type CanonicalStatusOutcome,
  type CompleteTestProviderOperationOutcome,
  type ProviderProjectionBinding,
  ProviderProjectionBindingSchema,
  type TargetedTestProviderOperationOutcome,
} from "../../../src/service/modules/providers/model/dto/outcome";
import { parseProviderTargets } from "../../../src/service/modules/providers/model/dto/provider-target";
import {
  issue as providerIssue,
  success,
} from "../../../src/service/modules/providers/model/errors/deployment-result";
import { verifyTargetReceipt } from "../../../src/service/modules/providers/model/policy/receipt";
import {
  canonicalStatusResult,
  completeTestOperationResult,
  targetedTestOperationResult,
} from "../../../src/service/modules/providers/router/procedure-result";
import {
  BoundedReadonlyArray,
  EmptyReadonlyArray,
  NonEmptyReadonlyArray,
} from "../../../src/service/model/dto/structural";
import {
  CompleteSetArtifactRefInputSchema,
  ReleaseArtifactRefInputSchema,
} from "../../../src/service/shared/release";
import {
  CompleteSetArtifactRefSchema,
  ReleaseArtifactRefSchema,
} from "../../../src/service/modules/providers/model/dto/mode";

type ProviderFailureIssues = Extract<CompleteTestProcedureResult, { ok: false }>["issues"];
type SuccessfulCanonicalSync = Extract<CanonicalSyncProcedureResult, { ok: true }>["value"];
type MutatedAppliedPrefix = Extract<
  SuccessfulCanonicalSync["targets"][number],
  { kind: "mutated" }
>["appliedPrefix"];
type ReadOnlyCanonicalTarget = Extract<
  SuccessfulCanonicalSync["targets"][number],
  { kind: "read-only-converged" }
>;
type SuccessfulCanonicalStatus = Extract<
  CanonicalStatusProcedureResult,
  { ok: true }
>["value"];
type SuccessfulCompleteTest = Extract<
  CompleteTestProcedureResult,
  { ok: true }
>["value"];

// @ts-expect-error Procedure failure always reports at least one issue.
const emptyProviderFailureIssues: ProviderFailureIssues = [];
// @ts-expect-error A mutated canonical target always reports an applied mutation.
const emptyAppliedPrefix: MutatedAppliedPrefix = [];
void emptyProviderFailureIssues;
void emptyAppliedPrefix;

function findUnboundedPublicResultLeaves(value: unknown): string[] {
  const findings: string[] = [];
  const seen = new Set<object>();

  const visit = (candidate: unknown, path: string): void => {
    if (candidate === null || typeof candidate !== "object" || seen.has(candidate)) return;
    seen.add(candidate);
    const node = candidate as Record<string, unknown>;

    if (node.type === "array") {
      if (!Number.isSafeInteger(node.maxItems)) findings.push(`${path}: missing maxItems`);
      if (node["~immutable"] !== true) findings.push(`${path}: mutable array`);
    }
    if (
      node.type === "string"
      && node.const === undefined
      && node.pattern === undefined
      && !Number.isSafeInteger(node.maxLength)
    ) {
      findings.push(`${path}: unbounded text`);
    }

    for (const [key, nested] of Object.entries(node)) visit(nested, `${path}.${key}`);
  };

  visit(value, "$result");
  return findings;
}

const digest = (prefix: string, seed: string) => `${prefix}${seed.repeat(64)}`;
const target = Object.freeze({
  provider: "codex",
  home: "/tmp/codex-home",
  targetDigest: digest("pt1_", "1"),
});
const authority = Object.freeze({
  protocol: "agent-plugin-artifact-authority@v1",
  contentAuthority: "personal-rawr-hq",
  sourceCommit: "a".repeat(40),
});
const releaseRef = Object.freeze({
  kind: "release",
  releaseDigest: digest("rd1_", "2"),
  artifactDigest: digest("ad1_", "3"),
});
const file = Object.freeze({
  path: "skills/state-machine-design/SKILL.md",
  mode: 0o644,
  contentDigest: digest("sha256_", "4"),
  bytes: new TextEncoder().encode("state machine\n"),
});
const visible = Object.freeze({
  pluginIdentity: "cognition@rawr-hq",
  skills: ["state-machine-design"],
  hooks: [],
});
const member = Object.freeze({
  pluginId: "cognition",
  releaseRef,
  artifactAuthority: authority,
  providerSourceIdentity: "personal-rawr-hq",
  nativeIdentity: "cognition@rawr-hq",
  files: [file],
  visible,
  memberFingerprint: digest("pm1_", "5"),
});
const marketplaceState = Object.freeze({
  provider: "codex",
  adapterProtocol: "codex-native-adapter@v1",
  marketplaceIdentity: "personal-rawr-hq",
  projectionDigest: digest("mp1_", "6"),
  sourceDigest: digest("ps1_", "7"),
});
const registration = Object.freeze({
  ...marketplaceState,
  members: [{
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    providerSourceIdentity: member.providerSourceIdentity,
    sourceProjectionDigest: digest("ap1_", "8"),
    memberFingerprint: member.memberFingerprint,
  }],
});
const projection = Object.freeze({
  schemaVersion: 1,
  provider: "codex",
  rendererProtocol: "rawr-provider-renderer/codex@v1",
  adapterProtocol: "codex-native-adapter@v1",
  artifactAuthority: authority,
  source: { kind: "targeted", releases: [releaseRef] },
  marketplace: {
    identity: "personal-rawr-hq",
    sourceDigest: marketplaceState.sourceDigest,
    files: [file],
  },
  capabilityProfile: {
    schemaVersion: 1,
    provider: "codex",
    adapterProtocol: "codex-native-adapter@v1",
    required: ["native-plugin-install", "native-plugin-enable", "visible-skill-inventory"],
    capabilityProfileDigest: digest("cp1_", "9"),
  },
  members: [member],
  projectionDigest: digest("ap1_", "8"),
});
const verifiedMember = Object.freeze({
  pluginId: member.pluginId,
  nativeIdentity: member.nativeIdentity,
  artifactAuthority: authority,
  providerSourceIdentity: member.providerSourceIdentity,
  memberFingerprint: member.memberFingerprint,
});
const nativeMember = Object.freeze({
  ...verifiedMember,
  enablement: "enabled",
  visibleSkills: ["state-machine-design"],
  visibleHooks: [],
});
const receipt = Object.freeze({
  schemaVersion: 1,
  receiptDigest: digest("tr1_", "a"),
  body: {
    schemaVersion: 1,
    provider: "codex",
    targetDigest: target.targetDigest,
    generation: 1,
    lineage: { kind: "initial" },
    marketplace: marketplaceState,
    scope: {
      kind: "targeted-test",
      requestDigest: digest("prq1_", "b"),
      projectionDigest: projection.projectionDigest,
      adapterProtocol: projection.adapterProtocol,
      capabilityProfileDigest: projection.capabilityProfile.capabilityProfileDigest,
      visibleFingerprint: digest("vf1_", "c"),
      verifiedMembers: [verifiedMember],
      releases: [releaseRef],
      evaluationProfile: "fresh-agent-v1",
    },
    managedMembers: [{ ...verifiedMember, sourceProjectionDigest: projection.projectionDigest }],
  },
});
const issue = Object.freeze({
  code: "VISIBILITY_FAILED",
  path: "targets[0]",
  message: "visible skill was absent",
  expected: "state-machine-design",
  actual: "",
});
const actions = Object.freeze([
  {
    kind: "AdmitTargetIdentity",
    target,
    sidecar: {
      schemaVersion: 1,
      provider: "codex",
      canonicalHome: target.home,
      targetDigest: target.targetDigest,
      identityDigest: digest("ti1_", "d"),
    },
  },
  {
    kind: "SetMarketplace",
    role: "final",
    target,
    expected: { kind: "absent" },
    registration,
  },
  {
    kind: "InstallMember",
    target,
    activeMarketplace: registration,
    member,
  },
  {
    kind: "EnableMember",
    target,
    activeMarketplace: registration,
    member,
  },
  {
    kind: "RetireMember",
    target,
    activeMarketplace: registration,
    member: nativeMember,
  },
  {
    kind: "PublishReceipt",
    target,
    prior: { kind: "absent" },
    receipt,
  },
]);
const plan = Object.freeze({
  target,
  state: "mutating",
  projection,
  steps: [
    ...actions.map((action) => ({ kind: "mutate", action })),
    { kind: "verify", target, projection },
    {
      kind: "verify-managed",
      target,
      claims: [{ ...verifiedMember, sourceProjectionDigest: projection.projectionDigest }],
      marketplace: registration,
    },
    { kind: "verify-retired", target, nativeIdentity: "legacy@rawr-hq" },
  ],
  issues: [],
});
const events = Object.freeze([
  { phase: "planned", target, plan },
  { phase: "applied", target, action: actions[0] },
  {
    phase: "uncertain",
    target,
    action: actions[1],
    lastKnown: "bridge-returned",
    issues: [issue],
  },
  { phase: "verified", target, visibleFingerprint: digest("vf1_", "c") },
  { phase: "retired", target, action: actions[4] },
  { phase: "skipped", target, reason: "read-only-converged" },
  { phase: "blocked", target, issues: [issue] },
  { phase: "failed", target, issues: [issue] },
]);
const projectionBinding = Object.freeze({
  provider: projection.provider,
  projectionDigest: projection.projectionDigest,
  rendererProtocol: projection.rendererProtocol,
  adapterProtocol: projection.adapterProtocol,
  capabilityProfileDigest: projection.capabilityProfile.capabilityProfileDigest,
}) satisfies ProviderProjectionBinding;
const byteBearingResult = Object.freeze({
  ok: true,
  value: {
    status: "Mutated",
    targets: [{
      target,
      status: "mutated",
      events,
      issues: [],
      visibleFingerprint: digest("vf1_", "c"),
      projectionBinding,
    }],
    evidence: null,
    issues: [],
  },
});

describe("provider procedure input schema boundary", () => {
  const release = Object.freeze({
    kind: "release" as const,
    releaseDigest: digest("rd1_", "1"),
    artifactDigest: digest("ad1_", "2"),
  });
  const releaseSet = Object.freeze({
    kind: "complete-set" as const,
    releaseSetDigest: digest("rs1_", "3"),
  });
  const providerTarget = Object.freeze({ provider: "codex" as const, home: "/tmp/codex-home" });
  const locator = Object.freeze({
    repositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    workspaceRoot: "/tmp/rawr-hq",
  });

  it("derives each public input type from its closed TypeBox schema", () => {
    expectTypeOf<TargetedTestInput>().toEqualTypeOf<Static<typeof TargetedTestInputSchema>>();
    expectTypeOf<CompleteTestInput>().toEqualTypeOf<Static<typeof CompleteTestInputSchema>>();
    expectTypeOf<CanonicalSyncInput>().toEqualTypeOf<Static<typeof CanonicalSyncInputSchema>>();
    expectTypeOf<CanonicalStatusInput>().toEqualTypeOf<Static<typeof CanonicalStatusInputSchema>>();
  });

  it("reuses the shared artifact-reference input schemas", () => {
    expect(ReleaseArtifactRefSchema).toBe(ReleaseArtifactRefInputSchema);
    expect(CompleteSetArtifactRefSchema).toBe(CompleteSetArtifactRefInputSchema);
  });

  it("accepts the four canonical request shapes", () => {
    expect(Value.Check(TargetedTestInputSchema, {
      kind: "targeted-test",
      releases: [release],
      evaluationProfile: "provider-smoke@v1",
      targets: [providerTarget],
    })).toBe(true);
    expect(Value.Check(CompleteTestInputSchema, {
      kind: "complete-test",
      releaseSet,
      evaluationProfile: "provider-smoke@v1",
      targets: [providerTarget],
    })).toBe(true);
    expect(Value.Check(CanonicalSyncInputSchema, {
      kind: "canonical-sync",
      channel: "current-main",
      locator,
      targets: [providerTarget],
    })).toBe(true);
    expect(Value.Check(CanonicalStatusInputSchema, {
      kind: "canonical-status",
      channel: "current-main",
      locator,
      targets: [providerTarget],
    })).toBe(true);
  });

  it.each([
    ["relative provider home", TargetedTestInputSchema, {
      kind: "targeted-test",
      releases: [release],
      evaluationProfile: "provider-smoke@v1",
      targets: [{ ...providerTarget, home: "relative/home" }],
    }],
    ["root provider home", CompleteTestInputSchema, {
      kind: "complete-test",
      releaseSet,
      evaluationProfile: "provider-smoke@v1",
      targets: [{ ...providerTarget, home: "/" }],
    }],
    ["path repository identity", CanonicalSyncInputSchema, {
      kind: "canonical-sync",
      channel: "current-main",
      locator: { ...locator, repositoryIdentity: "/tmp/rawr-hq" },
      targets: [providerTarget],
    }],
    ["relative workspace root", CanonicalStatusInputSchema, {
      kind: "canonical-status",
      channel: "current-main",
      locator: { ...locator, workspaceRoot: "relative/rawr-hq" },
      targets: [providerTarget],
    }],
  ] as const)("accepts structurally bounded %s for domain classification", async (_label, inputSchema, candidate) => {
    expect(Value.Check(inputSchema, candidate)).toBe(true);
    const adapted = await schema(inputSchema)["~standard"].validate(candidate);
    expect("value" in adapted).toBe(true);
  });

  it.each([
    ["invalid evaluation profile", CompleteTestInputSchema, {
      kind: "complete-test",
      releaseSet,
      evaluationProfile: "Provider Smoke",
      targets: [providerTarget],
    }],
    ["extra selector", CanonicalSyncInputSchema, {
      kind: "canonical-sync",
      channel: "current-main",
      locator,
      targets: [providerTarget],
      releaseSet,
    }],
  ] as const)("rejects %s before handler execution", (_label, inputSchema, candidate) => {
    expect(Value.Check(inputSchema, candidate)).toBe(false);
  });

  it.each([
    ["relative provider home", {
      kind: "targeted-test",
      releases: [release],
      evaluationProfile: "provider-smoke@v1",
      targets: [{ ...providerTarget, home: "relative/home" }],
    }, "INVALID_HOME", "deployment"],
    ["root provider home", {
      kind: "complete-test",
      releaseSet,
      evaluationProfile: "provider-smoke@v1",
      targets: [{ ...providerTarget, home: "/" }],
    }, "INVALID_HOME", "deployment"],
    ["path repository identity", {
      kind: "canonical-sync",
      channel: "current-main",
      locator: { ...locator, repositoryIdentity: "/tmp/rawr-hq" },
      targets: [providerTarget],
    }, "INVALID_LOCATOR", "deployment"],
    ["relative workspace root", {
      kind: "canonical-status",
      channel: "current-main",
      locator: { ...locator, workspaceRoot: "relative/rawr-hq" },
      targets: [providerTarget],
    }, "INVALID_LOCATOR", "status"],
  ] as const)("returns typed $expectedCode for $label", (_label, candidate, expectedCode, parser) => {
    const result = parser === "status"
      ? parseCanonicalStatusRequest(candidate)
      : parseProviderDeploymentRequest(candidate);
    expect(result).toMatchObject({
      ok: false,
      issues: [{ code: expectedCode }],
    });
  });
});

describe("provider procedure result schema boundary", () => {
  it.each([
    ["complete test", CompleteTestResultSchema],
    ["targeted test", TargetedTestResultSchema],
    ["canonical sync", CanonicalSyncResultSchema],
    ["canonical status", CanonicalStatusResultSchema],
  ])("keeps every %s public collection and plain text leaf bounded", (_label, resultSchema) => {
    expect(findUnboundedPublicResultLeaves(resultSchema)).toEqual([]);
  });

  it("keeps non-empty runtime bounds and static tuples aligned", () => {
    const boundedReadonly = BoundedReadonlyArray(Type.String(), { maxItems: 2 });
    const emptyReadonly = EmptyReadonlyArray(Type.String());
    const bounded = NonEmptyReadonlyArray(Type.String(), { maxItems: 2 });
    expect(Value.Check(boundedReadonly, [])).toBe(true);
    expect(Value.Check(boundedReadonly, ["first", "second", "third"])).toBe(false);
    expect(Value.Check(emptyReadonly, [])).toBe(true);
    expect(Value.Check(emptyReadonly, ["first"])).toBe(false);
    expect(Value.Check(bounded, [])).toBe(false);
    expect(Value.Check(bounded, ["first"])).toBe(true);
    expect(Value.Check(bounded, ["first", "second", "third"])).toBe(false);
    expect(() => NonEmptyReadonlyArray(Type.String(), { maxItems: 0 })).toThrow(
      "Non-empty array schemas require maxItems >= 1",
    );
    expect(() => BoundedReadonlyArray(Type.String(), { maxItems: -1 })).toThrow(
      "Bounded array schemas require maxItems >= 0",
    );
    expect(() => BoundedReadonlyArray(Type.String(), { minItems: 2, maxItems: 1 })).toThrow(
      "Bounded array schemas require 0 <= minItems <= maxItems",
    );
    expectTypeOf<Static<typeof emptyReadonly>>().toEqualTypeOf<readonly []>();
    expectTypeOf<ReadOnlyCanonicalTarget["appliedPrefix"]>().toEqualTypeOf<readonly []>();
    expectTypeOf<ReadOnlyCanonicalTarget["issues"]>().toEqualTypeOf<readonly []>();
    expectTypeOf<SuccessfulCanonicalStatus>().toEqualTypeOf<
      readonly SuccessfulCanonicalStatus[number][]
    >();
    expectTypeOf<SuccessfulCompleteTest["targets"]>().toEqualTypeOf<
      readonly SuccessfulCompleteTest["targets"][number][]
    >();
  });

  it("enforces public result text and target collection bounds", () => {
    expect(Value.Check(CompleteTestResultSchema, {
      ok: false,
      issues: [{ ...issue, message: "x".repeat(4_097) }],
    })).toBe(false);
    expect(Value.Check(CompleteTestResultSchema, {
      ...byteBearingResult,
      value: {
        ...byteBearingResult.value,
        targets: Array.from(
          { length: 65 },
          () => byteBearingResult.value.targets[0],
        ),
      },
    })).toBe(false);
  });

  it("owns the projection binding schema, static type, and closed runtime shape together", () => {
    type Equal<TLeft, TRight> =
      (<T>() => T extends TLeft ? 1 : 2) extends
      (<T>() => T extends TRight ? 1 : 2)
        ? (<T>() => T extends TRight ? 1 : 2) extends
          (<T>() => T extends TLeft ? 1 : 2)
          ? true
          : false
        : false;
    type Assert<TValue extends true> = TValue;
    type ProjectionBindingParity = Assert<Equal<
      ProviderProjectionBinding,
      Static<typeof ProviderProjectionBindingSchema>
    >>;
    expectTypeOf<ProjectionBindingParity>().toEqualTypeOf<true>();
    expect(Value.Check(ProviderProjectionBindingSchema, projectionBinding)).toBe(true);

    for (const invalid of [
      { ...projectionBinding, ambientAuthority: true },
      { ...projectionBinding, provider: "unknown" },
      { ...projectionBinding, projectionDigest: digest("rd1_", "a") },
      { ...projectionBinding, rendererProtocol: "renderer-without-version" },
      { ...projectionBinding, adapterProtocol: "adapter@v0" },
      { ...projectionBinding, capabilityProfileDigest: digest("ap1_", "b") },
    ]) {
      expect(Value.Check(ProviderProjectionBindingSchema, invalid)).toBe(false);
    }
  });

  it("projects readonly domain values into detached schema-owned boundary data", async () => {
    const parsedTargets = parseProviderTargets([{ provider: "codex", home: "/tmp/codex-home" }]);
    expect(parsedTargets.ok).toBe(true);
    if (!parsedTargets.ok) throw new Error(parsedTargets.issues[0].message);
    const parsedTarget = parsedTargets.value[0];
    if (parsedTarget === undefined) throw new Error("expected one parsed provider target");

    const domainIssues = Object.freeze([
      providerIssue("VISIBILITY_FAILED", "targets[0]", "visible skill was absent"),
    ]);
    const domainValue: readonly CanonicalStatusOutcome[] = Object.freeze([Object.freeze({
      target: parsedTarget,
      status: "DRIFTED",
      issues: domainIssues,
    })]);

    const projected = await canonicalStatusResult(Promise.resolve(success(domainValue)));
    expect(Value.Check(CanonicalStatusResultSchema, projected)).toBe(true);
    expect(projected.ok).toBe(true);
    if (!projected.ok) throw new Error(projected.issues[0]?.message ?? "projection failed");

    expect(projected.value).not.toBe(domainValue);
    expect(projected.value[0]).not.toBe(domainValue[0]);
    expect(projected.value[0]?.target).not.toBe(domainValue[0]?.target);
    expect(projected.value[0]?.issues).not.toBe(domainValue[0]?.issues);
  });

  it("projects complete and targeted outcomes without exposing provider package bytes", async () => {
    const targetedValue = {
      ...byteBearingResult.value,
      targets: [{ ...byteBearingResult.value.targets[0], projectionBinding: null }],
    };
    const [complete, targeted] = await Promise.all([
      completeTestOperationResult(Promise.resolve(success(
        byteBearingResult.value as unknown as CompleteTestProviderOperationOutcome,
      ))),
      targetedTestOperationResult(Promise.resolve(success(
        targetedValue as unknown as TargetedTestProviderOperationOutcome,
      ))),
    ]);

    expect(Value.Check(CompleteTestResultSchema, complete)).toBe(true);
    expect(Value.Check(TargetedTestResultSchema, targeted)).toBe(true);
    const expectedEventOrder = events.map((event) => (
      event.action === undefined ? event.phase : `${event.phase}:${event.action.kind}`
    ));
    const expectedStepOrder = plan.steps.map((step) => (
      "action" in step && step.action !== undefined
        ? `${step.kind}:${step.action.kind}`
        : step.kind
    ));
    for (const [result, binding] of [
      [complete, projectionBinding],
      [targeted, null],
    ] as const) {
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("provider fixture projection failed");
      const projectedTarget = result.value.targets[0];
      if (projectedTarget === undefined) throw new Error("expected projected provider target");
      expect(projectedTarget.events.map((event) => (
        "action" in event ? `${event.phase}:${event.action.kind}` : event.phase
      ))).toEqual(expectedEventOrder);
      const planned = projectedTarget.events.find((event) => event.phase === "planned");
      if (planned?.phase !== "planned") throw new Error("expected projected provider plan");
      expect(planned.plan.steps.map((step) => (
        step.kind === "mutate" ? `${step.kind}:${step.action.kind}` : step.kind
      ))).toEqual(expectedStepOrder);
      expect(projectedTarget.projectionBinding).toEqual(binding);
      expect(containsUint8Array(result)).toBe(false);
    }

    expect(Value.Check(CompleteTestResultSchema, byteBearingResult)).toBe(false);
    expect(Value.Check(TargetedTestResultSchema, {
      ...byteBearingResult,
      value: {
        ...byteBearingResult.value,
        targets: [{ ...byteBearingResult.value.targets[0], projectionBinding: null }],
      },
    })).toBe(false);
  });

  it("serializes identically regardless of internal provider payload byte length", async () => {
    const tinyComplete = replaceFixtureBytes(byteBearingResult.value, Uint8Array.of(1));
    const largeComplete = replaceFixtureBytes(
      byteBearingResult.value,
      new Uint8Array(2 * 1024 * 1024),
    );
    const targeted = {
      ...byteBearingResult.value,
      targets: [{ ...byteBearingResult.value.targets[0], projectionBinding: null }],
    };
    const tinyTargeted = replaceFixtureBytes(targeted, Uint8Array.of(1));
    const largeTargeted = replaceFixtureBytes(targeted, new Uint8Array(2 * 1024 * 1024));

    const [tinyCompleteResult, largeCompleteResult, tinyTargetedResult, largeTargetedResult] = await Promise.all([
      completeTestOperationResult(Promise.resolve(success(
        tinyComplete as CompleteTestProviderOperationOutcome,
      ))),
      completeTestOperationResult(Promise.resolve(success(
        largeComplete as CompleteTestProviderOperationOutcome,
      ))),
      targetedTestOperationResult(Promise.resolve(success(
        tinyTargeted as TargetedTestProviderOperationOutcome,
      ))),
      targetedTestOperationResult(Promise.resolve(success(
        largeTargeted as TargetedTestProviderOperationOutcome,
      ))),
    ]);

    expect(JSON.stringify(largeCompleteResult)).toBe(JSON.stringify(tinyCompleteResult));
    expect(JSON.stringify(largeTargetedResult)).toBe(JSON.stringify(tinyTargetedResult));
  });

  it("rejects the retired canonical-accepted receipt scope without a compatibility value", () => {
    const common = receipt.body.scope;
    const legacy = {
      ...receipt,
      body: {
        ...receipt.body,
        scope: {
          kind: "canonical-accepted",
          requestDigest: common.requestDigest,
          projectionDigest: common.projectionDigest,
          adapterProtocol: common.adapterProtocol,
          capabilityProfileDigest: common.capabilityProfileDigest,
          visibleFingerprint: common.visibleFingerprint,
          verifiedMembers: common.verifiedMembers,
          releaseSet: { kind: "complete-set", releaseSetDigest: digest("rs1_", "e") },
          acceptanceDigest: digest("ac1_", "f"),
          promotionDigest: digest("pm1_", "0"),
          channel: "current-main",
        },
      },
    };

    const decoded = verifyTargetReceipt(legacy);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.issues[0]).toMatchObject({
        code: "INVALID_RECEIPT",
        path: "receipt.body.scope.kind",
      });
    }
  });

  it("rejects unknown events, extra nested action state, malformed plans, and bogus issue codes", async () => {
    const validResult = await completeTestOperationResult(
      Promise.resolve(success(
        byteBearingResult.value as unknown as CompleteTestProviderOperationOutcome,
      )),
    );
    if (!validResult.ok) throw new Error("provider fixture projection failed");
    const targetOutcome = validResult.value.targets[0];
    if (targetOutcome === undefined) throw new Error("expected projected provider target");
    const planned = targetOutcome.events.find((event) => event.phase === "planned");
    if (planned?.phase !== "planned") throw new Error("expected projected plan event");
    const invalid = [
      {
        ...validResult,
        value: {
          ...validResult.value,
          targets: [{ ...targetOutcome, events: [{ phase: "teleported", target }] }],
        },
      },
      {
        ...validResult,
        value: {
          ...validResult.value,
          targets: [{
            ...targetOutcome,
            events: [{ phase: "applied", target, action: { ...actions[0], ambient: true } }],
          }],
        },
      },
      {
        ...validResult,
        value: {
          ...validResult.value,
          targets: [{
            ...targetOutcome,
            events: [{
              phase: "planned",
              target,
              plan: {
                ...planned.plan,
                steps: [{ kind: "mutate", action: { kind: "RetireMember", target } }],
              },
            }],
          }],
        },
      },
      {
        ...validResult,
        value: {
          ...validResult.value,
          targets: [{
            ...targetOutcome,
            events: [{
              phase: "uncertain",
              target,
              action: actions[5],
              lastKnown: "bridge-returned",
              issues: [issue],
            }],
          }],
        },
      },
      {
        ...validResult,
        value: {
          ...validResult.value,
          targets: [{
            ...targetOutcome,
            events: [{
              phase: "uncertain",
              target,
              action: actions[1],
              lastKnown: "bridge-returned",
              issues: [],
            }],
          }],
        },
      },
      {
        ...validResult,
        value: {
          ...validResult.value,
          targets: [{
            ...targetOutcome,
            projectionBinding: { ...targetOutcome.projectionBinding, extraAuthority: true },
          }],
        },
      },
      {
        ...validResult,
        value: {
          ...validResult.value,
          targets: [{
            ...targetOutcome,
            status: "failed",
          }],
        },
      },
      {
        ...validResult,
        value: {
          ...validResult.value,
          targets: [{ ...targetOutcome, projectionBinding: null }],
        },
      },
      {
        ok: false,
        issues: [{ ...issue, code: "TOTALLY_REAL_PROVIDER_FAILURE" }],
      },
    ];

    for (const candidate of invalid) {
      expect(Value.Check(CompleteTestResultSchema, candidate)).toBe(false);
      const validated = await schema(CompleteTestResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }

    expect(Value.Check(TargetedTestResultSchema, validResult)).toBe(false);
  });
});

function replaceFixtureBytes(value: unknown, bytes: Uint8Array): unknown {
  if (value instanceof Uint8Array) return bytes;
  if (Array.isArray(value)) return value.map((entry) => replaceFixtureBytes(entry, bytes));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    replaceFixtureBytes(entry, bytes),
  ]));
}

function containsUint8Array(value: unknown): boolean {
  if (value instanceof Uint8Array) return true;
  if (Array.isArray(value)) return value.some(containsUint8Array);
  if (value === null || typeof value !== "object") return false;
  return Object.values(value).some(containsUint8Array);
}

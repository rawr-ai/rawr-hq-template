import { schema } from "@rawr/hq-sdk";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Static } from "typebox";
import { Value } from "typebox/value";

import {
  CanonicalStatusResultSchema,
  CompleteTestResultSchema,
  TargetedTestResultSchema,
} from "../../../src/service/modules/providers/schemas";
import {
  type CanonicalStatusOutcome,
  type ProviderProjectionBinding,
  ProviderProjectionBindingSchema,
} from "../../../src/service/modules/providers/model/dto/outcome";
import { parseProviderTargets } from "../../../src/service/modules/providers/model/dto/provider-target";
import {
  issue as providerIssue,
  success,
} from "../../../src/service/modules/providers/model/errors/deployment-result";
import { verifyTargetReceipt } from "../../../src/service/modules/providers/model/policy/receipt";
import { canonicalStatusResult } from "../../../src/service/modules/providers/router/procedure-result";

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
const validResult = Object.freeze({
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

describe("provider procedure result schema boundary", () => {
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

  it("admits every provider event and nested action/plan variant", () => {
    expect(events.map((event) => event.phase)).toEqual([
      "planned",
      "applied",
      "uncertain",
      "verified",
      "retired",
      "skipped",
      "blocked",
      "failed",
    ]);
    expect(Value.Check(CompleteTestResultSchema, validResult)).toBe(true);
    expect(Value.Check(TargetedTestResultSchema, {
      ...validResult,
      value: {
        ...validResult.value,
        targets: [{ ...validResult.value.targets[0], projectionBinding: null }],
      },
    })).toBe(true);
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
    const targetOutcome = validResult.value.targets[0];
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
                ...plan,
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

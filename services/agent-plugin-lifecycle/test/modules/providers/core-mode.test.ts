import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { contract } from "../../../src/service/modules/providers/contract";
import {
  normalizeCanonicalStatusRequest,
  normalizeCanonicalSyncRequest,
  normalizeCompleteTestRequest,
  normalizeTargetedTestRequest,
} from "../../../src/service/modules/providers/model/dto/mode";
import {
  CanonicalStatusInputSchema,
  CanonicalSyncInputSchema,
  CompleteTestInputSchema,
  TargetedTestInputSchema,
} from "../../../src/service/modules/providers/schemas";

const RELEASE = Object.freeze({
  kind: "release",
  releaseDigest: `rd1_${"a".repeat(64)}`,
  artifactDigest: `ad1_${"b".repeat(64)}`,
});
const SET = Object.freeze({ kind: "complete-set", releaseSetDigest: `rs1_${"c".repeat(64)}` });
const TARGET = Object.freeze({ provider: "codex", home: "/tmp/rawr-c3-codex" });
const LOCATOR = Object.freeze({
  repositoryIdentity: "git:github.com/example/personal-rawr-hq",
  workspaceRoot: "/tmp/personal-rawr-hq",
});
const STRUCTURALLY_INVALID_REQUESTS = [
  [
    "release+set",
    {
      kind: "targeted-test",
      releases: [RELEASE],
      releaseSet: SET,
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET],
    },
  ],
  [
    "release+channel",
    {
      kind: "targeted-test",
      releases: [RELEASE],
      channel: "current-main",
      locator: LOCATOR,
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET],
    },
  ],
  [
    "set+release",
    {
      kind: "complete-test",
      releaseSet: SET,
      releases: [RELEASE],
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET],
    },
  ],
  [
    "set+channel",
    {
      kind: "complete-test",
      releaseSet: SET,
      channel: "current-main",
      locator: LOCATOR,
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET],
    },
  ],
  [
    "canonical release override",
    {
      kind: "canonical-sync",
      channel: "current-main",
      locator: LOCATOR,
      releases: [RELEASE],
      targets: [TARGET],
    },
  ],
  [
    "canonical set override",
    {
      kind: "canonical-sync",
      channel: "current-main",
      locator: LOCATOR,
      releaseSet: SET,
      targets: [TARGET],
    },
  ],
  [
    "canonical acceptance override",
    {
      kind: "canonical-sync",
      channel: "current-main",
      locator: LOCATOR,
      acceptanceDigest: `ac1_${"d".repeat(64)}`,
      targets: [TARGET],
    },
  ],
  [
    "canonical evidence override",
    {
      kind: "canonical-sync",
      channel: "current-main",
      locator: LOCATOR,
      evidenceDigest: `ev1_${"e".repeat(64)}`,
      targets: [TARGET],
    },
  ],
  [
    "canonical projection override",
    {
      kind: "canonical-sync",
      channel: "current-main",
      locator: LOCATOR,
      projectionDigest: `pd1_${"f".repeat(64)}`,
      targets: [TARGET],
    },
  ],
  [
    "canonical promotion override",
    {
      kind: "canonical-sync",
      channel: "current-main",
      locator: LOCATOR,
      promotionDigest: `pm1_${"0".repeat(64)}`,
      targets: [TARGET],
    },
  ],
  [
    "unknown channel",
    { kind: "canonical-sync", channel: "next", locator: LOCATOR, targets: [TARGET] },
  ],
  [
    "path-shaped channel",
    { kind: "canonical-sync", channel: "/tmp/current-main", locator: LOCATOR, targets: [TARGET] },
  ],
  [
    "unsupported home",
    {
      kind: "targeted-test",
      releases: [RELEASE],
      evaluationProfile: "provider-smoke@v1",
      targets: [{ provider: "cowork", home: "/tmp/cowork" }],
    },
  ],
  [
    "status set override",
    {
      kind: "canonical-status",
      channel: "current-main",
      locator: LOCATOR,
      targets: [TARGET],
      releaseSet: SET,
    },
  ],
  ["retired managed-retire mode", { kind: "managed-retire", pluginId: "alpha", targets: [TARGET] }],
] as const;

describe("closed lifecycle request contracts", () => {
  it("exposes the closed provider procedure set", () => {
    expect(Object.keys(contract).sort()).toEqual([
      "canonicalStatus",
      "canonicalSync",
      "completeTest",
      "targetedTest",
    ]);
  });

  it.each([
    [
      TargetedTestInputSchema,
      {
        kind: "targeted-test",
        releases: [RELEASE],
        evaluationProfile: "provider-smoke@v1",
        targets: [TARGET],
      },
    ],
    [
      CompleteTestInputSchema,
      {
        kind: "complete-test",
        releaseSet: SET,
        evaluationProfile: "provider-smoke@v1",
        targets: [TARGET],
      },
    ],
    [
      CanonicalSyncInputSchema,
      { kind: "canonical-sync", channel: "current-main", locator: LOCATOR, targets: [TARGET] },
    ],
  ] as const)("accepts each legal deployment request at its TypeBox boundary", (schema, input) => {
    expect(Value.Check(schema, input)).toBe(true);
  });

  it("accepts status only through its separate TypeBox boundary", () => {
    expect(
      Value.Check(CanonicalStatusInputSchema, {
        kind: "canonical-status",
        channel: "current-main",
        locator: LOCATOR,
        targets: [TARGET],
      })
    ).toBe(true);
  });

  it("normalizes complete-test targets once with stable ordering and request identity", () => {
    const claude = { provider: "claude" as const, home: "/tmp/rawr-c3-claude" };
    const left = normalizeCompleteTestRequest({
      kind: "complete-test",
      releaseSet: SET,
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET, claude],
    });
    const right = normalizeCompleteTestRequest({
      kind: "complete-test",
      releaseSet: SET,
      evaluationProfile: "provider-smoke@v1",
      targets: [claude, TARGET],
    });
    expect(left.ok).toBe(true);
    expect(right.ok).toBe(true);
    if (!left.ok || !right.ok) return;
    expect(right.value).toEqual(left.value);
    expect(right.value.requestDigest).toBe(left.value.requestDigest);
  });

  it("retains duplicate-target refusal as domain policy", () => {
    const parsed = normalizeCompleteTestRequest({
      kind: "complete-test",
      releaseSet: SET,
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET, TARGET],
    });
    expect(parsed).toMatchObject({
      ok: false,
      issues: [{ code: "DUPLICATE_TARGET" }],
    });
  });

  it("retains invalid-home refusal as domain policy", () => {
    const parsed = normalizeCompleteTestRequest({
      kind: "complete-test",
      releaseSet: SET,
      evaluationProfile: "provider-smoke@v1",
      targets: [{ provider: "codex", home: "relative/provider-home" }],
    });
    expect(parsed).toMatchObject({
      ok: false,
      issues: [{ code: "INVALID_HOME" }],
    });
  });

  it("normalizes targeted releases once with stable ordering and request identity", () => {
    const secondRelease = {
      kind: "release" as const,
      releaseDigest: `rd1_${"d".repeat(64)}`,
      artifactDigest: `ad1_${"e".repeat(64)}`,
    };
    const left = normalizeTargetedTestRequest({
      kind: "targeted-test",
      releases: [RELEASE, secondRelease],
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET],
    });
    const right = normalizeTargetedTestRequest({
      kind: "targeted-test",
      releases: [secondRelease, RELEASE],
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET],
    });
    expect(left.ok).toBe(true);
    expect(right.ok).toBe(true);
    if (!left.ok || !right.ok) return;
    expect(right.value).toEqual(left.value);
    expect(right.value.requestDigest).toBe(left.value.requestDigest);
  });

  it("retains duplicate-release refusal as domain policy", () => {
    const parsed = normalizeTargetedTestRequest({
      kind: "targeted-test",
      releases: [RELEASE, RELEASE],
      evaluationProfile: "provider-smoke@v1",
      targets: [TARGET],
    });
    expect(parsed).toMatchObject({
      ok: false,
      issues: [{ code: "DUPLICATE_MEMBER" }],
    });
  });

  it("normalizes canonical status from the schema-derived locator and targets", () => {
    const parsed = normalizeCanonicalStatusRequest({
      kind: "canonical-status",
      channel: "current-main",
      locator: LOCATOR,
      targets: [TARGET],
    });
    expect(parsed).toMatchObject({
      ok: true,
      value: {
        kind: "canonical-status",
        channel: "current-main",
        locator: LOCATOR,
        requestDigest: expect.stringMatching(/^prq1_[0-9a-f]{64}$/u),
      },
    });
  });

  it.each([
    ["relative workspace root", { ...LOCATOR, workspaceRoot: "relative/worktree" }],
    ["path repository identity", { ...LOCATOR, repositoryIdentity: "/tmp/personal-rawr-hq" }],
  ])("retains %s refusal as typed locator policy", (_label, locator) => {
    const parsed = normalizeCanonicalStatusRequest({
      kind: "canonical-status",
      channel: "current-main",
      locator,
      targets: [TARGET],
    });
    expect(parsed).toMatchObject({
      ok: false,
      issues: [{ code: "INVALID_LOCATOR" }],
    });
  });

  it("normalizes canonical sync from the schema-derived locator and targets", () => {
    const parsed = normalizeCanonicalSyncRequest({
      kind: "canonical-sync",
      channel: "current-main",
      locator: LOCATOR,
      targets: [TARGET],
    });
    expect(parsed).toMatchObject({
      ok: true,
      value: {
        kind: "canonical-sync",
        channel: "current-main",
        locator: LOCATOR,
        requestDigest: expect.stringMatching(/^prq1_[0-9a-f]{64}$/u),
      },
    });
  });

  it.each(
    STRUCTURALLY_INVALID_REQUESTS
  )("rejects %s at the owning TypeBox boundary", (_label, input) => {
    const valid =
      input.kind === "targeted-test"
        ? Value.Check(TargetedTestInputSchema, input)
        : input.kind === "complete-test"
          ? Value.Check(CompleteTestInputSchema, input)
          : input.kind === "canonical-sync"
            ? Value.Check(CanonicalSyncInputSchema, input)
            : input.kind === "canonical-status"
              ? Value.Check(CanonicalStatusInputSchema, input)
              : false;
    expect(valid).toBe(false);
  });
});

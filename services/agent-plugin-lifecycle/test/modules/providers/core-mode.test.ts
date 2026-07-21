import { describe, expect, it } from "vitest";

import {
  normalizeCompleteTestRequest,
  normalizeTargetedTestRequest,
  parseCanonicalStatusRequest,
  parseProviderDeploymentRequest,
} from "../../../src/service/modules/providers/model/dto/mode";
import { contract } from "../../../src/service/modules/providers/contract";

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
const DEPLOYMENT_APPS = ["deployment"] as const;
const INVALID_SELECTOR_CASES = [
  ["release+set", { kind: "targeted-test", releases: [RELEASE], releaseSet: SET, evaluationProfile: "provider-smoke@v1", targets: [TARGET] }, DEPLOYMENT_APPS],
  ["release+channel", { kind: "targeted-test", releases: [RELEASE], channel: "current-main", locator: LOCATOR, evaluationProfile: "provider-smoke@v1", targets: [TARGET] }, DEPLOYMENT_APPS],
  ["set+release", { kind: "complete-test", releaseSet: SET, releases: [RELEASE], evaluationProfile: "provider-smoke@v1", targets: [TARGET] }, DEPLOYMENT_APPS],
  ["set+channel", { kind: "complete-test", releaseSet: SET, channel: "current-main", locator: LOCATOR, evaluationProfile: "provider-smoke@v1", targets: [TARGET] }, DEPLOYMENT_APPS],
  ["canonical release override", { kind: "canonical-sync", channel: "current-main", locator: LOCATOR, releases: [RELEASE], targets: [TARGET] }, DEPLOYMENT_APPS],
  ["canonical set override", { kind: "canonical-sync", channel: "current-main", locator: LOCATOR, releaseSet: SET, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["canonical acceptance override", { kind: "canonical-sync", channel: "current-main", locator: LOCATOR, acceptanceDigest: `ac1_${"d".repeat(64)}`, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["canonical evidence override", { kind: "canonical-sync", channel: "current-main", locator: LOCATOR, evidenceDigest: `ev1_${"e".repeat(64)}`, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["canonical projection override", { kind: "canonical-sync", channel: "current-main", locator: LOCATOR, projectionDigest: `pd1_${"f".repeat(64)}`, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["canonical promotion override", { kind: "canonical-sync", channel: "current-main", locator: LOCATOR, promotionDigest: `pm1_${"0".repeat(64)}`, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["unknown channel", { kind: "canonical-sync", channel: "next", locator: LOCATOR, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["path-shaped channel", { kind: "canonical-sync", channel: "/tmp/current-main", locator: LOCATOR, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["relative locator", { kind: "canonical-sync", channel: "current-main", locator: { ...LOCATOR, workspaceRoot: "relative/worktree" }, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["path repository identity", { kind: "canonical-sync", channel: "current-main", locator: { ...LOCATOR, repositoryIdentity: "/tmp/personal-rawr-hq" }, targets: [TARGET] }, DEPLOYMENT_APPS],
  ["duplicate home", { kind: "targeted-test", releases: [RELEASE], evaluationProfile: "provider-smoke@v1", targets: [TARGET, TARGET] }, DEPLOYMENT_APPS],
  ["unsupported home", { kind: "targeted-test", releases: [RELEASE], evaluationProfile: "provider-smoke@v1", targets: [{ provider: "cowork", home: "/tmp/cowork" }] }, DEPLOYMENT_APPS],
  ["relative home", { kind: "targeted-test", releases: [RELEASE], evaluationProfile: "provider-smoke@v1", targets: [{ provider: "codex", home: "relative/home" }] }, DEPLOYMENT_APPS],
  ["status set override", { kind: "canonical-status", channel: "current-main", locator: LOCATOR, targets: [TARGET], releaseSet: SET }, ["status"]],
  ["retired managed-retire mode", { kind: "managed-retire", pluginId: "alpha", targets: [TARGET] }, ["deployment", "status"]],
] as const;

describe("closed lifecycle mode parsers", () => {
  it("exposes the closed provider procedure set", () => {
    expect(Object.keys(contract).sort()).toEqual([
      "canonicalStatus",
      "canonicalSync",
      "completeTest",
      "targetedTest",
    ]);
  });

  it.each([
    [{ kind: "targeted-test", releases: [RELEASE], evaluationProfile: "provider-smoke@v1", targets: [TARGET] }, "targeted-test"],
    [{ kind: "complete-test", releaseSet: SET, evaluationProfile: "provider-smoke@v1", targets: [TARGET] }, "complete-test"],
    [{ kind: "canonical-sync", channel: "current-main", locator: LOCATOR, targets: [TARGET] }, "canonical-sync"],
  ] as const)("accepts exactly one legal deployment mode", (input, expectedKind) => {
    const parsed = parseProviderDeploymentRequest(input);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.kind).toBe(expectedKind);
  });

  it("accepts status only through its separate exact parser", () => {
    const status = parseCanonicalStatusRequest({
      kind: "canonical-status",
      channel: "current-main",
      locator: LOCATOR,
      targets: [TARGET],
    });
    expect(status.ok).toBe(true);
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

  it.each(INVALID_SELECTOR_CASES)("rejects %s at the exact mode boundary", (_label, input, parsers) => {
    for (const parser of parsers) {
      const result = parser === "status"
        ? parseCanonicalStatusRequest(input)
        : parseProviderDeploymentRequest(input);
      expect(result.ok).toBe(false);
    }
  });
});

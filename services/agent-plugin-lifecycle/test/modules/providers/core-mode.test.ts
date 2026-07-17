import { describe, expect, it } from "vitest";

import {
  createCanonicalStatus,
  createCanonicalSync,
  createCompleteTest,
  createManagedRetire,
  createTargetedTest,
  parseCanonicalStatusRequest,
  parseManagedRetireRequest,
  parseProviderDeploymentRequest,
} from "../../../src/service/modules/providers/internal";

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
const DEPLOYMENT_APPS = ["targeted", "complete", "canonical"] as const;
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
  ["retire receipt override", { kind: "managed-retire", pluginId: "alpha", targets: [TARGET], receipt: {} }, ["retire"]],
  ["retire path override", { kind: "managed-retire", pluginId: "alpha", targets: [TARGET], workspaceRoot: "/tmp/personal-rawr-hq" }, ["retire"]],
] as const;

describe("closed lifecycle mode parsers", () => {
  it.each([
    [{ kind: "targeted-test", releases: [RELEASE], evaluationProfile: "provider-smoke@v1", targets: [TARGET] }, "targeted-test"],
    [{ kind: "complete-test", releaseSet: SET, evaluationProfile: "provider-smoke@v1", targets: [TARGET] }, "complete-test"],
    [{ kind: "canonical-sync", channel: "current-main", locator: LOCATOR, targets: [TARGET] }, "canonical-sync"],
  ] as const)("accepts exactly one legal deployment mode", (input, expectedKind) => {
    const parsed = parseProviderDeploymentRequest(input);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.kind).toBe(expectedKind);
  });

  it("accepts status and multi-target retirement only through their separate exact parsers", () => {
    const status = parseCanonicalStatusRequest({
      kind: "canonical-status",
      channel: "current-main",
      locator: LOCATOR,
      targets: [TARGET],
    });
    const retire = parseManagedRetireRequest({
      kind: "managed-retire",
      pluginId: "alpha",
      targets: [TARGET, { provider: "claude", home: "/tmp/rawr-c3-claude" }],
    });
    expect(status.ok).toBe(true);
    expect(retire.ok).toBe(true);
    if (retire.ok) expect(retire.value.targets).toHaveLength(2);
  });

  it.each(INVALID_SELECTOR_CASES)("rejects %s before dependency construction or port calls", async (_label, input, applications) => {
    let dependencyConstructions = 0;
    const dependencyTrap = () => {
      dependencyConstructions += 1;
      throw new Error("dependencies must not be constructed");
    };
    for (const application of applications) {
      const result = application === "targeted"
        ? await createTargetedTest(dependencyTrap)(input)
        : application === "complete"
          ? await createCompleteTest(dependencyTrap)(input)
          : application === "canonical"
            ? await createCanonicalSync(dependencyTrap)(input)
            : application === "status"
              ? await createCanonicalStatus(dependencyTrap)(input)
              : await createManagedRetire(dependencyTrap)(input);
      expect(result.ok).toBe(false);
    }
    expect(dependencyConstructions).toBe(0);
  });
});

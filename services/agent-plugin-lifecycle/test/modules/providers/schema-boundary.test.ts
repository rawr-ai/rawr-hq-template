import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { runProviderStatus } from "../../../src/service/modules/providers/router/status.router";
import {
  ProviderMutationTargetResultSchema,
  ProviderStatusRequestSchema,
  ProviderStatusResultSchema,
  ProviderSyncRequestSchema,
  ProviderTargetsSchema,
  ProviderTestRequestSchema,
  SelectedContentObservationSchema,
} from "../../../src/service/modules/providers/schemas";
import {
  channelRequest,
  createCurrentMainReader,
  FakeNativeSession,
  FakeNativeSessions,
  FakeSelectedContentResolver,
  selectedContent,
  testRequest,
} from "./fixture";

describe("provider public schema boundary", () => {
  it("admits only closed requests with canonical distinct provider targets", () => {
    expect(Value.Check(ProviderStatusRequestSchema, channelRequest)).toBe(true);
    expect(Value.Check(ProviderSyncRequestSchema, channelRequest)).toBe(true);
    expect(Value.Check(ProviderTestRequestSchema, testRequest)).toBe(true);
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        targets: [{ provider: "codex", home: testRequest.disposableRoot }],
      })
    ).toBe(false);
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        targets: [{ provider: "codex", home: "/tmp/rawr-provider-test-sibling/codex-home" }],
      })
    ).toBe(false);
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        disposableRoot: "/",
      })
    ).toBe(false);
    expect(
      Value.Check(ProviderStatusRequestSchema, { ...channelRequest, artifact: "ar1_dead" })
    ).toBe(false);
    expect(
      Value.Check(ProviderTargetsSchema, [
        { provider: "codex", home: "/tmp/home" },
        { provider: "codex", home: "/tmp/home" },
      ])
    ).toBe(false);
    expect(Value.Check(ProviderTargetsSchema, [{ provider: "codex", home: "/" }])).toBe(false);
  });

  it("validates a complete finite public status result from the handler", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    const result = await runProviderStatus(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });
    expect(Value.Check(ProviderStatusResultSchema, result)).toBe(true);
    expect(Value.Check(ProviderStatusResultSchema, { ...result, plan: [] })).toBe(false);
    expect(
      Value.Check(ProviderStatusResultSchema, {
        ...result,
        targets: result.targets.map((target) => ({ ...target, classification: "Changed" })),
      })
    ).toBe(false);
    expect(
      Value.Check(ProviderStatusResultSchema, {
        ...result,
        targets: result.targets.map((target) => ({
          ...target,
          operations: [{ kind: "plugin-installed", selector: "cognition@rawr-hq" }],
        })),
      })
    ).toBe(false);
    expect(result).not.toHaveProperty("receipt");
    expect(result).not.toHaveProperty("projection");
    expect(result).not.toHaveProperty("evidence");
  });

  it("admits only mutation classifications with possible operation histories", () => {
    const operation = { kind: "plugin-installed", selector: "cognition@rawr-hq" } as const;
    const base = {
      target: channelRequest.targets[0],
      facts: [],
      issues: [],
    };
    expect(
      Value.Check(ProviderMutationTargetResultSchema, {
        ...base,
        classification: "Converged",
        operations: [],
      })
    ).toBe(true);
    expect(
      Value.Check(ProviderMutationTargetResultSchema, {
        ...base,
        classification: "Changed",
        operations: [operation],
      })
    ).toBe(true);
    for (const candidate of [
      { ...base, classification: "Drifted", operations: [] },
      { ...base, classification: "Changed", operations: [] },
      { ...base, classification: "Converged", operations: [operation] },
      { ...base, classification: "Blocked", operations: [operation] },
      { ...base, classification: "NotAttempted", operations: [operation] },
    ]) {
      expect(Value.Check(ProviderMutationTargetResultSchema, candidate)).toBe(false);
    }
  });

  it("admits the release-owned member bound beyond the retired 256-member limit", () => {
    const pluginIds = Array.from(
      { length: 257 },
      (_, index) => `plugin-${index.toString().padStart(3, "0")}`
    );
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        mode: { kind: "targeted", pluginIds },
      })
    ).toBe(true);

    const content = selectedContent();
    expect(
      Value.Check(SelectedContentObservationSchema, {
        repositoryIdentity: content.repositoryIdentity,
        sourceCommit: content.sourceCommit,
        sourceTree: content.sourceTree,
        releaseInputDigest: content.releaseInputDigest,
        releaseSetDigest: content.releaseSetDigest,
        pluginIds,
      })
    ).toBe(true);
  });
});

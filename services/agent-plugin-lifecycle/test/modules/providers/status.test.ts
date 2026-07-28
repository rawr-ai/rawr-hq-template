import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { testInvocation } from "../../support/client";
import {
  channelRequest,
  createProviderLifecycleClient,
  FakeNativeProviders,
  fakeNativeSession,
  selectedContent,
  wrongRepositoryChannelRequest,
} from "./fixture";

describe("provider status and preflight", () => {
  it("reports drift without invoking a native mutation", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const nativeProviders = new FakeNativeProviders([session]);
    const { client } = createProviderLifecycleClient(content, nativeProviders);
    const result = await client.providers.status(channelRequest, testInvocation);
    expect(result.classification).toBe("Drifted");
    expect(result.targets[0]?.classification).toBe("Drifted");
    expect(result.targets[0]?.operations).toEqual([]);
    expect(nativeProviders.acquisitionCalls).toEqual(["codex:/tmp/codex-home"]);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("refuses a wrong current-main repository before resolving selected content or observing native state", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const nativeProviders = new FakeNativeProviders([session]);
    const { client, resourceCalls } = createProviderLifecycleClient(content, nativeProviders);

    const result = await client.providers.status(wrongRepositoryChannelRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(resourceCalls).toEqual(["inspect:refs/heads/main"]);
    expect(nativeProviders.acquisitionCalls).toEqual([]);
    expect(session.calls).toEqual([]);
  });

  it("requests one bounded native file batch per selected member", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Converged");
    expect(session.calls.filter((call) => call.startsWith("read-batch:"))).toHaveLength(1);
    expect(session.fileReadRequests[0]?.files).toEqual(
      content.members[0]?.manifest.map((file) => ({
        relativePath: file.path,
        maxBytes: file.byteLength,
      }))
    );
  });

  it("blocks every target before mutation when any target has an ownership collision", async () => {
    const content = selectedContent();
    const targets = [
      channelRequest.targets[0],
      { provider: "claude" as const, home: "/tmp/claude-home" },
    ] as const;
    const first = fakeNativeSession({ target: targets[0], content, marketplace: "absent" });
    const second = fakeNativeSession({
      target: targets[1],
      content,
      marketplace: "unrelated",
    });
    const { client, resourceCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([first, second])
    );
    const result = await client.providers.sync({ ...channelRequest, targets }, testInvocation);
    expect(result.classification).toBe("Blocked");
    expect(result.targets.map((target) => target.classification)).toEqual(["Blocked", "Blocked"]);
    expect(result.issues.some((issue) => issue.code === "MarketplaceCollision")).toBe(true);
    expect(resourceCalls.filter((call) => call === "read-tree")).toHaveLength(1);
    expect(first.mutationCalls()).toEqual([]);
    expect(second.mutationCalls()).toEqual([]);
  });

  it("canonicalizes target order independently of caller order", async () => {
    const content = selectedContent();
    const targets = [
      channelRequest.targets[0],
      { provider: "claude" as const, home: "/tmp/claude-home" },
    ] as const;
    const forwardSessions = targets.map((target) =>
      fakeNativeSession({ target, content, installed: ["cognition"] })
    );
    const reverseSessions = targets.map((target) =>
      fakeNativeSession({ target, content, installed: ["cognition"] })
    );
    const forwardClient = createProviderLifecycleClient(
      content,
      new FakeNativeProviders(forwardSessions)
    ).client;
    const reverseClient = createProviderLifecycleClient(
      content,
      new FakeNativeProviders(reverseSessions)
    ).client;
    const forward = await forwardClient.providers.status(
      { ...channelRequest, targets },
      testInvocation
    );
    const reverse = await reverseClient.providers.status(
      { ...channelRequest, targets: [targets[1], targets[0]] },
      testInvocation
    );

    expect(reverse).toEqual(forward);
    expect(forward.targets.map((target) => target.target.provider)).toEqual(["claude", "codex"]);
  });

  it("classifies operational preflight failure as failed without mutating another target", async () => {
    const content = selectedContent();
    const targets = [
      channelRequest.targets[0],
      { provider: "claude" as const, home: "/tmp/claude-home" },
    ] as const;
    const codex = fakeNativeSession({ target: targets[0], content });
    const claude = fakeNativeSession({ target: targets[1], content });
    codex.inventoryFailureCount = 1;
    const { client, resourceCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([codex, claude])
    );
    const result = await client.providers.sync({ ...channelRequest, targets }, testInvocation);

    expect(result.classification).toBe("Failed");
    expect(result.targets.map((target) => target.classification)).toEqual([
      "NotAttempted",
      "Failed",
    ]);
    expect(result.issues.some((issue) => issue.code === "TargetUnavailable")).toBe(true);
    expect(resourceCalls.filter((call) => call === "read-tree")).toHaveLength(1);
    expect(codex.mutationCalls()).toEqual([]);
    expect(claude.mutationCalls()).toEqual([]);
  });

  it("classifies a typed capability probe failure without mutating", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    session.probeFailure = true;
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Failed");
    expect(result.targets[0]).toMatchObject({
      classification: "Failed",
      issues: [expect.objectContaining({ code: "TargetUnavailable" })],
    });
    expect(session.mutationCalls()).toEqual([]);
  });

  it.each([
    { kind: "capabilities" as const, issue: "TargetUnavailable" },
    { kind: "inventory" as const, issue: "TargetUnavailable" },
    { kind: "files" as const, issue: "NativeObservationFailed" },
  ])("rejects malformed native $kind facts through TypeBox", async ({ kind, issue }) => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    switch (kind) {
      case "capabilities":
        session.malformedCapabilities = true;
        break;
      case "inventory":
        session.malformedInventory = true;
        break;
      case "files":
        session.malformedFileBatch = true;
        break;
    }
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Failed");
    expect(result.targets[0]).toMatchObject({
      classification: "Failed",
      issues: expect.arrayContaining([expect.objectContaining({ code: issue })]),
    });
    expect(session.mutationCalls()).toEqual([]);
  });

  it("refuses a known disabled Codex member before another target mutates", async () => {
    const content = selectedContent();
    const targets = [
      channelRequest.targets[0],
      { provider: "claude" as const, home: "/tmp/claude-home" },
    ] as const;
    const codex = fakeNativeSession({
      target: targets[0],
      content,
      installed: ["cognition"],
    });
    const claude = fakeNativeSession({ target: targets[1], content });
    codex.setPluginEnabled("cognition", false);
    const { client } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([codex, claude])
    );
    const result = await client.providers.sync({ ...channelRequest, targets }, testInvocation);

    expect(result.classification).toBe("Failed");
    expect(result.targets.map((target) => target.classification)).toEqual([
      "NotAttempted",
      "Failed",
    ]);
    expect(result.issues.some((issue) => issue.code === "CapabilityMissing")).toBe(true);
    expect(codex.mutationCalls()).toEqual([]);
    expect(claude.mutationCalls()).toEqual([]);
  });

  it("propagates Provider interruption through native inspection and runs its finalizer", async () => {
    const content = selectedContent();
    const started = Promise.withResolvers<void>();
    let finalized = false;
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      probeOverride: () =>
        Effect.sync(() => started.resolve()).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(
            Effect.sync(() => {
              finalized = true;
            })
          )
        ),
    });
    const controller = new AbortController();
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const operation = client.providers.sync(channelRequest, {
      ...testInvocation,
      signal: controller.signal,
    });

    await started.promise;
    controller.abort();
    await expect(operation).rejects.toBeDefined();
    expect(finalized).toBe(true);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("propagates a native provider defect instead of classifying it as target unavailability", async () => {
    const content = selectedContent();
    const defect = new Error("native provider defect");
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      probeOverride: () => Effect.die(defect),
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    await expect(client.providers.status(channelRequest, testInvocation)).rejects.toBe(defect);
    expect(session.mutationCalls()).toEqual([]);
  });
});

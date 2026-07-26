import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";

import { runProviderStatus as providerStatusEffect } from "../../../src/service/modules/providers/router/status.router";
import { runProviderSync as providerSyncEffect } from "../../../src/service/modules/providers/router/sync.router";
import {
  channelRequest,
  createCurrentMainReader,
  FakeNativeProviders,
  FakeSelectedContentResolver,
  fakeNativeSession,
  selectedContent,
} from "./fixture";

const runProviderStatus = (...args: Parameters<typeof providerStatusEffect>) =>
  Effect.runPromise(providerStatusEffect(...args));
const runProviderSync = (...args: Parameters<typeof providerSyncEffect>) =>
  Effect.runPromise(providerSyncEffect(...args));

describe("provider status and preflight", () => {
  it("reports drift without invoking a native mutation", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const result = await runProviderStatus(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeProviders: new FakeNativeProviders([session]),
    });
    expect(result.classification).toBe("Drifted");
    expect(result.targets[0]?.classification).toBe("Drifted");
    expect(result.targets[0]?.operations).toEqual([]);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("requests one bounded native file batch per selected member", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    const result = await runProviderStatus(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeProviders: new FakeNativeProviders([session]),
    });

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
    const result = await runProviderSync(
      { ...channelRequest, targets },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeProviders: new FakeNativeProviders([first, second]),
      }
    );
    expect(result.classification).toBe("Blocked");
    expect(result.targets.map((target) => target.classification)).toEqual(["Blocked", "Blocked"]);
    expect(result.issues.some((issue) => issue.code === "MarketplaceCollision")).toBe(true);
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
    const forward = await runProviderStatus(
      { ...channelRequest, targets },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeProviders: new FakeNativeProviders(forwardSessions),
      }
    );
    const reverse = await runProviderStatus(
      { ...channelRequest, targets: [targets[1], targets[0]] },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeProviders: new FakeNativeProviders(reverseSessions),
      }
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
    const result = await runProviderSync(
      { ...channelRequest, targets },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeProviders: new FakeNativeProviders([codex, claude]),
      }
    );

    expect(result.classification).toBe("Failed");
    expect(result.targets.map((target) => target.classification)).toEqual([
      "NotAttempted",
      "Failed",
    ]);
    expect(result.issues.some((issue) => issue.code === "TargetUnavailable")).toBe(true);
    expect(codex.mutationCalls()).toEqual([]);
    expect(claude.mutationCalls()).toEqual([]);
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

    const result = await runProviderSync(
      { ...channelRequest, targets },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeProviders: new FakeNativeProviders([codex, claude]),
      }
    );

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
    const operation = Effect.runPromiseExit(
      providerSyncEffect(channelRequest, {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeProviders: new FakeNativeProviders([session]),
      }),
      { signal: controller.signal }
    );

    await started.promise;
    controller.abort();
    const exit = await operation;

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) throw new Error("Expected Provider operation interruption");
    expect(exit.cause.reasons.some(Cause.isInterruptReason)).toBe(true);
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

    const exit = await Effect.runPromiseExit(
      providerStatusEffect(channelRequest, {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeProviders: new FakeNativeProviders([session]),
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) throw new Error("Expected Provider operation defect");
    expect(exit.cause.reasons.find(Cause.isDieReason)?.defect).toBe(defect);
    expect(session.mutationCalls()).toEqual([]);
  });
});

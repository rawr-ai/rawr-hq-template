import { describe, expect, it } from "vitest";

import { runProviderStatus } from "../../../src/service/modules/providers/router/status.router";
import { runProviderSync } from "../../../src/service/modules/providers/router/sync.router";
import {
  channelRequest,
  createCurrentMainReader,
  FakeNativeSession,
  FakeNativeSessions,
  FakeSelectedContentResolver,
  selectedContent,
} from "./fixture";

describe("provider status and preflight", () => {
  it("reports drift without invoking a native mutation", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const result = await runProviderStatus(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });
    expect(result.classification).toBe("Drifted");
    expect(result.targets[0]?.classification).toBe("Drifted");
    expect(result.targets[0]?.operations).toEqual([]);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("requests one bounded native file batch per selected member", async () => {
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
    const first = new FakeNativeSession({ target: targets[0], content, marketplace: "absent" });
    const second = new FakeNativeSession({
      target: targets[1],
      content,
      marketplace: "unrelated",
    });
    const result = await runProviderSync(
      { ...channelRequest, targets },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeSessions: new FakeNativeSessions([first, second]),
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
    const forwardSessions = targets.map(
      (target) => new FakeNativeSession({ target, content, installed: ["cognition"] })
    );
    const reverseSessions = targets.map(
      (target) => new FakeNativeSession({ target, content, installed: ["cognition"] })
    );
    const forward = await runProviderStatus(
      { ...channelRequest, targets },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeSessions: new FakeNativeSessions(forwardSessions),
      }
    );
    const reverse = await runProviderStatus(
      { ...channelRequest, targets: [targets[1], targets[0]] },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeSessions: new FakeNativeSessions(reverseSessions),
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
    const codex = new FakeNativeSession({ target: targets[0], content });
    const claude = new FakeNativeSession({ target: targets[1], content });
    codex.inventoryFailureCount = 1;
    const result = await runProviderSync(
      { ...channelRequest, targets },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeSessions: new FakeNativeSessions([codex, claude]),
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
    const codex = new FakeNativeSession({
      target: targets[0],
      content,
      installed: ["cognition"],
    });
    const claude = new FakeNativeSession({ target: targets[1], content });
    codex.setPluginEnabled("cognition", false);

    const result = await runProviderSync(
      { ...channelRequest, targets },
      {
        currentMain: createCurrentMainReader(),
        selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
        nativeSessions: new FakeNativeSessions([codex, claude]),
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
});

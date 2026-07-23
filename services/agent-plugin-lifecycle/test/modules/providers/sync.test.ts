import { describe, expect, it } from "vitest";
import { runProviderSync } from "../../../src/service/modules/providers/router/sync.router";
import { parseGitTreeId } from "../../../src/service/shared/release";
import {
  channelRequest,
  createCurrentMainReader,
  FakeNativeSession,
  FakeNativeSessions,
  FakeSelectedContentResolver,
  selectedContent,
  selectedContentWithAliases,
} from "./fixture";

describe("provider sync", () => {
  it("refreshes an exact Codex marketplace with an unobservable revision before installing a missing selected member", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "exact",
    });
    const dependencies = {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    };

    const result = await runProviderSync(channelRequest, dependencies);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations.map((operation) => operation.kind)).toEqual([
      "marketplace-removed",
      "marketplace-added",
      "plugin-installed",
    ]);
    expect(session.hasPlugin("cognition")).toBe(true);

    const mutationCount = session.mutationCalls().length;
    const repeat = await runProviderSync(channelRequest, dependencies);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("detects and repairs drift in a selected reference file, then repeats without mutation", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "exact",
      installed: ["cognition"],
    });
    session.setPluginFile(
      "cognition",
      "skills/cognition/references/guide.md",
      new TextEncoder().encode("stale reference\n")
    );
    const dependencies = {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    };

    const result = await runProviderSync(channelRequest, dependencies);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations.map((operation) => operation.kind)).toEqual([
      "marketplace-removed",
      "marketplace-added",
      "plugin-removed",
      "plugin-installed",
    ]);
    expect(
      result.targets[0]?.facts.some(
        (fact) =>
          fact.kind === "plugin-file" &&
          fact.subject === "cognition@rawr-hq/skills/cognition/references/guide.md"
      )
    ).toBe(true);

    const mutationCount = session.mutationCalls().length;
    const repeat = await runProviderSync(channelRequest, dependencies);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("treats an oversized selected file as repairable drift", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "exact",
      installed: ["cognition"],
    });
    session.setPluginFile(
      "cognition",
      "skills/cognition/references/guide.md",
      new TextEncoder().encode("x".repeat(1_024))
    );
    const dependencies = {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    };

    const result = await runProviderSync(channelRequest, dependencies);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations.map((operation) => operation.kind)).toEqual([
      "marketplace-removed",
      "marketplace-added",
      "plugin-removed",
      "plugin-installed",
    ]);
    const mutationCount = session.mutationCalls().length;
    const repeat = await runProviderSync(channelRequest, dependencies);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("enables a Claude plugin with unknown enablement and repeats without mutation", async () => {
    const content = selectedContent();
    const target = { provider: "claude" as const, home: "/tmp/claude-home" };
    const session = new FakeNativeSession({ target, content, installed: ["cognition"] });
    session.setPluginEnabled("cognition", null);
    const request = { ...channelRequest, targets: [target] as const };
    const dependencies = {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    };

    const result = await runProviderSync(request, dependencies);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations).toEqual([
      { kind: "plugin-enabled", selector: "cognition@rawr-hq" },
    ]);
    const mutationCount = session.mutationCalls().length;
    const repeat = await runProviderSync(request, dependencies);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("retires an alias-shaped managed residue omitted from the canonical member set", async () => {
    const content = selectedContentWithAliases(["cognition"], { cognition: ["cog"] });
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
      omitted: ["cog"],
    });

    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations).toContainEqual({
      kind: "plugin-removed",
      selector: "cog@rawr-hq",
    });
    expect(session.hasPluginObservation("cog")).toBe(false);
  });

  it("removes omitted native selector residue even when it is no longer installed", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
      omitted: ["docs"],
    });
    session.setPluginInstalled("docs", false);
    const dependencies = {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    };

    const result = await runProviderSync(channelRequest, dependencies);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations).toContainEqual({
      kind: "plugin-removed",
      selector: "docs@rawr-hq",
    });
    expect(session.hasPluginObservation("docs")).toBe(false);
    const mutationCount = session.mutationCalls().length;
    const repeat = await runProviderSync(channelRequest, dependencies);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("establishes the marketplace and refreshes selected members before retiring omitted residue", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "stale",
      installed: ["cognition"],
      staleFiles: ["cognition"],
      omitted: ["docs"],
    });
    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });
    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations.map((operation) => operation.kind)).toEqual([
      "marketplace-removed",
      "marketplace-added",
      "plugin-removed",
      "plugin-installed",
      "plugin-removed",
    ]);
    const calls = session.mutationCalls();
    expect(calls.indexOf("mutate:marketplace-add")).toBeLessThan(
      calls.indexOf("mutate:plugin-remove:cognition@rawr-hq")
    );
    expect(calls.indexOf("mutate:plugin-install:cognition@rawr-hq")).toBeLessThan(
      calls.indexOf("mutate:plugin-remove:docs@rawr-hq")
    );
    expect(session.hasPlugin("docs")).toBe(false);
  });

  it("preserves omitted residue when selected-file verification fails", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
      staleFiles: ["cognition"],
      omitted: ["docs"],
    });
    session.installBadFiles = true;
    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });
    expect(result.classification).toBe("Partial");
    expect(result.targets[0]?.classification).toBe("Failed");
    expect(result.targets[0]?.operations.map((operation) => operation.kind)).toEqual([
      "marketplace-removed",
      "marketplace-added",
      "plugin-removed",
      "plugin-installed",
    ]);
    expect(session.hasPlugin("docs")).toBe(true);
    expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:docs@rawr-hq");
  });

  it("returns the exact confirmed prefix and uncertain attempted command, then retries from live state", async () => {
    const content = selectedContent();
    const targets = [
      channelRequest.targets[0],
      { provider: "claude" as const, home: "/tmp/claude-home" },
    ] as const;
    const first = new FakeNativeSession({ target: targets[0], content });
    const second = new FakeNativeSession({
      target: targets[1],
      content,
      installed: ["cognition"],
      staleFiles: ["cognition"],
    });
    second.installFailure = "after";
    const resolver = new FakeSelectedContentResolver({ channel: [content] });
    const dependencies = {
      currentMain: createCurrentMainReader(),
      selectedContent: resolver,
      nativeSessions: new FakeNativeSessions([first, second]),
    };
    const firstResult = await runProviderSync({ ...channelRequest, targets }, dependencies);
    expect(firstResult.classification).toBe("Uncertain");
    expect(firstResult.targets.map((target) => target.target.provider)).toEqual([
      "claude",
      "codex",
    ]);
    expect(firstResult.targets[0]?.operations).toEqual([
      { kind: "plugin-removed", selector: "cognition@rawr-hq" },
    ]);
    expect(firstResult.targets[0]).toMatchObject({
      classification: "Uncertain",
      attempted: {
        operation: { kind: "plugin-installed", selector: "cognition@rawr-hq" },
        commandPhase: "command-returned",
      },
    });
    expect(firstResult.targets[0]?.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "plugin-installed",
          subject: "cognition@rawr-hq",
        }),
      ])
    );
    expect(firstResult.targets[0]?.facts.some((fact) => fact.kind === "plugin-enabled")).toBe(
      false
    );
    expect(firstResult.targets[1]?.classification).toBe("NotAttempted");

    const mutationCount = first.mutationCalls().length + second.mutationCalls().length;
    const retry = await runProviderSync({ ...channelRequest, targets }, dependencies);
    expect(retry.classification).toBe("Changed");
    expect(retry.targets.map((target) => target.classification)).toEqual(["Changed", "Changed"]);
    expect(first.mutationCalls().length + second.mutationCalls().length).toBe(mutationCount + 4);

    const repeatCount = first.mutationCalls().length + second.mutationCalls().length;
    const repeat = await runProviderSync({ ...channelRequest, targets }, dependencies);
    expect(repeat.classification).toBe("Converged");
    expect(first.mutationCalls().length + second.mutationCalls().length).toBe(repeatCount);
  });

  it("stops before marketplace add when native removal cannot be observed", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "stale",
      installed: ["cognition"],
      omitted: ["docs"],
    });
    session.marketplaceRemoveFailure = "after";
    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });
    expect(result.classification).toBe("Uncertain");
    expect(result.targets[0]).toMatchObject({
      classification: "Uncertain",
      operations: [],
      attempted: {
        operation: { kind: "marketplace-removed", identity: "rawr-hq" },
        commandPhase: "command-returned",
      },
    });
    expect(session.mutationCalls()).not.toContain("mutate:marketplace-add");
  });

  it("does not retire identity-matched plugins until the selected marketplace is observed", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
      installed: ["cognition"],
      omitted: ["docs"],
    });
    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });

    expect(result.classification).toBe("Changed");
    const calls = session.mutationCalls();
    expect(calls.indexOf("mutate:marketplace-add")).toBeLessThan(
      calls.indexOf("mutate:plugin-remove:docs@rawr-hq")
    );
    expect(session.hasPlugin("docs")).toBe(false);
  });

  it("refuses ambiguous marketplace provenance without removing plugins", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "ambiguous",
      omitted: ["docs"],
    });
    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });

    expect(result.classification).toBe("Blocked");
    expect(result.issues.some((issue) => issue.code === "MarketplaceCollision")).toBe(true);
    expect(session.mutationCalls()).toEqual([]);
    expect(session.hasPlugin("docs")).toBe(true);
  });

  it("preserves and blocks foreign desired-name residue even when it is not installed", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
    });
    session.setForeignPlugin("cognition", "other", false);

    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });

    expect(result.classification).toBe("Blocked");
    expect(result.issues.some((issue) => issue.code === "PluginCollision")).toBe(true);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("refuses a reported disabled Codex plugin without inventing enablement", async () => {
    const content = selectedContent();
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    session.setPluginEnabled("cognition", false);
    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [content] }),
      nativeSessions: new FakeNativeSessions([session]),
    });

    expect(result.classification).toBe("Failed");
    expect(result.issues.some((issue) => issue.code === "CapabilityMissing")).toBe(true);
    expect(result.targets[0]?.facts.some((fact) => fact.kind === "plugin-enabled")).toBe(false);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("blocks without mutation when exact content changes during pre-mutation revalidation", async () => {
    const firstContent = selectedContent();
    const changedTree = parseGitTreeId("9".repeat(40));
    if (!changedTree.ok) throw new Error("Invalid changed-tree fixture");
    const changedContent = Object.freeze({ ...firstContent, sourceTree: changedTree.value });
    const session = new FakeNativeSession({
      target: channelRequest.targets[0],
      content: firstContent,
    });
    const result = await runProviderSync(channelRequest, {
      currentMain: createCurrentMainReader(),
      selectedContent: new FakeSelectedContentResolver({ channel: [firstContent, changedContent] }),
      nativeSessions: new FakeNativeSessions([session]),
    });
    expect(result.classification).toBe("Blocked");
    expect(result.issues.some((issue) => issue.code === "SourceChanged")).toBe(true);
    expect(session.mutationCalls()).toEqual([]);
  });
});

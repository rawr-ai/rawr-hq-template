import type {
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@rawr/resource-content-workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  CURRENT_MAIN_V3_CANONICAL_REF,
  CURRENT_MAIN_V3_RECORD_PATH,
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
} from "../../../src/service/model/dto/current-main-record";
import { testInvocation } from "../../support/client";
import {
  channelRequest,
  createProviderLifecycleClient,
  FakeNativeProviders,
  fakeNativeSession,
  selectedContent,
  selectedContentWithAliases,
  wrongRepositoryChannelRequest,
} from "./fixture";

describe("provider sync", () => {
  it("refuses a wrong current-main repository before resolving selected content or observing native state", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const nativeProviders = new FakeNativeProviders([session]);
    const { client, resourceCalls } = createProviderLifecycleClient(content, nativeProviders);

    const result = await client.providers.sync(wrongRepositoryChannelRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(resourceCalls).toEqual(["inspect:refs/heads/main"]);
    expect(nativeProviders.acquisitionCalls).toEqual([]);
    expect(session.calls).toEqual([]);
  });

  it("completes two exact current-main selections before the first native mutation", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const { client, resourceCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([session])
    );
    if (session.provider !== "codex") throw new Error("Expected a Codex session fixture");
    const originalAddMarketplace = session.addMarketplace.bind(session);
    let selectionsAtFirstMutation = -1;
    let channelSelectionsAtFirstMutation = -1;
    let resourceCallsAtFirstMutation = -1;
    session.addMarketplace = (source) =>
      Effect.suspend(() => {
        selectionsAtFirstMutation = countCompleteCurrentMainSelections(resourceCalls);
        channelSelectionsAtFirstMutation = countCompleteChannelSelections(resourceCalls);
        resourceCallsAtFirstMutation = resourceCalls.length;
        return originalAddMarketplace(source);
      });

    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Changed");
    expect(selectionsAtFirstMutation).toBe(2);
    expect(channelSelectionsAtFirstMutation).toBe(2);
    expect(resourceCallsAtFirstMutation).toBe(COMPLETE_CHANNEL_SELECTION_CALLS.length * 2);
    expect(countCompleteCurrentMainSelections(resourceCalls)).toBe(2);
    expect(countCompleteChannelSelections(resourceCalls)).toBe(2);
  });

  it("acquires once per target when the initial native preflight is converged", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    const nativeProviders = new FakeNativeProviders([session]);
    const { client } = createProviderLifecycleClient(content, nativeProviders);

    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Converged");
    expect(nativeProviders.acquisitionCalls).toEqual(["codex:/tmp/codex-home"]);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("preflights every target again and mutates only through the retained final session", async () => {
    const content = selectedContent();
    const targets = [
      channelRequest.targets[0],
      { provider: "claude" as const, home: "/tmp/claude-home" },
    ] as const;
    const initialCodex = fakeNativeSession({
      target: targets[0],
      content,
      marketplace: "absent",
    });
    const initialClaude = fakeNativeSession({
      target: targets[1],
      content,
      marketplace: "absent",
    });
    let acquisitionsAtFirstMutation: readonly string[] = [];
    let finalCodexCallsAtFirstMutation: readonly string[] = [];
    const finalClaude = fakeNativeSession({
      target: targets[1],
      content,
      marketplace: "absent",
      onMutation: () => {
        if (acquisitionsAtFirstMutation.length > 0) return;
        acquisitionsAtFirstMutation = [...nativeProviders.acquisitionCalls];
        finalCodexCallsAtFirstMutation = [...finalCodex.calls];
      },
    });
    const finalCodex = fakeNativeSession({
      target: targets[0],
      content,
      marketplace: "absent",
    });
    const nativeProviders = new FakeNativeProviders([
      initialCodex,
      finalCodex,
      initialClaude,
      finalClaude,
    ]);
    const { client } = createProviderLifecycleClient(content, nativeProviders);

    const result = await client.providers.sync({ ...channelRequest, targets }, testInvocation);

    expect(result.classification).toBe("Changed");
    expect(acquisitionsAtFirstMutation).toEqual([
      "claude:/tmp/claude-home",
      "codex:/tmp/codex-home",
      "claude:/tmp/claude-home",
      "codex:/tmp/codex-home",
    ]);
    expect(finalCodexCallsAtFirstMutation).toEqual(expect.arrayContaining(["probe", "inventory"]));
    expect(initialClaude.mutationCalls()).toEqual([]);
    expect(initialCodex.mutationCalls()).toEqual([]);
    expect(finalClaude.mutationCalls()).not.toEqual([]);
    expect(finalCodex.mutationCalls()).not.toEqual([]);
  });

  it("refreshes an exact Codex marketplace with an unobservable revision before installing a missing selected member", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "exact",
    });
    const { client, resourceCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([session])
    );

    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations.map((operation) => operation.kind)).toEqual([
      "marketplace-removed",
      "marketplace-added",
      "plugin-installed",
    ]);
    expect(session.hasPlugin("cognition")).toBe(true);

    const mutationCount = session.mutationCalls().length;
    const selectionCount = countCompleteChannelSelections(resourceCalls);
    const repeat = await client.providers.sync(channelRequest, testInvocation);
    expect(repeat.classification).toBe("Converged");
    expect(countCompleteChannelSelections(resourceCalls)).toBe(selectionCount + 1);
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("detects and repairs drift in a selected reference file, then repeats without mutation", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
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
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.sync(channelRequest, testInvocation);

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
    const repeat = await client.providers.sync(channelRequest, testInvocation);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("treats an oversized selected file as repairable drift", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
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
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations.map((operation) => operation.kind)).toEqual([
      "marketplace-removed",
      "marketplace-added",
      "plugin-removed",
      "plugin-installed",
    ]);
    const mutationCount = session.mutationCalls().length;
    const repeat = await client.providers.sync(channelRequest, testInvocation);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("enables a Claude plugin with unknown enablement and repeats without mutation", async () => {
    const content = selectedContent();
    const target = { provider: "claude" as const, home: "/tmp/claude-home" };
    const session = fakeNativeSession({ target, content, installed: ["cognition"] });
    session.setPluginEnabled("cognition", null);
    const request = { ...channelRequest, targets: [target] as const };
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.sync(request, testInvocation);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations).toEqual([
      { kind: "plugin-enabled", selector: "cognition@rawr-hq" },
    ]);
    const mutationCount = session.mutationCalls().length;
    const repeat = await client.providers.sync(request, testInvocation);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("retires an alias-shaped managed residue omitted from the canonical member set", async () => {
    const content = selectedContentWithAliases(["cognition"], { cognition: ["cog"] });
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
      omitted: ["cog"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations).toContainEqual({
      kind: "plugin-removed",
      selector: "cog@rawr-hq",
    });
    expect(session.hasPluginObservation("cog")).toBe(false);
  });

  it("removes omitted native selector residue even when it is no longer installed", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
      omitted: ["docs"],
    });
    session.setPluginInstalled("docs", false);
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]?.operations).toContainEqual({
      kind: "plugin-removed",
      selector: "docs@rawr-hq",
    });
    expect(session.hasPluginObservation("docs")).toBe(false);
    const mutationCount = session.mutationCalls().length;
    const repeat = await client.providers.sync(channelRequest, testInvocation);
    expect(repeat.classification).toBe("Converged");
    expect(session.mutationCalls()).toHaveLength(mutationCount);
  });

  it("establishes the marketplace and refreshes selected members before retiring omitted residue", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "stale",
      installed: ["cognition"],
      staleFiles: ["cognition"],
      omitted: ["docs"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const result = await client.providers.sync(channelRequest, testInvocation);
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
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
      staleFiles: ["cognition"],
      omitted: ["docs"],
    });
    session.installBadFiles = true;
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const result = await client.providers.sync(channelRequest, testInvocation);
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
    const first = fakeNativeSession({ target: targets[0], content });
    const second = fakeNativeSession({
      target: targets[1],
      content,
      installed: ["cognition"],
      staleFiles: ["cognition"],
    });
    second.installFailure = "after";
    second.inventoryFailureAfterInstall = true;
    const { client } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([first, second])
    );
    const firstResult = await client.providers.sync({ ...channelRequest, targets }, testInvocation);
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
    const retry = await client.providers.sync({ ...channelRequest, targets }, testInvocation);
    expect(retry.classification).toBe("Changed");
    expect(retry.targets.map((target) => target.classification)).toEqual(["Changed", "Changed"]);
    expect(first.mutationCalls().length + second.mutationCalls().length).toBe(mutationCount + 4);

    const repeatCount = first.mutationCalls().length + second.mutationCalls().length;
    const repeat = await client.providers.sync({ ...channelRequest, targets }, testInvocation);
    expect(repeat.classification).toBe("Converged");
    expect(first.mutationCalls().length + second.mutationCalls().length).toBe(repeatCount);
  });

  it("stops before marketplace add when native removal cannot be observed", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "stale",
      installed: ["cognition"],
      omitted: ["docs"],
    });
    session.marketplaceRemoveFailure = "after";
    session.inventoryFailureAfterMarketplaceRemove = true;
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const result = await client.providers.sync(channelRequest, testInvocation);
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

  it("classifies a not-started plugin install failure without continuing", async () => {
    const content = selectedContent();
    const target = { provider: "claude" as const, home: "/tmp/claude-home" };
    const session = fakeNativeSession({
      target,
      content,
      installed: ["cognition"],
      staleFiles: ["cognition"],
    });
    session.installFailure = "before";
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.sync(
      { ...channelRequest, targets: [target] },
      testInvocation
    );

    expect(result.classification).toBe("Partial");
    expect(result.targets[0]).toMatchObject({
      classification: "Failed",
      operations: [{ kind: "plugin-removed", selector: "cognition@rawr-hq" }],
      issues: [expect.objectContaining({ code: "NativeCommandFailed" })],
    });
    expect(result.targets[0]).not.toHaveProperty("attempted");
    expect(session.mutationCalls()).not.toContain("mutate:plugin-enable:cognition@rawr-hq");
  });

  it("confirms a failed plugin install when observation satisfies its postcondition", async () => {
    const content = selectedContent();
    const target = { provider: "claude" as const, home: "/tmp/claude-home" };
    const session = fakeNativeSession({
      target,
      content,
      installed: ["cognition"],
      staleFiles: ["cognition"],
    });
    session.installFailure = "after";
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.sync(
      { ...channelRequest, targets: [target] },
      testInvocation
    );

    expect(result.classification).toBe("Changed");
    expect(result.targets[0]).toMatchObject({
      classification: "Changed",
      operations: [
        { kind: "plugin-removed", selector: "cognition@rawr-hq" },
        { kind: "plugin-installed", selector: "cognition@rawr-hq" },
        { kind: "plugin-enabled", selector: "cognition@rawr-hq" },
      ],
    });
    expect(result.targets[0]).not.toHaveProperty("attempted");
  });

  it("marks a successful plugin install uncertain when confirmation cannot be observed", async () => {
    const content = selectedContent();
    const target = { provider: "claude" as const, home: "/tmp/claude-home" };
    const session = fakeNativeSession({
      target,
      content,
      installed: ["cognition"],
      staleFiles: ["cognition"],
    });
    session.inventoryFailureAfterInstall = true;
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.sync(
      { ...channelRequest, targets: [target] },
      testInvocation
    );

    expect(result.classification).toBe("Uncertain");
    expect(result.targets[0]).toMatchObject({
      classification: "Uncertain",
      operations: [{ kind: "plugin-removed", selector: "cognition@rawr-hq" }],
      attempted: {
        operation: { kind: "plugin-installed", selector: "cognition@rawr-hq" },
        commandPhase: "command-returned",
      },
      issues: [expect.objectContaining({ code: "NativeObservationFailed" })],
    });
    expect(session.mutationCalls()).not.toContain("mutate:plugin-enable:cognition@rawr-hq");
  });

  it("does not retire identity-matched plugins until the selected marketplace is observed", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
      installed: ["cognition"],
      omitted: ["docs"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Changed");
    const calls = session.mutationCalls();
    expect(calls.indexOf("mutate:marketplace-add")).toBeLessThan(
      calls.indexOf("mutate:plugin-remove:docs@rawr-hq")
    );
    expect(session.hasPlugin("docs")).toBe(false);
  });

  it("refuses ambiguous marketplace provenance without removing plugins", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "ambiguous",
      omitted: ["docs"],
    });
    const { client, resourceCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([session])
    );
    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues.some((issue) => issue.code === "MarketplaceCollision")).toBe(true);
    expect(resourceCalls.filter((call) => call === "read-tree")).toHaveLength(1);
    expect(session.mutationCalls()).toEqual([]);
    expect(session.hasPlugin("docs")).toBe(true);
  });

  it("preserves and blocks foreign desired-name residue even when it is not installed", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
    });
    session.setForeignPlugin("cognition", "other", false);
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues.some((issue) => issue.code === "PluginCollision")).toBe(true);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("refuses a reported disabled Codex plugin without inventing enablement", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    session.setPluginEnabled("cognition", false);
    const { client, resourceCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([session])
    );
    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result.classification).toBe("Failed");
    expect(result.issues.some((issue) => issue.code === "CapabilityMissing")).toBe(true);
    expect(result.targets[0]?.facts.some((fact) => fact.kind === "plugin-enabled")).toBe(false);
    expect(resourceCalls.filter((call) => call === "read-tree")).toHaveLength(1);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("blocks without mutation when the second current-main selection fails", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      failSecondCurrentMainOpening: true,
    });
    const result = await client.providers.sync(channelRequest, testInvocation);
    expect(result.classification).toBe("Blocked");
    expect(result.issues.some((issue) => issue.code === "SourceChanged")).toBe(true);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("maps a rejected second channel read to SourceChanged and retains the first selection", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    let treeReads = 0;
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "read-git-tree",
      reason: "GitFailed",
      detail: "Second selected tree is unavailable",
    };
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) => {
            treeReads += 1;
            return treeReads === 2 ? Effect.fail(failure) : delegate.readGitTree(input);
          },
        }),
    });

    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result).toMatchObject({
      classification: "Blocked",
      selection: {
        sourceCommit: content.sourceCommit,
        sourceTree: content.sourceTree,
        pluginIds: ["cognition"],
      },
      issues: [expect.objectContaining({ code: "SourceChanged" })],
    });
    expect(treeReads).toBe(2);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("refuses a changed second channel observation before native mutation", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    let sourceInspections = 0;
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          inspectGitRef: (input: Parameters<ContentWorkspaceResource<never>["inspectGitRef"]>[0]) =>
            Effect.map(delegate.inspectGitRef(input), (observation) => {
              if (input.refName !== "refs/tags/agent-plugins-v1") return observation;
              sourceInspections += 1;
              return sourceInspections === 6
                ? Object.freeze({ ...observation, tree: "9".repeat(40) })
                : observation;
            }),
        }),
    });

    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result).toMatchObject({
      classification: "Blocked",
      selection: {
        sourceCommit: content.sourceCommit,
        sourceTree: content.sourceTree,
        pluginIds: ["cognition"],
      },
      issues: [expect.objectContaining({ code: "SourceChanged" })],
    });
    expect(sourceInspections).toBe(6);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("refuses an unequal second selected-content result and retains the first observation", async () => {
    const content = selectedContent();
    const changedContent = selectedContent(["cognition", "docs"]);
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      secondSelectionContent: changedContent,
    });

    const result = await client.providers.sync(channelRequest, testInvocation);

    expect(result).toMatchObject({
      classification: "Blocked",
      selection: {
        releaseInputDigest: content.releaseInputDigest,
        pluginIds: ["cognition"],
      },
      issues: [expect.objectContaining({ code: "SourceChanged" })],
    });
    expect(result.selection?.releaseInputDigest).not.toBe(changedContent.releaseInputDigest);
    expect(session.mutationCalls()).toEqual([]);
  });
});

const CURRENT_MAIN_SELECTION_CALLS = [
  `inspect:${CURRENT_MAIN_V3_CANONICAL_REF}`,
  `inspect:${CURRENT_MAIN_V3_CANONICAL_REF}`,
  `read-at:${CURRENT_MAIN_V3_RECORD_PATH}`,
  "ancestry",
  "inspect:refs/tags/agent-plugins-v1",
  `read-at:${CURRENT_MAIN_V3_RELEASE_INPUT_PATH}`,
  `inspect:${CURRENT_MAIN_V3_CANONICAL_REF}`,
] as const;

const COMPLETE_CHANNEL_SELECTION_CALLS = [
  ...CURRENT_MAIN_SELECTION_CALLS,
  "inspect:refs/tags/agent-plugins-v1",
  "read-tree",
  "read-blob",
  "read-blob",
  "read-blob",
  "read-blobs",
  "inspect:refs/tags/agent-plugins-v1",
] as const;

function countCompleteCurrentMainSelections(calls: readonly string[]): number {
  return countOrderedSelections(calls, CURRENT_MAIN_SELECTION_CALLS);
}

function countCompleteChannelSelections(calls: readonly string[]): number {
  return countOrderedSelections(
    calls.map((call) => (call.startsWith("read-blob:") ? "read-blob" : call)),
    COMPLETE_CHANNEL_SELECTION_CALLS
  );
}

function countOrderedSelections(
  calls: readonly string[],
  expectedCalls: readonly string[]
): number {
  let count = 0;
  for (let index = 0; index <= calls.length - expectedCalls.length; index += 1) {
    if (expectedCalls.every((expected, offset) => calls[index + offset] === expected)) {
      count += 1;
    }
  }
  return count;
}

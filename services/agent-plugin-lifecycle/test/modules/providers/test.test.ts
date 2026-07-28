import type {
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@rawr/resource-content-workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  MAX_CLEAN_CONTENT_INDEX_BYTES,
  MAX_CLEAN_CONTENT_TREE_BYTES,
  MAX_CLEAN_CONTENT_TREE_ENTRIES,
  MAX_CLEAN_CONTENT_WORKTREE_BYTES,
  MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
  MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
  MAX_CLEAN_RELEASE_INPUT_BYTES,
} from "../../../src/service/model/policy/clean-content-workspace";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../src/service/model/policy/release-payload-accounting";
import { MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES } from "../../../src/service/modules/providers/model/policy/source-interface";
import { testInvocation } from "../../support/client";
import {
  createProviderLifecycleClient,
  FakeNativeProviders,
  fakeNativeSession,
  selectedContent,
  selectedContentWithAliases,
  selectedContentWithExecutableScript,
  TEMPORARY_MARKETPLACE_ROOT,
  testRequest,
} from "./fixture";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("provider disposable-home test", () => {
  it("selects exactly the requested member without acting on unselected content", async () => {
    const content = selectedContentWithExecutableScript(
      ["cognition", "docs"],
      { kind: "local", root: TEMPORARY_MARKETPLACE_ROOT },
      "targeted"
    );
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      installed: ["cognition", "docs"],
    });
    const { client, finalizedTemporaryRoots, gitMarketplaceEntries, materializationCalls } =
      createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.test(
      {
        ...testRequest,
        mode: {
          kind: "targeted",
          pluginIds: [content.members[0]!.pluginId],
        },
      },
      testInvocation
    );

    expect(result.classification).toBe("Converged");
    expect(result.selection).toEqual({
      repositoryIdentity: content.repositoryIdentity,
      sourceCommit: content.sourceCommit,
      sourceTree: content.sourceTree,
      releaseInputDigest: content.releaseInputDigest,
      pluginIds: ["cognition"],
      releaseSetDigest: null,
    });
    expect(result.targets.flatMap((target) => target.operations)).toEqual([]);
    expect(session.mutationCalls()).toEqual([]);
    expect(session.calls.some((call) => call.includes("docs@rawr-hq"))).toBe(false);
    expect(materializationCalls).toHaveLength(1);
    expect(materializationCalls[0]!.parentRoot).toBe(testRequest.disposableRoot);
    expect(materializationCalls[0]!.entries).toEqual(gitMarketplaceEntries);
    expect(gitMarketplaceEntries).toContainEqual(
      expect.objectContaining({
        path: "plugins/agents/cognition/scripts/setup.sh",
        mode: "100755",
      })
    );
    expect(TEMPORARY_MARKETPLACE_ROOT).not.toBe(testRequest.contentWorkspace.locator);
    expect(finalizedTemporaryRoots).toEqual([TEMPORARY_MARKETPLACE_ROOT]);
  });

  it("selects the complete release set through the public operation", async () => {
    const content = selectedContent(
      ["cognition", "docs"],
      { kind: "local", root: TEMPORARY_MARKETPLACE_ROOT },
      "complete-set"
    );
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      installed: ["cognition", "docs"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.test(
      { ...testRequest, mode: { kind: "complete-set" } },
      testInvocation
    );

    expect(result.classification).toBe("Converged");
    expect(result.selection).toMatchObject({
      pluginIds: ["cognition", "docs"],
      releaseSetDigest: expect.stringMatching(/^rs1_[0-9a-f]{64}$/u),
    });
    expect(session.mutationCalls()).toEqual([]);
  });

  it("preserves managed installed members omitted from a complete release set", async () => {
    const content = selectedContent(
      ["cognition"],
      { kind: "local", root: TEMPORARY_MARKETPLACE_ROOT },
      "complete-set"
    );
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      installed: ["cognition"],
      omitted: ["docs"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.test(testRequest, testInvocation);

    expect(result.classification).toBe("Converged");
    expect(session.hasPlugin("docs")).toBe(true);
    expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:docs@rawr-hq");
  });

  it("authors two complete bounded source selections before the first native mutation", async () => {
    const content = selectedContent(
      ["cognition"],
      { kind: "local", root: TEMPORARY_MARKETPLACE_ROOT },
      "targeted"
    );
    const treeLimits: Array<
      Readonly<{ paths: readonly string[]; maxEntries: number; maxBytes: number }>
    > = [];
    const blobLimits: number[] = [];
    const payloadLimits: Array<
      Readonly<{ maxBlobs: number; maxBlobBytes: number; maxTotalBytes: number }>
    > = [];
    const evidenceLimits: Array<
      Readonly<{
        maxPaths: number;
        maxWorktreeFileBytes: number;
        maxWorktreeBytes: number;
        maxBytes: number;
      }>
    > = [];
    const lifecycleEvents: string[] = [];
    let resourceCallsAtFirstMutation: readonly string[] | undefined;
    let resourceCalls: string[] = [];
    const initialSession = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      marketplace: "absent",
      onInventory: () => lifecycleEvents.push("initial-observation"),
    });
    const finalSession = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      marketplace: "absent",
      onMutation: () => {
        lifecycleEvents.push("mutation");
        if (resourceCallsAtFirstMutation === undefined) {
          resourceCallsAtFirstMutation = [...resourceCalls];
        }
      },
      onInventory: () => lifecycleEvents.push("final-observation"),
    });
    const nativeProviders = new FakeNativeProviders([initialSession, finalSession]);
    const fixture = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.tap(delegate.readGitTree(input), () =>
              Effect.sync(() => {
                treeLimits.push({
                  paths: [...input.paths],
                  maxEntries: input.maxEntries,
                  maxBytes: input.maxBytes,
                });
              })
            ),
          readGitBlob: (input: Parameters<ContentWorkspaceResource<never>["readGitBlob"]>[0]) =>
            Effect.tap(delegate.readGitBlob(input), () =>
              Effect.sync(() => {
                blobLimits.push(input.maxBytes);
              })
            ),
          readGitBlobs: (input: Parameters<ContentWorkspaceResource<never>["readGitBlobs"]>[0]) =>
            Effect.tap(delegate.readGitBlobs(input), () =>
              Effect.sync(() => {
                payloadLimits.push({
                  maxBlobs: input.maxBlobs,
                  maxBlobBytes: input.maxBlobBytes,
                  maxTotalBytes: input.maxTotalBytes,
                });
              })
            ),
          captureGitWorkspaceEvidence: (
            input: Parameters<ContentWorkspaceResource<never>["captureGitWorkspaceEvidence"]>[0]
          ) =>
            Effect.tap(delegate.captureGitWorkspaceEvidence(input), () =>
              Effect.sync(() => {
                evidenceLimits.push({
                  maxPaths: input.maxPaths,
                  maxWorktreeFileBytes: input.maxWorktreeFileBytes,
                  maxWorktreeBytes: input.maxWorktreeBytes,
                  maxBytes: input.maxBytes,
                });
              })
            ),
        }),
      onTemporaryTreeEvent: (event) => lifecycleEvents.push(event),
    });
    resourceCalls = fixture.resourceCalls;

    const result = await fixture.client.providers.test(
      {
        ...testRequest,
        mode: { kind: "targeted", pluginIds: [content.members[0]!.pluginId] },
      },
      testInvocation
    );

    expect(result.classification).toBe("Changed");
    expect(
      resourceCallsAtFirstMutation?.filter((call) => call === "inspect-workspace")
    ).toHaveLength(2);
    expect(
      resourceCallsAtFirstMutation?.filter((call) => call === "materialize-tree")
    ).toHaveLength(1);
    expect(resourceCallsAtFirstMutation).not.toContain("finalize-tree");
    expect(treeLimits.length).toBeGreaterThan(0);
    expect(new Set(treeLimits.map(({ paths }) => paths.join("\0")))).toEqual(
      new Set([
        [".rawr/release-input.json", "plugins/agents"].join("\0"),
        [".agents/plugins", ".claude-plugin"].join("\0"),
      ])
    );
    expect(
      treeLimits.every(
        ({ maxEntries, maxBytes }) =>
          maxEntries === MAX_CLEAN_CONTENT_TREE_ENTRIES && maxBytes === MAX_CLEAN_CONTENT_TREE_BYTES
      )
    ).toBe(true);
    expect(blobLimits.length).toBeGreaterThan(0);
    expect(new Set(blobLimits)).toEqual(
      new Set([MAX_CLEAN_RELEASE_INPUT_BYTES, MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES])
    );
    expect(payloadLimits.length).toBeGreaterThan(0);
    expect(
      payloadLimits.every(
        (limits) =>
          limits.maxBlobs === MAX_CLEAN_CONTENT_TREE_ENTRIES &&
          limits.maxBlobBytes === MAX_CLEAN_MEMBER_PAYLOAD_BYTES &&
          limits.maxTotalBytes === MAX_RELEASE_SET_PAYLOAD_BYTES
      )
    ).toBe(true);
    expect(evidenceLimits.length).toBeGreaterThan(0);
    expect(
      evidenceLimits.every(
        (limits) =>
          limits.maxPaths === MAX_CLEAN_CONTENT_TREE_ENTRIES &&
          limits.maxWorktreeFileBytes === MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES &&
          limits.maxWorktreeBytes === MAX_CLEAN_CONTENT_WORKTREE_BYTES &&
          limits.maxBytes === MAX_CLEAN_CONTENT_INDEX_BYTES
      )
    ).toBe(true);
    expect(fixture.materializationCalls).toHaveLength(1);
    expect(fixture.materializationCalls[0]).toMatchObject({
      parentRoot: testRequest.disposableRoot,
      maxEntries: MAX_CLEAN_CONTENT_TREE_ENTRIES + 2,
      maxBytes: MAX_RELEASE_SET_PAYLOAD_BYTES + 2 * MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
    });
    expect(fixture.finalizedTemporaryRoots).toEqual([TEMPORARY_MARKETPLACE_ROOT]);
    expect(lifecycleEvents[0]).toBe("materialized");
    expect(lifecycleEvents.lastIndexOf("mutation")).toBeLessThan(
      lifecycleEvents.lastIndexOf("final-observation")
    );
    expect(lifecycleEvents.lastIndexOf("final-observation")).toBeLessThan(
      lifecycleEvents.lastIndexOf("finalized")
    );
    expect(initialSession.mutationCalls()).toEqual([]);
    expect(finalSession.mutationCalls()).not.toEqual([]);
  });

  it("blocks exact marketplace byte drift before native mutation", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: TEMPORARY_MARKETPLACE_ROOT,
    });
    const manifestPathsByBlob = new Map<string, string>();
    const manifestReads = new Map<string, number>();
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const nativeProviders = new FakeNativeProviders([session]);
    const fixture = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.map(delegate.readGitTree(input), (entries) => {
              for (const entry of entries) {
                if (entry.path.endsWith("marketplace.json")) {
                  manifestPathsByBlob.set(entry.blob, entry.path);
                }
              }
              return entries;
            }),
          readGitBlob: (input: Parameters<ContentWorkspaceResource<never>["readGitBlob"]>[0]) =>
            Effect.map(delegate.readGitBlob(input), (bytes) => {
              const path = manifestPathsByBlob.get(input.blob);
              if (path !== ".agents/plugins/marketplace.json") return bytes;
              const reads = (manifestReads.get(path) ?? 0) + 1;
              manifestReads.set(path, reads);
              return reads === 2
                ? encoder.encode(`${JSON.stringify(JSON.parse(decoder.decode(bytes)))}\n`)
                : bytes;
            }),
        }),
    });

    const result = await fixture.client.providers.test(testRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SourceChanged",
        detail: "Selected content changed immediately before native mutation.",
      },
    ]);
    expect(session.mutationCalls()).toEqual([]);
    expect(fixture.finalizedTemporaryRoots).toEqual([TEMPORARY_MARKETPLACE_ROOT]);
  });

  it("returns the concrete second clean refusal before comparing bindings", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: TEMPORARY_MARKETPLACE_ROOT,
    });
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "inspect-git-workspace",
      reason: "GitFailed",
      detail: "second clean inspection failed",
    };
    let inspections = 0;
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const nativeProviders = new FakeNativeProviders([session]);
    const { client } = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          inspectGitWorkspace: (
            input: Parameters<ContentWorkspaceResource<never>["inspectGitWorkspace"]>[0]
          ) =>
            Effect.suspend(() => {
              inspections += 1;
              return inspections === 2 ? Effect.fail(failure) : delegate.inspectGitWorkspace(input);
            }),
        }),
    });

    const result = await client.providers.test(testRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.selection).not.toBeNull();
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail: "SourceIneligible: GitFailure: second clean inspection failed",
      },
    ]);
    expect(nativeProviders.acquisitionCalls).toEqual(["codex:/tmp/rawr-provider-test/codex-home"]);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("blocks a changed clean binding without native mutation", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: TEMPORARY_MARKETPLACE_ROOT,
    });
    let captures = 0;
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      marketplace: "absent",
    });
    const nativeProviders = new FakeNativeProviders([session]);
    const fixture = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          captureGitWorkspaceEvidence: (
            input: Parameters<ContentWorkspaceResource<never>["captureGitWorkspaceEvidence"]>[0]
          ) =>
            Effect.map(delegate.captureGitWorkspaceEvidence(input), (evidence) => {
              captures += 1;
              return captures > 2
                ? Object.freeze({
                    ...evidence,
                    indexEntries: new TextEncoder().encode("changed binding"),
                  })
                : evidence;
            }),
        }),
    });

    const result = await fixture.client.providers.test(testRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SourceChanged",
        detail: "Selected content changed immediately before native mutation.",
      },
    ]);
    expect(nativeProviders.acquisitionCalls).toEqual(["codex:/tmp/rawr-provider-test/codex-home"]);
    expect(session.mutationCalls()).toEqual([]);
    expect(fixture.finalizedTemporaryRoots).toEqual([TEMPORARY_MARKETPLACE_ROOT]);
  });

  it("maps typed source failure but preserves defects, interruption, and finalization", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: TEMPORARY_MARKETPLACE_ROOT,
    });
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "inspect-git-workspace",
      reason: "GitFailed",
      detail: "provider test source failed",
    };
    const session = fakeNativeSession({ target: testRequest.targets[0], content });
    const failed = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({ ...delegate, inspectGitWorkspace: () => Effect.fail(failure) }),
    }).client;
    await expect(failed.providers.test(testRequest, testInvocation)).resolves.toMatchObject({
      classification: "Blocked",
      issues: [
        {
          code: "SelectionRejected",
          detail: "SourceIneligible: GitFailure: provider test source failed",
        },
      ],
    });

    const defect = new Error("provider test source defect");
    const defective = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({ ...delegate, inspectGitWorkspace: () => Effect.die(defect) }),
    }).client;
    await expect(defective.providers.test(testRequest, testInvocation)).rejects.toBe(defect);

    const started = Promise.withResolvers<void>();
    let finalized = 0;
    const interrupted = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          inspectGitWorkspace: () =>
            Effect.sync(() => started.resolve()).pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(
                Effect.sync(() => {
                  finalized += 1;
                })
              )
            ),
        }),
    }).client;
    const controller = new AbortController();
    const operation = interrupted.providers.test(testRequest, {
      ...testInvocation,
      signal: controller.signal,
    });
    await started.promise;
    controller.abort();
    await expect(operation).rejects.toBeDefined();
    expect(finalized).toBe(1);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("finalizes a materialized marketplace after native defects and interruption", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: TEMPORARY_MARKETPLACE_ROOT,
    });
    const defect = new Error("provider capability defect");
    const defectiveSession = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      probeOverride: () => Effect.die(defect),
    });
    const defective = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([defectiveSession])
    );

    await expect(defective.client.providers.test(testRequest, testInvocation)).rejects.toBe(defect);
    expect(defective.finalizedTemporaryRoots).toEqual([TEMPORARY_MARKETPLACE_ROOT]);

    const started = Promise.withResolvers<void>();
    const interruptedSession = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      probeOverride: () => Effect.sync(() => started.resolve()).pipe(Effect.andThen(Effect.never)),
    });
    const interrupted = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([interruptedSession])
    );
    const controller = new AbortController();
    const operation = interrupted.client.providers.test(testRequest, {
      ...testInvocation,
      signal: controller.signal,
    });
    await started.promise;
    controller.abort();
    await expect(operation).rejects.toBeDefined();
    expect(interrupted.finalizedTemporaryRoots).toEqual([TEMPORARY_MARKETPLACE_ROOT]);
  });

  it("blocks a materialization failure before native acquisition", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: TEMPORARY_MARKETPLACE_ROOT,
    });
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "materialize-temporary-tree",
      reason: "FilesystemFailed",
      detail: "temporary marketplace materialization failed",
    };
    let attempts = 0;
    const session = fakeNativeSession({ target: testRequest.targets[0], content });
    const nativeProviders = new FakeNativeProviders([session]);
    const { client } = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          materializeTemporaryTree: () =>
            Effect.sync(() => {
              attempts += 1;
            }).pipe(Effect.andThen(Effect.fail(failure))),
        }),
    });

    const result = await client.providers.test(testRequest, testInvocation);

    expect(attempts).toBe(1);
    expect(result.classification).toBe("Blocked");
    expect(result.selection).toBeNull();
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail: "SourceReadFailed: temporary marketplace materialization failed",
      },
    ]);
    expect(nativeProviders.acquisitionCalls).toEqual([]);
    expect(session.calls).toEqual([]);
  });

  it.each([
    {
      name: "incomplete membership",
      replacements: nativeMarketplaceBytes(["cognition"]),
      detail: "plugin set",
    },
    {
      name: "wrong Codex source",
      replacements: nativeMarketplaceBytes(["cognition", "docs"], "docs"),
      detail: "source",
    },
    {
      name: "malformed Claude JSON",
      replacements: new Map([[".claude-plugin/marketplace.json", encoder.encode("{not-json}\n")]]),
      detail: "UTF-8 JSON",
    },
  ])("rejects $name before native observation", async ({ replacements, detail }) => {
    const content = selectedContent(
      ["cognition", "docs"],
      { kind: "local", root: TEMPORARY_MARKETPLACE_ROOT },
      "complete-set"
    );
    const session = fakeNativeSession({ target: testRequest.targets[0], content });
    const manifestBlobs = new Map<string, string>();
    const nativeProviders = new FakeNativeProviders([session]);
    const { client } = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.map(delegate.readGitTree(input), (entries) => {
              for (const entry of entries) {
                if (replacements.has(entry.path)) manifestBlobs.set(entry.blob, entry.path);
              }
              return entries;
            }),
          readGitBlob: (input: Parameters<ContentWorkspaceResource<never>["readGitBlob"]>[0]) => {
            const path = manifestBlobs.get(input.blob);
            const replacement = path === undefined ? undefined : replacements.get(path);
            return replacement === undefined
              ? delegate.readGitBlob(input)
              : Effect.succeed(replacement);
          },
        }),
    });

    const result = await client.providers.test(testRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail: expect.stringContaining(detail),
      },
    ]);
    expect(nativeProviders.acquisitionCalls).toEqual([]);
    expect(session.calls).toEqual([]);
  });

  it("keeps the full scoped catalog while mutating only a targeted member", async () => {
    const events: string[] = [];
    const content = selectedContent(
      ["cognition", "docs"],
      { kind: "local", root: TEMPORARY_MARKETPLACE_ROOT },
      "targeted"
    );
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      marketplace: "absent",
      omitted: ["docs"],
      onInventory: () => events.push("inventory"),
    });
    const { client, finalizedTemporaryRoots, materializationCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([session]),
      {
        onTemporaryTreeEvent: (event) => events.push(event),
      }
    );

    const result = await client.providers.test(
      {
        ...testRequest,
        mode: { kind: "targeted", pluginIds: [content.members[0]!.pluginId] },
      },
      testInvocation
    );

    expect(result.classification).toBe("Changed");
    expect(session.hasPlugin("cognition")).toBe(true);
    expect(session.hasPlugin("docs")).toBe(true);
    expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:docs@rawr-hq");
    expect(session.calls.some((call) => call.includes("docs@rawr-hq"))).toBe(false);
    expect(materializationCalls).toHaveLength(1);
    expect(
      materializationCalls[0]!.entries.some((entry) =>
        entry.path.startsWith("plugins/agents/docs/")
      )
    ).toBe(true);
    expect(session.marketplaceAddSources()).toEqual([
      { kind: "local", root: TEMPORARY_MARKETPLACE_ROOT },
    ]);
    expect(session.marketplaceAddSources()[0]).not.toEqual({
      kind: "local",
      root: testRequest.contentWorkspace.locator,
    });
    expect(events[0]).toBe("materialized");
    expect(events.at(-1)).toBe("finalized");
    expect(events.lastIndexOf("inventory")).toBeLessThan(events.lastIndexOf("finalized"));
    expect(finalizedTemporaryRoots).toEqual([TEMPORARY_MARKETPLACE_ROOT]);
  });

  it("preserves alias-shaped managed residue in a disposable home", async () => {
    const content = selectedContentWithAliases(
      ["cognition"],
      { cognition: ["cog"] },
      { kind: "local", root: TEMPORARY_MARKETPLACE_ROOT }
    );
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      installed: ["cognition"],
      omitted: ["cog"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.test(testRequest, testInvocation);

    expect(result.classification).toBe("Converged");
    expect(session.hasPluginObservation("cog")).toBe(true);
    expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:cog@rawr-hq");
  });
});

function nativeMarketplaceBytes(
  pluginIds: readonly string[],
  wrongCodexSource?: string
): ReadonlyMap<string, Uint8Array> {
  return new Map([
    [
      ".agents/plugins/marketplace.json",
      encoder.encode(
        `${JSON.stringify({
          name: "rawr-hq",
          plugins: pluginIds.map((pluginId) => ({
            name: pluginId,
            source: {
              source: "local",
              path: `./plugins/agents/${wrongCodexSource ?? pluginId}`,
            },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "agent",
          })),
        })}\n`
      ),
    ],
    [
      ".claude-plugin/marketplace.json",
      encoder.encode(
        `${JSON.stringify({
          $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
          name: "rawr-hq",
          owner: { name: "RAWR HQ" },
          plugins: pluginIds.map((pluginId) => ({
            name: pluginId,
            source: `./plugins/agents/${pluginId}`,
            description: `${pluginId} agent plugin`,
          })),
        })}\n`
      ),
    ],
  ]);
}

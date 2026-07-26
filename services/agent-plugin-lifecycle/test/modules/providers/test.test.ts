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
  MAX_CLEAN_RELEASE_SET_PAYLOAD_BYTES,
} from "../../../src/service/model/policy/clean-content-workspace";
import { MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES } from "../../../src/service/modules/providers/model/policy/source-interface";
import { testInvocation } from "../../support/client";
import {
  createProviderLifecycleClient,
  FakeNativeProviders,
  fakeNativeSession,
  selectedContent,
  selectedContentWithAliases,
  testRequest,
} from "./fixture";

const encoder = new TextEncoder();

describe("provider disposable-home test", () => {
  it("selects exactly the requested member without acting on unselected content", async () => {
    const content = selectedContent(
      ["cognition", "docs"],
      { kind: "local", root: testRequest.contentWorkspace.locator },
      "targeted"
    );
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      installed: ["cognition", "docs"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

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
  });

  it("selects the complete release set through the public operation", async () => {
    const content = selectedContent(
      ["cognition", "docs"],
      { kind: "local", root: testRequest.contentWorkspace.locator },
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

  it("authors two complete bounded source selections before the first native mutation", async () => {
    const content = selectedContent(
      ["cognition"],
      { kind: "local", root: testRequest.contentWorkspace.locator },
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
    const localLimits: number[] = [];
    let resourceCallsAtFirstMutation = -1;
    let resourceCalls: string[] = [];
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      marketplace: "absent",
      onMutation: () => {
        if (resourceCallsAtFirstMutation === -1) {
          resourceCallsAtFirstMutation = resourceCalls.length;
        }
      },
    });
    const fixture = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
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
          readFile: (input: Parameters<ContentWorkspaceResource<never>["readFile"]>[0]) =>
            Effect.tap(delegate.readFile(input), () =>
              Effect.sync(() => {
                localLimits.push(input.maxBytes);
              })
            ),
        }),
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
    expect(resourceCallsAtFirstMutation).toBe(38);
    const oneSelection = [
      "inspect-workspace",
      "read-tree",
      "read-blob",
      "read-blobs",
      "capture-evidence",
      "capture-evidence",
      "read-tree",
      "read-blob",
      "read-blob",
      "read-file:.agents/plugins/marketplace.json",
      "read-file:.claude-plugin/marketplace.json",
      "inspect-workspace",
      "read-tree",
      "read-blob",
      "read-blobs",
      "capture-evidence",
      "capture-evidence",
      "read-file:.agents/plugins/marketplace.json",
      "read-file:.claude-plugin/marketplace.json",
    ];
    expect(
      resourceCalls.map((call) => (call.startsWith("read-blob:") ? "read-blob" : call))
    ).toEqual([...oneSelection, ...oneSelection]);
    expect(treeLimits).toHaveLength(6);
    expect(treeLimits.map(({ paths }) => paths)).toEqual([
      [".rawr/release-input.json", "plugins/agents"],
      [".agents/plugins", ".claude-plugin"],
      [".rawr/release-input.json", "plugins/agents"],
      [".rawr/release-input.json", "plugins/agents"],
      [".agents/plugins", ".claude-plugin"],
      [".rawr/release-input.json", "plugins/agents"],
    ]);
    expect(
      treeLimits.every(
        ({ maxEntries, maxBytes }) =>
          maxEntries === MAX_CLEAN_CONTENT_TREE_ENTRIES && maxBytes === MAX_CLEAN_CONTENT_TREE_BYTES
      )
    ).toBe(true);
    expect(blobLimits).toEqual([
      MAX_CLEAN_RELEASE_INPUT_BYTES,
      MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
      MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
      MAX_CLEAN_RELEASE_INPUT_BYTES,
      MAX_CLEAN_RELEASE_INPUT_BYTES,
      MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
      MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
      MAX_CLEAN_RELEASE_INPUT_BYTES,
    ]);
    expect(payloadLimits).toEqual(
      Array.from({ length: 4 }, () => ({
        maxBlobs: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxBlobBytes: MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
        maxTotalBytes: MAX_CLEAN_RELEASE_SET_PAYLOAD_BYTES,
      }))
    );
    expect(evidenceLimits).toEqual(
      Array.from({ length: 8 }, () => ({
        maxPaths: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxWorktreeFileBytes: MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
        maxWorktreeBytes: MAX_CLEAN_CONTENT_WORKTREE_BYTES,
        maxBytes: MAX_CLEAN_CONTENT_INDEX_BYTES,
      }))
    );
    expect(localLimits).toEqual(
      Array.from({ length: 8 }, () => MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES)
    );
  });

  it("returns the concrete second clean refusal before comparing bindings", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: testRequest.contentWorkspace.locator,
    });
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "inspect-git-workspace",
      reason: "GitFailed",
      detail: "second clean inspection failed",
    };
    let inspections = 0;
    const session = fakeNativeSession({ target: testRequest.targets[0], content });
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
    expect(result.selection).toBeNull();
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail: "SourceIneligible: GitFailure: second clean inspection failed",
      },
    ]);
    expect(nativeProviders.acquisitionCalls).toEqual([]);
    expect(session.calls).toEqual([]);
  });

  it("blocks a changed clean binding without native mutation", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: testRequest.contentWorkspace.locator,
    });
    let captures = 0;
    const session = fakeNativeSession({ target: testRequest.targets[0], content });
    const nativeProviders = new FakeNativeProviders([session]);
    const { client } = createProviderLifecycleClient(content, nativeProviders, {
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

    const result = await client.providers.test(testRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail: "SelectionMismatch: Local content changed before provider testing.",
      },
    ]);
    expect(nativeProviders.acquisitionCalls).toEqual([]);
    expect(session.calls).toEqual([]);
  });

  it("maps typed source failure but preserves defects, interruption, and finalization", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: testRequest.contentWorkspace.locator,
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
    await expect(defective.providers.test(testRequest, testInvocation)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      cause: defect,
    });

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

  it("rereads both local manifests and refuses a late mismatch", async () => {
    const content = selectedContent(["cognition"], {
      kind: "local",
      root: testRequest.contentWorkspace.locator,
    });
    let localReads = 0;
    const session = fakeNativeSession({ target: testRequest.targets[0], content });
    const nativeProviders = new FakeNativeProviders([session]);
    const { client } = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readFile: (input: Parameters<ContentWorkspaceResource<never>["readFile"]>[0]) =>
            Effect.map(delegate.readFile(input), (bytes) => {
              localReads += 1;
              return localReads === 3 ? new TextEncoder().encode("late mismatch") : bytes;
            }),
        }),
    });

    const result = await client.providers.test(testRequest, testInvocation);

    expect(localReads).toBe(3);
    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail:
          "SourceIneligible: Local native marketplace manifest differs from Git: .agents/plugins/marketplace.json.",
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
      { kind: "local", root: testRequest.contentWorkspace.locator },
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

  it("preserves omitted managed members in targeted and complete-set modes", async () => {
    for (const selectionKind of ["targeted", "complete-set"] as const) {
      const content = selectedContent(
        ["cognition"],
        { kind: "local", root: testRequest.contentWorkspace.locator },
        selectionKind
      );
      const session = fakeNativeSession({
        target: testRequest.targets[0],
        content,
        omitted: ["docs"],
      });
      const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
      const mode =
        selectionKind === "targeted"
          ? ({
              kind: "targeted",
              pluginIds: [content.members[0]!.pluginId],
            } as const)
          : ({ kind: "complete-set" } as const);

      const result = await client.providers.test({ ...testRequest, mode }, testInvocation);

      expect(result.classification).toBe("Changed");
      expect(session.hasPlugin("cognition")).toBe(true);
      expect(session.hasPlugin("docs")).toBe(true);
      expect(session.mutationCalls()).not.toContain("mutate:plugin-remove:docs@rawr-hq");
    }
  });

  it("preserves alias-shaped managed residue in a disposable home", async () => {
    const content = selectedContentWithAliases(
      ["cognition"],
      { cognition: ["cog"] },
      { kind: "local", root: testRequest.contentWorkspace.locator }
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
              path: `./plugins/agents/${
                pluginId === "cognition" && wrongCodexSource !== undefined
                  ? wrongCodexSource
                  : pluginId
              }`,
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

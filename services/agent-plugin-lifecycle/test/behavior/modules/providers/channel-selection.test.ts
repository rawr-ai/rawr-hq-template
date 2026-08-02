import type {
  ContentTreeEntry,
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@habitat-ai/rawr-resource-content-workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  CURRENT_MAIN_V3_CANONICAL_REF,
  CURRENT_MAIN_V3_RECORD_PATH,
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
} from "../../../../src/service/model/dto/current-main-record";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../../src/service/model/policy/release-payload-accounting";
import {
  CHANNEL_SELECTED_CONTENT_PATHS,
  MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
  MAX_SELECTED_CONTENT_MEMBER_PAYLOAD_BYTES,
  MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES,
  MAX_SELECTED_CONTENT_TREE_BYTES,
  MAX_SELECTED_CONTENT_TREE_ENTRIES,
  NATIVE_MARKETPLACE_MANIFESTS,
  SELECTED_CONTENT_PLUGIN_ROOT,
  SELECTED_CONTENT_RELEASE_INPUT_PATH,
} from "../../../../src/service/modules/providers/model/policy/source-interface";
import {
  channelRequest,
  createProviderLifecycleClient,
  FakeNativeProviders,
  fakeNativeSession,
  selectedContent,
} from "../../../support/modules/providers/fixture";
import { testInvocation } from "../../../support/service/client";

describe("provider channel selected content", () => {
  it("resolves exact current-main content through the public status operation", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    const events: string[] = [];
    const nativeProviders = new FakeNativeProviders([session], (target) => {
      events.push(`native:acquire:${target.provider}:${target.home}`);
    });
    let treeInput: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0] | undefined;
    let treeEntries: readonly ContentTreeEntry[] = [];
    const blobInputs: Parameters<ContentWorkspaceResource<never>["readGitBlob"]>[0][] = [];
    let batchInput: Parameters<ContentWorkspaceResource<never>["readGitBlobs"]>[0] | undefined;
    const { client, resourceCalls } = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          inspectGitRef: (input: Parameters<ContentWorkspaceResource<never>["inspectGitRef"]>[0]) =>
            Effect.suspend(() => {
              events.push(`workspace:inspect:${input.refName}`);
              return delegate.inspectGitRef(input);
            }),
          readGitBlobAtPath: (
            input: Parameters<ContentWorkspaceResource<never>["readGitBlobAtPath"]>[0]
          ) =>
            Effect.suspend(() => {
              events.push(`workspace:read-at:${input.path}`);
              return delegate.readGitBlobAtPath(input);
            }),
          isLocalGitAncestor: (
            input: Parameters<ContentWorkspaceResource<never>["isLocalGitAncestor"]>[0]
          ) =>
            Effect.suspend(() => {
              events.push("workspace:ancestry");
              return delegate.isLocalGitAncestor(input);
            }),
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.suspend(() => {
              events.push("workspace:read-tree");
              treeInput = input;
              return Effect.map(delegate.readGitTree(input), (entries) => {
                treeEntries = entries;
                return entries;
              });
            }),
          readGitBlob: (input: Parameters<ContentWorkspaceResource<never>["readGitBlob"]>[0]) =>
            Effect.suspend(() => {
              events.push(`workspace:read-blob:${input.blob}`);
              blobInputs.push(input);
              return delegate.readGitBlob(input);
            }),
          readGitBlobs: (input: Parameters<ContentWorkspaceResource<never>["readGitBlobs"]>[0]) =>
            Effect.suspend(() => {
              events.push("workspace:read-blobs");
              batchInput = input;
              return delegate.readGitBlobs(input);
            }),
        }),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Converged");
    expect(result.selection).toMatchObject({
      sourceCommit: content.sourceCommit,
      sourceTree: content.sourceTree,
      releaseInputDigest: content.releaseInputDigest,
      pluginIds: ["cognition"],
    });
    expect(
      resourceCalls.map((call) => (call.startsWith("read-blob:") ? "read-blob" : call))
    ).toEqual([
      `inspect:${CURRENT_MAIN_V3_CANONICAL_REF}`,
      `inspect:${CURRENT_MAIN_V3_CANONICAL_REF}`,
      `read-at:${CURRENT_MAIN_V3_RECORD_PATH}`,
      "ancestry",
      "inspect:refs/tags/agent-plugins-v1",
      `read-at:${CURRENT_MAIN_V3_RELEASE_INPUT_PATH}`,
      `inspect:${CURRENT_MAIN_V3_CANONICAL_REF}`,
      "inspect:refs/tags/agent-plugins-v1",
      "read-tree",
      "read-blob",
      "read-blob",
      "read-blob",
      "read-blobs",
      "inspect:refs/tags/agent-plugins-v1",
    ]);
    expect(treeInput).toEqual({
      root: channelRequest.locator.workspacePath,
      tree: content.sourceTree,
      objectFormat: "sha1",
      paths: CHANNEL_SELECTED_CONTENT_PATHS,
      maxEntries: MAX_SELECTED_CONTENT_TREE_ENTRIES,
      maxBytes: MAX_SELECTED_CONTENT_TREE_BYTES,
    });
    const entryByPath = new Map(treeEntries.map((entry) => [entry.path, entry]));
    const selectedBlobPaths = [
      SELECTED_CONTENT_RELEASE_INPUT_PATH,
      ...NATIVE_MARKETPLACE_MANIFESTS,
    ];
    expect(blobInputs).toEqual(
      selectedBlobPaths.map((path, index) => ({
        root: channelRequest.locator.workspacePath,
        blob: entryByPath.get(path)?.blob,
        objectFormat: "sha1",
        maxBytes:
          index === 0
            ? MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES
            : MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
      }))
    );
    expect(batchInput).toEqual({
      root: channelRequest.locator.workspacePath,
      blobs: treeEntries
        .filter((entry) => entry.path.startsWith(`${SELECTED_CONTENT_PLUGIN_ROOT}/`))
        .map((entry) => entry.blob),
      objectFormat: "sha1",
      maxBlobs: MAX_SELECTED_CONTENT_TREE_ENTRIES,
      maxBlobBytes: MAX_SELECTED_CONTENT_MEMBER_PAYLOAD_BYTES,
      maxTotalBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
    });
    const lastChannelInspection = events.lastIndexOf(
      "workspace:inspect:refs/tags/agent-plugins-v1"
    );
    expect(lastChannelInspection).toBeGreaterThan(-1);
    expect(events.indexOf("native:acquire:codex:/tmp/codex-home")).toBeGreaterThan(
      lastChannelInspection
    );
    expect(nativeProviders.acquisitionCalls).toEqual(["codex:/tmp/codex-home"]);
    expect(session.mutationCalls()).toEqual([]);
  });

  it("rejects a selected ref that changes before its closing observation", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    let contentRefInspections = 0;
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          inspectGitRef: (input: Parameters<ContentWorkspaceResource<never>["inspectGitRef"]>[0]) =>
            Effect.map(delegate.inspectGitRef(input), (observation) => {
              if (input.refName !== "refs/tags/agent-plugins-v1") return observation;
              contentRefInspections += 1;
              return contentRefInspections === 3
                ? Object.freeze({ ...observation, tree: "9".repeat(40) })
                : observation;
            }),
        }),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail: "SelectionMismatch: Selected Git tag changed while its content was read.",
      },
    ]);
    expect(session.calls).toEqual([]);
  });

  it.each([
    {
      reason: "GitFailed" as const,
      detail: "Git tree output contains invalid UTF-8",
      code: "SourceReadFailed",
    },
    {
      reason: "UnsupportedEntry" as const,
      detail: "Git tree contains a non-regular entry",
      code: "SourceIneligible",
    },
    {
      reason: "LimitExceeded" as const,
      detail: "Git tree output exceeds maxEntries",
      code: "SourceIneligible",
    },
  ])("preserves typed selected-tree $reason classification", async ({ reason, detail, code }) => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "read-git-tree",
      reason,
      detail,
    };
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({ ...delegate, readGitTree: () => Effect.fail(failure) }),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail: `${code}: ${detail}`,
      },
    ]);
    expect(session.calls).toEqual([]);
  });

  it.each([
    {
      name: "blob",
      operation: "read-git-blob" as const,
      install: (
        delegate: ContentWorkspaceResource<never>,
        failure: ContentWorkspaceFailure
      ): ContentWorkspaceResource<never> =>
        Object.freeze({ ...delegate, readGitBlob: () => Effect.fail(failure) }),
    },
    {
      name: "batch",
      operation: "read-git-blob" as const,
      install: (
        delegate: ContentWorkspaceResource<never>,
        failure: ContentWorkspaceFailure
      ): ContentWorkspaceResource<never> =>
        Object.freeze({ ...delegate, readGitBlobs: () => Effect.fail(failure) }),
    },
  ])("maps a typed selected-content $name failure at the public boundary", async (testCase) => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: testCase.operation,
      reason: "GitFailed",
      detail: `selected ${testCase.name} failed`,
    };
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) => testCase.install(delegate, failure),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result).toMatchObject({
      classification: "Blocked",
      issues: [
        {
          code: "SelectionRejected",
          detail: `SourceReadFailed: selected ${testCase.name} failed`,
        },
      ],
    });
    expect(session.calls).toEqual([]);
  });

  it("preserves selected-content defects, interruption, and resource finalization", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    const defect = new Error("selected channel defect");
    const defective = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({ ...delegate, readGitTree: () => Effect.die(defect) }),
    }).client;

    await expect(defective.providers.status(channelRequest, testInvocation)).rejects.toBe(defect);

    const started = Promise.withResolvers<void>();
    let finalized = 0;
    const interrupted = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: () =>
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
    const operation = interrupted.providers.status(channelRequest, {
      ...testInvocation,
      signal: controller.signal,
    });

    await started.promise;
    controller.abort();
    await expect(operation).rejects.toBeDefined();
    expect(finalized).toBe(1);
    expect(session.calls).toEqual([]);
  });

  it("reports release-input failure before a missing marketplace manifest", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    const nativeProviders = new FakeNativeProviders([session]);
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "read-git-blob",
      reason: "GitFailed",
      detail: "Selected release input is unreadable",
    };
    const { client } = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.map(delegate.readGitTree(input), (entries) =>
              Object.freeze(
                entries.filter((entry) => entry.path !== ".agents/plugins/marketplace.json")
              )
            ),
          readGitBlob: () => Effect.fail(failure),
        }),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result).toMatchObject({
      classification: "Blocked",
      issues: [
        {
          code: "SelectionRejected",
          detail: "SourceReadFailed: Selected release input is unreadable",
        },
      ],
    });
    expect(nativeProviders.acquisitionCalls).toEqual([]);
    expect(session.calls).toEqual([]);
  });

  it("reports an earlier manifest read failure before a missing later manifest", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    const nativeProviders = new FakeNativeProviders([session]);
    const failure: ContentWorkspaceFailure = {
      _tag: "ContentWorkspaceFailure",
      operation: "read-git-blob",
      reason: "GitFailed",
      detail: "Codex marketplace manifest is unreadable",
    };
    let blobReads = 0;
    const { client } = createProviderLifecycleClient(content, nativeProviders, {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.map(delegate.readGitTree(input), (entries) =>
              Object.freeze(
                entries.filter((entry) => entry.path !== ".claude-plugin/marketplace.json")
              )
            ),
          readGitBlob: (input: Parameters<ContentWorkspaceResource<never>["readGitBlob"]>[0]) => {
            blobReads += 1;
            return blobReads === 2 ? Effect.fail(failure) : delegate.readGitBlob(input);
          },
        }),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result).toMatchObject({
      classification: "Blocked",
      issues: [
        {
          code: "SelectionRejected",
          detail: "SourceReadFailed: Codex marketplace manifest is unreadable",
        },
      ],
    });
    expect(blobReads).toBe(2);
    expect(nativeProviders.acquisitionCalls).toEqual([]);
    expect(session.calls).toEqual([]);
  });

  it("rejects missing native marketplace interface content at the public boundary", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.map(delegate.readGitTree(input), (entries) =>
              Object.freeze(
                entries.filter((entry) => entry.path !== ".agents/plugins/marketplace.json")
              )
            ),
        }),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail:
          "SourceIneligible: Selected tree is missing native marketplace manifest .agents/plugins/marketplace.json.",
      },
    ]);
    expect(session.calls).toEqual([]);
  });

  it.each([
    {
      name: "an exact duplicate",
      path: ".rawr/release-input.json",
      detail: "path collision",
    },
    {
      name: "a portable case collision",
      path: ".RAWR/release-input.json",
      detail: "path collision",
    },
    {
      name: "a noncanonical Unicode path",
      path: "plugins/agents/cognition/skills/cafe\u0301/SKILL.md",
      detail: "noncanonical release path",
    },
  ])("rejects $name through the public status boundary", async ({ path, detail }) => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.map(delegate.readGitTree(input), (entries) => {
              const source = entries[0];
              if (source === undefined) throw new Error("Expected selected-content tree fixture");
              const injected: ContentTreeEntry = Object.freeze({
                path,
                mode: "100644",
                blob: source.blob,
              });
              return Object.freeze([...entries, injected]);
            }),
        }),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Blocked");
    expect(result.issues).toEqual([
      {
        code: "SelectionRejected",
        detail: expect.stringContaining(detail),
      },
    ]);
    expect(session.calls).toEqual([]);
  });

  it("includes an extra file under a declared payload root", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({ target: channelRequest.targets[0], content });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]), {
      transformContentWorkspace: (delegate) =>
        Object.freeze({
          ...delegate,
          readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
            Effect.map(delegate.readGitTree(input), (entries) => {
              const source = entries[0];
              if (source === undefined) throw new Error("Expected selected-content tree fixture");
              return Object.freeze([
                ...entries,
                Object.freeze({
                  path: "plugins/agents/cognition/extra.txt",
                  mode: "100644" as const,
                  blob: source.blob,
                }),
              ]);
            }),
        }),
    });

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Drifted");
    expect(session.calls.length).toBeGreaterThan(0);
  });
});

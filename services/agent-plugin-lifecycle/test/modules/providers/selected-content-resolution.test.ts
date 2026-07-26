import type {
  ContentTreeEntry,
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@rawr/resource-content-workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { testInvocation } from "../../support/client";
import {
  channelRequest,
  createProviderLifecycleClient,
  FakeNativeProviders,
  fakeNativeSession,
  selectedContent,
} from "./fixture";

describe("provider channel selected content", () => {
  it("resolves exact current-main content through the public status operation", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    const { client, resourceCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([session])
    );

    const result = await client.providers.status(channelRequest, testInvocation);

    expect(result.classification).toBe("Converged");
    expect(result.selection).toMatchObject({
      sourceCommit: content.sourceCommit,
      sourceTree: content.sourceTree,
      releaseInputDigest: content.releaseInputDigest,
      pluginIds: ["cognition"],
    });
    expect(resourceCalls.filter((call) => call === "read-tree")).toHaveLength(1);
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
    {
      name: "an undeclared payload file",
      path: "plugins/agents/cognition/extra.txt",
      detail: "undeclared",
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
});

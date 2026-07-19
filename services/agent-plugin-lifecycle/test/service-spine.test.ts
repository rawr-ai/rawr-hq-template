import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { GitWorkspaceAnchor } from "@rawr/resource-content-workspace";
import { describe, expect, it } from "vitest";

import { createClient, type Client, type Deps } from "../src/client";
import type { ProviderLifecycleRuntime } from "../src/service/modules/providers/ports";
import { unavailableContentWorkspace } from "./support/client";
import {
  parseArtifactRef,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../src/service/shared/release";

const invocation = {
  context: {
    invocation: {
      traceId: "trace-service-spine",
      commandId: "command-service-spine",
    },
  },
} as const;

describe("agent plugin lifecycle oRPC service spine", () => {
  it("routes release, vendor, packaging, and governance refusals only through their owner ports", async () => {
    const calls: string[] = [];
    const client = spineClient(calls);

    await expect(client.releases.check(releaseRequest(), invocation)).resolves.toMatchObject({
      kind: "IneligibleReport",
      issues: [{ kind: "SourceEligibility", issue: { code: "GitFailure" } }],
    });
    expect(calls.splice(0)).toEqual(["releases.source.inspect"]);

    await expect(client.vendors.status(vendorRequest(), invocation)).resolves.toMatchObject({
      kind: "Rejected",
      issues: [{ code: "RuntimeFailure" }],
    });
    expect(calls.splice(0)).toEqual(["vendors.contentWorkspace.inspectWorkspace"]);

    await expect(client.packaging.package(packagingRequest(), invocation)).resolves.toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "ArtifactMissing" },
    });
    expect(calls.splice(0)).toEqual(["packaging.releaseArtifacts.read"]);

    await expect(client.governance.currentMainRecord({
      kind: "encode-body",
      body: currentMainBody(),
    }, invocation)).resolves.toMatchObject({
      ok: true,
      value: { protocol: "agent-plugin-current-main@v2" },
    });
    expect(calls.splice(0)).toEqual([]);

    await expect(client.governance.currentMainSelection({
      locator: {
        workspacePath: "/tmp/content-workspace",
        expectedRepositoryIdentity: "git:personal-rawr-hq",
      },
    }, invocation)).resolves.toEqual({
      kind: "DIRTY_REPOSITORY",
      reason: "Canonical content workspace is dirty",
    });
    expect(calls.splice(0)).toEqual([
      "governance.contentWorkspace.inspectGitWorkspace",
      "governance.contentWorkspace.captureGitWorkspaceEvidence",
    ]);
  });

  it("rejects malformed release input before the owner port is invoked", async () => {
    const calls: string[] = [];
    const client = spineClient(calls);
    const request = releaseRequest();

    await expect(client.releases.check({
      ...request,
      contentWorkspace: { ...request.contentWorkspace, locator: "relative/content-workspace" },
    } as never, invocation)).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});

function spineClient(
  calls: string[],
): Client {
  const deps: Deps = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    releaseArtifacts: {
      read: async (ref) => {
        calls.push("packaging.releaseArtifacts.read");
        return { kind: "Missing", ref };
      },
      publishRelease: async () => unavailableAsync("release publication"),
      publishReleaseSet: async () => unavailableAsync("release-set publication"),
    },
    contentWorkspace: {
      ...unavailableContentWorkspace(),
      inspectGitWorkspace: async (input) => {
        if (input.remoteSelection.kind === "Named") {
          calls.push("releases.source.inspect");
          throw new Error("fixture repository is unavailable");
        }
        calls.push("governance.contentWorkspace.inspectGitWorkspace");
        return governanceAnchor();
      },
      captureGitWorkspaceEvidence: async () => {
        calls.push("governance.contentWorkspace.captureGitWorkspaceEvidence");
        const dirtyStatus = new TextEncoder().encode("? fixture-dirty\0");
        return {
          openingAnchor: governanceAnchor(),
          openingStatus: dirtyStatus,
          openingTrackedFlags: new Uint8Array(),
          worktreeObjectIds: [],
          indexEntries: new Uint8Array(),
          closingAnchor: governanceAnchor(),
          closingStatus: dirtyStatus,
          closingTrackedFlags: new Uint8Array(),
        };
      },
      inspectWorkspace: async () => {
        calls.push("vendors.contentWorkspace.inspectWorkspace");
        return unavailableAsync("vendor content workspace inspection");
      },
    },
    clock: { now: () => new Date("2026-07-17T00:00:00.000Z") },
    packageOutput: {
      encodeCoworkV1: async () => unavailableAsync("cowork archive encode"),
      publish: async () => unavailableAsync("package output"),
    },
    exports: {
      artifactReader: { read: async () => unavailableAsync("export artifact read") },
      knownNativeHomesReader: {
        readCompleteSnapshot: async () => unavailableAsync("native homes"),
      },
      undoWriter: {
        preflight: async () => unavailableAsync("export undo preflight"),
        begin: async () => unavailableAsync("export undo begin"),
      },
      destinationRuntime: {
        inspect: async () => unavailableAsync("export destination inspection"),
        capture: async () => unavailableAsync("export destination capture"),
        release: async () => unavailableAsync("export destination release"),
        apply: async () => unavailableAsync("export destination apply"),
        restore: async () => unavailableAsync("export destination restore"),
        settle: async () => unavailableAsync("export destination settle"),
      },
    },
    providers: unavailableProviderRuntime(),
  };
  return createClient({
    deps,
    scope: {
      controllerIdentity: "controller://service-spine-test",
      controllerDataRootIdentity: "controller-data://service-spine-test",
    },
    config: {},
  });
}

function governanceAnchor(): GitWorkspaceAnchor {
  return Object.freeze({
    root: "/tmp/content-workspace",
    rootDevice: "16777234",
    rootInode: "101",
    refName: "refs/heads/main",
    commit: "a".repeat(40),
    refCommit: "a".repeat(40),
    tree: "b".repeat(40),
    objectFormat: "sha1",
    remoteUrls: Object.freeze(["git:personal-rawr-hq"]),
  });
}

function releaseRequest(): Parameters<Client["releases"]["check"]>[0] {
  return {
    contentWorkspace: {
      locator: "/tmp/content-workspace",
      repositoryIdentity: parsed(parseRepositoryIdentity("git:personal-rawr-hq")),
      contentAuthority: parsed(parseContentAuthority("personal-rawr-hq")),
      remoteName: "origin",
      remoteUrl: "https://example.invalid/rawr-hq.git",
      refName: "refs/heads/main",
      sourceCommit: parsed(parseGitCommitId("a".repeat(40))),
      sourceTree: parsed(parseGitTreeId("b".repeat(40))),
      releaseInputPath: parsed(parseReleaseRelativePath(".rawr/release-input.json")),
      pluginRoot: parsed(parseReleaseRelativePath("plugins/agents")),
    },
    mode: { kind: "targeted", pluginId: parsed(parsePluginId("cognition")) },
  };
}

function vendorRequest(): Parameters<Client["vendors"]["status"]>[0] {
  const contentWorkspace = releaseRequest().contentWorkspace;
  return {
    contentWorkspace: {
      locator: contentWorkspace.locator,
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      contentAuthority: contentWorkspace.contentAuthority,
      refName: contentWorkspace.refName,
      sourceCommit: contentWorkspace.sourceCommit,
      sourceTree: contentWorkspace.sourceTree,
      releaseInputPath: contentWorkspace.releaseInputPath,
    },
  };
}

function packagingRequest(): Parameters<Client["packaging"]["package"]>[0] {
  return {
    artifactRef: parsed(parseArtifactRef({
      kind: "release",
      releaseDigest: `rd1_${"c".repeat(64)}`,
      artifactDigest: `ad1_${"d".repeat(64)}`,
    })),
    format: "cowork-v1",
    outputPath: "/tmp/cognition.cowork.zip",
  };
}

function currentMainBody(): Extract<
  Parameters<Client["governance"]["currentMainRecord"]>[0],
  { kind: "encode-body" }
>["body"] {
  return {
    schemaVersion: 2,
    channel: "current-main",
    contentAuthority: "rawr-hq",
    sourceRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    sourceCommit: "a".repeat(40),
    sourceTree: "b".repeat(40),
    releaseInputDigest: `ri1_${"c".repeat(64)}`,
    releaseSetDigest: `rs1_${"d".repeat(64)}`,
    evaluationProfile: "provider-smoke@v1",
    projections: [
      {
        provider: "claude",
        projectionDigest: `ap1_${"e".repeat(64)}`,
        rendererProtocol: "claude-projection@v1",
        adapterProtocol: "claude-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"f".repeat(64)}`,
      },
      {
        provider: "codex",
        projectionDigest: `ap1_${"1".repeat(64)}`,
        rendererProtocol: "codex-projection@v1",
        adapterProtocol: "codex-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"2".repeat(64)}`,
      },
    ],
  };
}

function unavailableProviderRuntime(): ProviderLifecycleRuntime {
  return {
    currentMain: { resolve: async () => unavailableAsync("provider current-main selection") },
    canonicalNative: {
      inspectCapabilities: async () => unavailableAsync("canonical provider capabilities"),
      observe: async () => unavailableAsync("canonical provider inventory"),
      apply: async () => unavailableAsync("canonical provider mutation"),
    },
    releases: { read: async () => unavailableAsync("provider release") },
    provider: {
      projectionAdapterProtocol: () => unavailable("provider adapter protocol"),
      inspectCapabilities: async () => unavailableAsync("provider capabilities"),
      readInventory: async () => unavailableAsync("provider inventory"),
      verifyProjection: async () => unavailableAsync("provider visibility"),
    },
    providerMutator: { apply: async () => unavailableAsync("provider mutation") },
    receipts: { read: async () => unavailableAsync("provider receipt") },
    receiptWriter: {
      publish: async () => unavailableAsync("provider receipt publication"),
    },
    identities: {
      read: async () => unavailableAsync("provider identity"),
      readAll: async () => unavailableAsync("complete provider identities"),
    },
    identityWriter: { admit: async () => unavailableAsync("provider identity admission") },
    projectionMaterializer: {
      materialize: async () => unavailableAsync("provider projection materialization"),
    },
    marketplaceMaterializer: {
      materialize: async () => unavailableAsync("provider marketplace materialization"),
    },
    evidence: {
      inspect: async () => unavailableAsync("provider evidence inspection"),
      publish: async () => unavailableAsync("provider evidence publication"),
    },
  };
}

function parsed<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error("Invalid service-spine fixture");
  return result.value;
}

function unavailable(label: string): never {
  throw new Error(`Unexpected ${label} access in service-spine test`);
}

async function unavailableAsync(label: string): Promise<never> {
  return unavailable(label);
}

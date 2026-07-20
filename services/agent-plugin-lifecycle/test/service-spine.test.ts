import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { GitWorkspaceAnchor } from "@rawr/resource-content-workspace";
import { describe, expect, it } from "vitest";

import { createClient, type Client, type Deps } from "../src/client";
import {
  unavailableContentWorkspace,
  unavailableProviderResources,
} from "./support/client";
import {
  parseProviderTarget,
} from "../src/service/modules/providers/model/dto/provider-target";
import {
  parseArtifactRef,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
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
    const providerScans: Parameters<Deps["providerRecords"]["scanTargets"]>[0][] = [];
    const client = spineClient(calls, { providerScans });

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
    expect(calls.splice(0)).toEqual(["releaseArtifacts.read"]);

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

    await expect(client.providers.completeNativeHomes({}, invocation)).resolves.toMatchObject({
      ok: true,
      value: {
        protocol: "agent-provider-native-homes@v1",
        homes: [],
      },
    });
    expect(calls.splice(0)).toEqual(["providers.records.scanTargets"]);
    expect(providerScans).toEqual([{
      kind: "Identity",
      maxEntries: 1_000_000,
      maxBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
    }]);
  });

  it("derives canonical provider selection from the raw content-workspace dependency", async () => {
    const calls: string[] = [];
    const artifactReads: Parameters<Deps["releaseArtifacts"]["read"]>[0][] = [];
    const contentWorkspaceInspections: Parameters<
      Deps["contentWorkspace"]["inspectGitWorkspace"]
    >[0][] = [];
    const client = spineClient(calls, { artifactReads, contentWorkspaceInspections });
    const artifactIssue = {
      code: "ARTIFACT_READ_FAILED",
      path: "artifact",
      message: "The selected immutable release artifact is missing",
      expected: "",
      actual: "",
    } as const;

    const completeRequest = completeTestRequest();
    await expect(client.providers.completeTest(completeRequest, invocation)).resolves.toEqual({
      ok: false,
      issues: [artifactIssue],
    });
    expect(calls.splice(0)).toEqual(["releaseArtifacts.read"]);
    expect(artifactReads.splice(0)).toEqual([completeRequest.releaseSet]);

    const targetedRequest = targetedTestRequest();
    await expect(client.providers.targetedTest(targetedRequest, invocation)).resolves.toEqual({
      ok: false,
      issues: [artifactIssue],
    });
    expect(calls.splice(0)).toEqual(["releaseArtifacts.read"]);
    expect(artifactReads.splice(0)).toEqual(targetedRequest.releases);

    const canonicalRequest = canonicalSyncRequest();
    const target = parsed(parseProviderTarget(canonicalRequest.targets[0]));
    const selectionIssue = {
      code: "CHANNEL_NOT_ELIGIBLE",
      path: "selection.currentMain",
      message: "Canonical content workspace is dirty",
      expected: "CURRENT_ELIGIBLE",
      actual: "DIRTY_REPOSITORY",
    } as const;
    await expect(client.providers.canonicalSync(canonicalRequest, invocation)).resolves.toEqual({
      ok: true,
      value: {
        status: "Blocked",
        targets: [{
          kind: "blocked",
          status: "BLOCKED_SELECTION",
          target,
          appliedPrefix: [],
          issues: [selectionIssue],
        }],
        issues: [selectionIssue],
      },
    });
    expect(calls.splice(0)).toEqual([
      "governance.contentWorkspace.inspectGitWorkspace",
      "governance.contentWorkspace.captureGitWorkspaceEvidence",
    ]);
    expect(contentWorkspaceInspections.splice(0)).toEqual([{
      locator: canonicalRequest.locator.workspaceRoot,
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
    }]);
    expect(artifactReads).toEqual([]);

    const statusRequest = canonicalStatusRequest();
    await expect(client.providers.canonicalStatus(statusRequest, invocation)).resolves.toEqual({
      ok: true,
      value: [{
        status: "BLOCKED_SELECTION",
        target,
        issues: [selectionIssue],
      }],
    });
    expect(calls.splice(0)).toEqual([
      "governance.contentWorkspace.inspectGitWorkspace",
      "governance.contentWorkspace.captureGitWorkspaceEvidence",
    ]);
    expect(contentWorkspaceInspections).toEqual([{
      locator: statusRequest.locator.workspaceRoot,
      remoteSelection: { kind: "All" },
      refName: "refs/heads/main",
    }]);
    expect(artifactReads).toEqual([]);
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

interface SpineObservations {
  readonly artifactReads?: Parameters<Deps["releaseArtifacts"]["read"]>[0][];
  readonly contentWorkspaceInspections?: Parameters<
    Deps["contentWorkspace"]["inspectGitWorkspace"]
  >[0][];
  readonly providerScans?: Parameters<Deps["providerRecords"]["scanTargets"]>[0][];
}

function spineClient(calls: string[], observations: SpineObservations = {}): Client {
  const providerResources = unavailableProviderResources();
  const deps: Deps = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    releaseArtifacts: {
      read: async (ref) => {
        calls.push("releaseArtifacts.read");
        observations.artifactReads?.push(ref);
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
        observations.contentWorkspaceInspections?.push(input);
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
    ...providerResources,
    providerRecords: {
      ...providerResources.providerRecords,
      scanTargets: async (input) => {
        calls.push("providers.records.scanTargets");
        observations.providerScans?.push(input);
        return Object.freeze([]);
      },
    },
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

function completeTestRequest(): Parameters<Client["providers"]["completeTest"]>[0] {
  return {
    kind: "complete-test",
    releaseSet: {
      kind: "complete-set",
      releaseSetDigest: `rs1_${"a".repeat(64)}`,
    },
    evaluationProfile: "provider-smoke@v1",
    targets: [providerTargetInput()],
  };
}

function targetedTestRequest(): Parameters<Client["providers"]["targetedTest"]>[0] {
  return {
    kind: "targeted-test",
    releases: [{
      kind: "release",
      releaseDigest: `rd1_${"b".repeat(64)}`,
      artifactDigest: `ad1_${"c".repeat(64)}`,
    }],
    evaluationProfile: "provider-smoke@v1",
    targets: [providerTargetInput()],
  };
}

function canonicalSyncRequest(): Parameters<Client["providers"]["canonicalSync"]>[0] {
  return {
    kind: "canonical-sync",
    channel: "current-main",
    locator: {
      repositoryIdentity: "git:personal-rawr-hq",
      workspaceRoot: "/tmp/content-workspace",
    },
    targets: [providerTargetInput()],
  };
}

function canonicalStatusRequest(): Parameters<Client["providers"]["canonicalStatus"]>[0] {
  return {
    kind: "canonical-status",
    channel: "current-main",
    locator: {
      repositoryIdentity: "git:personal-rawr-hq",
      workspaceRoot: "/tmp/content-workspace",
    },
    targets: [providerTargetInput()],
  };
}

function providerTargetInput(): Readonly<{ provider: "codex"; home: string }> {
  return Object.freeze({ provider: "codex", home: "/tmp/codex-home" });
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

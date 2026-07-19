import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type {
  ContentWorkspaceAsyncPort,
  ContentWorkspaceNodeAsyncPort,
} from "@rawr/resource-content-workspace";

import { createClient, type Client, type Deps } from "../../src/client";

export const testInvocation = Object.freeze({
  context: {
    invocation: {
      traceId: "trace-agent-plugin-lifecycle-test",
      commandId: "command-agent-plugin-lifecycle-test",
    },
  },
});

export function createLifecycleTestClient(overrides: Partial<Deps> = {}): Client {
  const deps: Deps = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    releaseArtifacts: {
      read: async () => unavailableAsync("release artifact read"),
      publishRelease: async () => unavailableAsync("release publication"),
      publishReleaseSet: async () => unavailableAsync("release-set publication"),
    },
    contentWorkspace: unavailableContentWorkspace(),
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
    ...unavailableProviderResources(),
    ...overrides,
  };

  return createClient({
    deps,
    scope: {
      controllerIdentity: "controller://agent-plugin-lifecycle-test",
      controllerDataRootIdentity: "controller-data://agent-plugin-lifecycle-test",
    },
    config: {},
  });
}

export function withUnavailableGitReads(
  contentWorkspace: ContentWorkspaceAsyncPort,
): ContentWorkspaceNodeAsyncPort {
  return Object.freeze({
    ...contentWorkspace,
    inspectGitWorkspace: async () => unavailableAsync("release Git workspace inspection"),
    readGitTree: async () => unavailableAsync("release Git tree read"),
    readGitBlob: async () => unavailableAsync("release Git blob read"),
    captureGitWorkspaceEvidence: async () => unavailableAsync("release Git workspace evidence capture"),
    observeGitStagedIndex: async () => unavailableAsync("staged release index observation"),
    readGitBlobAtPath: async () => unavailableAsync("release Git path read"),
    isLocalGitAncestor: async () => unavailableAsync("release Git ancestry"),
    listGitChangedPaths: async () => unavailableAsync("release Git changed paths"),
  });
}

export function unavailableContentWorkspace(): ContentWorkspaceNodeAsyncPort {
  return withUnavailableGitReads({
    inspectWorkspace: async () => unavailableAsync("vendor workspace inspection"),
    readFile: async () => unavailableAsync("vendor workspace file read"),
    readTree: async () => unavailableAsync("vendor workspace tree read"),
    observeRemote: async () => unavailableAsync("vendor remote observation"),
    materializeRemote: async () => unavailableAsync("vendor remote materialization"),
    isAncestor: async () => unavailableAsync("vendor remote ancestry"),
    capture: async () => unavailableAsync("vendor preimage capture"),
    apply: async () => unavailableAsync("vendor authoring"),
    restore: async () => unavailableAsync("vendor restoration"),
    settle: async () => unavailableAsync("vendor settlement"),
    release: async () => unavailableAsync("vendor capture release"),
  });
}

export function unavailableProviderResources() {
  return {
    providerCurrentMain: { resolve: async () => unavailableAsync("provider current-main selection") },
    providerRecords: {
      readProjection: async () => unavailableAsync("provider projection record read"),
      publishProjection: async () => unavailableAsync("provider projection record publication"),
      readTarget: async () => unavailableAsync("provider target record read"),
      scanTargets: async () => unavailableAsync("provider target record scan"),
      captureTarget: async () => unavailableAsync("provider target record capture"),
      releaseTarget: async () => unavailableAsync("provider target record release"),
      writeTarget: async () => unavailableAsync("provider target record write"),
      restoreTarget: async () => unavailableAsync("provider target record restore"),
      settleTarget: async () => unavailableAsync("provider target record settlement"),
    },
    providerArtifactRepository: {
      locateTree: async () => unavailableAsync("provider artifact tree location"),
      readTree: async () => unavailableAsync("provider artifact tree read"),
      publishTree: async () => unavailableAsync("provider artifact tree publication"),
      readEvidence: async () => unavailableAsync("provider artifact evidence read"),
      publishEvidence: async () => unavailableAsync("provider artifact evidence publication"),
    },
    providerNativeResource: {
      acquireCodex: async () => unavailableAsync("Codex native provider acquisition"),
      acquireClaude: async () => unavailableAsync("Claude native provider acquisition"),
    },
    providerExecutables: Object.freeze({}),
    providerProjectionRepositoryRoot: "/tmp/rawr-agent-plugin-lifecycle-test-provider-projections",
    providerEvidenceStore: {
      read: async () => unavailableAsync("provider evidence store read"),
      publish: async () => unavailableAsync("provider evidence store publication"),
    },
  };
}

function unavailable(label: string): never {
  throw new Error(`Unexpected ${label} access in lifecycle service test`);
}

async function unavailableAsync(label: string): Promise<never> {
  return unavailable(label);
}

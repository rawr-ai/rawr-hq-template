import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";
import type {
  ContentWorkspaceAsyncPort,
  ContentWorkspaceNodeAsyncPort,
} from "@rawr/resource-content-workspace";

import { type Client, createClient, type Deps } from "../../src/client";

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
    artifactRepository: unavailableArtifactRepository(),
    artifactRepositoryRoot: "/tmp/rawr-agent-plugin-lifecycle-test-artifacts",
    contentWorkspace: unavailableContentWorkspace(),
    clock: { now: () => new Date("2026-07-17T00:00:00.000Z") },
    packageOutput: {
      encodeCoworkV1: async () => unavailableAsync("cowork archive encode"),
      publish: async () => unavailableAsync("package output"),
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
  contentWorkspace: ContentWorkspaceAsyncPort
): ContentWorkspaceNodeAsyncPort {
  return Object.freeze({
    ...contentWorkspace,
    inspectGitWorkspace: async () => unavailableAsync("release Git workspace inspection"),
    readGitTree: async () => unavailableAsync("release Git tree read"),
    readGitBlob: async () => unavailableAsync("release Git blob read"),
    readGitBlobs: async () => unavailableAsync("release Git blob batch read"),
    captureGitWorkspaceEvidence: async () =>
      unavailableAsync("release Git workspace evidence capture"),
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
    providerRecords: {
      readProjection: async () => unavailableAsync("provider projection record read"),
      publishProjection: async () => unavailableAsync("provider projection record publication"),
      readTarget: async () => unavailableAsync("provider target record read"),
      captureTarget: async () => unavailableAsync("provider target record capture"),
      releaseTarget: async () => unavailableAsync("provider target record release"),
      writeTarget: async () => unavailableAsync("provider target record write"),
      restoreTarget: async () => unavailableAsync("provider target record restore"),
      settleTarget: async () => unavailableAsync("provider target record settlement"),
    },
    providerNativeResource: {
      acquireCodex: async () => unavailableAsync("Codex native provider acquisition"),
      acquireClaude: async () => unavailableAsync("Claude native provider acquisition"),
    },
    providerExecutables: Object.freeze({}),
    providerProjectionRepositoryRoot: "/tmp/rawr-agent-plugin-lifecycle-test-provider-projections",
  };
}

export function unavailableArtifactRepository(
  onAccess: (operation: keyof ArtifactRepositoryAsyncPort) => void = () => {}
): ArtifactRepositoryAsyncPort {
  const refuse = async (operation: keyof ArtifactRepositoryAsyncPort): Promise<never> => {
    onAccess(operation);
    return unavailableAsync(`artifact repository ${operation}`);
  };
  return Object.freeze({
    locateTree: async () => refuse("locateTree"),
    readTree: async () => refuse("readTree"),
    publishTree: async () => refuse("publishTree"),
    readEvidence: async () => refuse("readEvidence"),
    publishEvidence: async () => refuse("publishEvidence"),
  });
}

function unavailable(label: string): never {
  throw new Error(`Unexpected ${label} access in lifecycle service test`);
}

async function unavailableAsync(label: string): Promise<never> {
  return unavailable(label);
}

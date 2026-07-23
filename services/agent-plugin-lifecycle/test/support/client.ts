import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
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
    scope: {},
    config: {},
  });
}

export function withUnavailableGitReads(
  contentWorkspace: ContentWorkspaceAsyncPort
): ContentWorkspaceNodeAsyncPort {
  return Object.freeze({
    ...contentWorkspace,
    inspectGitRef: async () => unavailableAsync("release Git ref inspection"),
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
    providerNativeSessions: {
      acquire: async () => unavailableAsync("native provider acquisition"),
    },
  };
}

function unavailable(label: string): never {
  throw new Error(`Unexpected ${label} access in lifecycle service test`);
}

async function unavailableAsync(label: string): Promise<never> {
  return unavailable(label);
}

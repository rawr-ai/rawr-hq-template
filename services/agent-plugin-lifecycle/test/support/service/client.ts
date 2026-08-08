import type { AgentPluginPackageOutputResource } from "@habitat-ai/resource-agent-plugin-package-output";
import type { ContentWorkspaceResource } from "@habitat-ai/resource-content-workspace";
import type { NativeAgentProviderResources } from "@habitat-ai/resource-native-agent-provider";
import type { VersionedContentResource } from "@habitat-ai/resource-versioned-content";
import type { AnalyticsClient, Logger } from "@habitat-ai/sdk/service";
import { Effect } from "effect";

import { type Client, type CreateClientOptions, createClient } from "../../../src/client";

type LifecycleTestDeps = CreateClientOptions["deps"];

/** Analytics observation captured by lifecycle-owned test instrumentation. */
export type TestAnalyticsEntry = {
  event: string;
  payload: Record<string, unknown>;
};

/** Structured log observation captured by lifecycle-owned test instrumentation. */
export type TestLogEntry = {
  level: "info" | "error";
  event: string;
  payload: Record<string, unknown>;
};

/** Records service analytics without introducing a production adapter. */
export function createTestAnalytics(
  options: { sink?: TestAnalyticsEntry[] } = {}
): AnalyticsClient {
  return {
    track(event, payload) {
      options.sink?.push({ event, payload: payload ?? {} });
    },
  };
}

/** Records structured service logs inside the lifecycle test owner. */
export function createTestLogger(options: { sink?: TestLogEntry[] } = {}): Logger {
  return {
    info(event, payload) {
      options.sink?.push({ level: "info", event, payload: payload ?? {} });
    },
    error(event, payload) {
      options.sink?.push({ level: "error", event, payload: payload ?? {} });
    },
  };
}

export const testInvocation = Object.freeze({
  context: {
    invocation: {
      traceId: "trace-agent-plugin-lifecycle-test",
      commandId: "command-agent-plugin-lifecycle-test",
    },
  },
});

export function createLifecycleTestClient(overrides: Partial<LifecycleTestDeps> = {}): Client {
  const deps: LifecycleTestDeps = {
    logger: createTestLogger(),
    analytics: createTestAnalytics(),
    contentWorkspace: unavailableContentWorkspace(),
    clock: { now: () => new Date("2026-07-17T00:00:00.000Z") },
    packageOutput: unavailablePackageOutput(),
    versionedContent: unavailableVersionedContent(),
    ...unavailableProviderResources(),
    ...overrides,
  };

  return createClient({
    deps,
    scope: {},
    config: {},
  });
}

export function unavailableContentWorkspace(): ContentWorkspaceResource<never> {
  return Object.freeze({
    inspectGitRef: () => unavailableEffect("release Git ref inspection"),
    inspectGitWorkspace: () => unavailableEffect("release Git workspace inspection"),
    readGitTree: () => unavailableEffect("release Git tree read"),
    readGitBlob: () => unavailableEffect("release Git blob read"),
    readGitBlobs: () => unavailableEffect("release Git blob batch read"),
    captureGitWorkspaceEvidence: () => unavailableEffect("release Git workspace evidence capture"),
    observeGitStagedIndex: () => unavailableEffect("staged release index observation"),
    readGitBlobAtPath: () => unavailableEffect("release Git path read"),
    isLocalGitAncestor: () => unavailableEffect("release Git ancestry"),
    listGitChangedPaths: () => unavailableEffect("release Git changed paths"),
    inspectWorkspace: () => unavailableEffect("vendor workspace inspection"),
    readFile: () => unavailableEffect("vendor workspace file read"),
    readTree: () => unavailableEffect("vendor workspace tree read"),
    materializeContentTree: () => unavailableEffect("disposable content tree materialization"),
    capture: () => unavailableEffect("vendor preimage capture"),
    apply: () => unavailableEffect("vendor authoring"),
    restore: () => unavailableEffect("vendor restoration"),
    settle: () => unavailableEffect("vendor settlement"),
    release: () => unavailableEffect("vendor capture release"),
  });
}

/** Supplies a fail-fast package-output resource to tests outside Packaging. */
export function unavailablePackageOutput(): AgentPluginPackageOutputResource<never> {
  return Object.freeze({
    encodeCoworkV1: () => unavailableEffect("cowork archive encode"),
    publish: () => unavailableEffect("package output"),
  });
}

/** Supplies a fail-fast versioned-content resource to tests that do not exercise Vendors. */
export function unavailableVersionedContent(): VersionedContentResource<never> {
  return Object.freeze({
    observeRemote: () => unavailableEffect("vendor remote observation"),
    materializeRemote: () => unavailableEffect("vendor remote materialization"),
    isAncestor: () => unavailableEffect("vendor remote ancestry"),
  });
}

/** Supplies a closed fail-fast native provider catalog to tests outside Providers. */
export function unavailableProviderResources(): Readonly<{
  nativeProviders: NativeAgentProviderResources;
}> {
  return {
    nativeProviders: Object.freeze({
      codex: Object.freeze({
        acquire: () => unavailableEffect("Codex native provider acquisition"),
      }),
      claude: Object.freeze({
        acquire: () => unavailableEffect("Claude native provider acquisition"),
      }),
    }),
  };
}

function unavailableEffect(label: string): Effect.Effect<never> {
  return Effect.die(new Error(`Unexpected ${label} access in lifecycle service test`));
}

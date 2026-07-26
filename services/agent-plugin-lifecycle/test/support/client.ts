import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { AgentPluginPackageOutputResource } from "@rawr/resource-agent-plugin-package-output";
import type { ContentWorkspaceResource } from "@rawr/resource-content-workspace";
import type { NativeAgentProviderResources } from "@rawr/resource-native-agent-provider";
import type { VersionedContentResource } from "@rawr/resource-versioned-content";
import { Effect } from "effect";

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

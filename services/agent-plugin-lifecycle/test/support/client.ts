import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";

import { createClient, type Client, type Deps } from "../../src/client";
import type { ProviderLifecycleRuntime } from "../../src/service/modules/providers/ports";

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
    releases: {
      source: {
        inspect: async () => unavailableAsync("release source inspection"),
        revalidate: async () => unavailableAsync("release source revalidation"),
      },
      stagedSource: {
        observe: async () => unavailableAsync("staged release source observation"),
      },
      artifacts: {
        read: async () => unavailableAsync("release artifact read"),
        publishRelease: async () => unavailableAsync("release publication"),
        publishReleaseSet: async () => unavailableAsync("release-set publication"),
      },
    },
    vendors: {
      contentWorkspace: {
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
      },
      clock: { now: () => new Date("2026-07-17T00:00:00.000Z") },
    },
    packaging: {
      artifactReader: { read: async () => unavailableAsync("package artifact read") },
      output: { publish: async () => unavailableAsync("package output") },
      coworkV1: {
        encode: async () => unavailableAsync("cowork archive encode"),
        packageDigest: () => unavailable("cowork package digest"),
      },
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
    governance: {
      git: {
        inspect: async () => unavailableAsync("governance Git inspection"),
        readBlob: async () => unavailableAsync("governance blob read"),
        isAncestor: async () => unavailableAsync("governance ancestry"),
        listChangedPaths: async () => unavailableAsync("governance changed paths"),
      },
      evidence: { read: async () => unavailableAsync("governance evidence") },
      approvals: { read: async () => unavailableAsync("governance approval") },
    },
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

function unavailableProviderRuntime(): ProviderLifecycleRuntime {
  return {
    channel: { resolve: async () => unavailableAsync("provider canonical channel") },
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
      remove: async () => unavailableAsync("provider receipt removal"),
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

function unavailable(label: string): never {
  throw new Error(`Unexpected ${label} access in lifecycle service test`);
}

async function unavailableAsync(label: string): Promise<never> {
  return unavailable(label);
}

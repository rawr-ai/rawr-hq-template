import { Buffer } from "node:buffer";

import { createClient } from "@rawr/agent-plugin-lifecycle";
import {
  canonicalSerializeArtifactRef,
  type ArtifactRef,
  type VerifiedArtifactSnapshotV1,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  createKnownNativeHomesSnapshot,
  type ArtifactReadResult,
  type ArtifactReader,
  type ExportAgentPluginsRequest,
  type ExportAgentPluginsResult,
  type ExportLifecycleRuntime,
  type KnownNativeHomeV1,
  type KnownNativeHomesReader,
  type KnownNativeHomesSnapshotV1,
} from "@rawr/agent-plugin-lifecycle/bindings/exports";
import type { ProviderLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";

import { createExportLifecycleRuntime } from "../../../src/lib/agent-plugins/bindings/export-destination";

export class FakeArtifactReader implements ArtifactReader {
  readonly #snapshots = new Map<string, VerifiedArtifactSnapshotV1>();

  add(snapshot: VerifiedArtifactSnapshotV1): void {
    this.#snapshots.set(artifactKey(snapshot.ref), snapshot);
  }

  async read(ref: ArtifactRef): Promise<ArtifactReadResult> {
    const snapshot = this.#snapshots.get(artifactKey(ref));
    return snapshot === undefined ? { kind: "Missing", ref } : { kind: "Verified", snapshot };
  }
}

export class FakeKnownNativeHomesReader implements KnownNativeHomesReader {
  constructor(readonly snapshot: KnownNativeHomesSnapshotV1) {}

  async readCompleteSnapshot() {
    return { kind: "Verified" as const, snapshot: this.snapshot };
  }
}

export function knownHomes(homes: readonly KnownNativeHomeV1[] = []): KnownNativeHomesSnapshotV1 {
  const result = createKnownNativeHomesSnapshot(homes);
  if (!result.ok) throw new Error(result.failure.message);
  return result.snapshot;
}

export interface ExportTestClient {
  readonly exports: Readonly<{
    apply(input: ExportAgentPluginsRequest): Promise<ExportAgentPluginsResult>;
  }>;
}

export function createExportTestClient(
  exportsRuntime: Omit<ExportLifecycleRuntime, "destinationRuntime">,
  options: Readonly<{
    onProviderAccess?: (label: string) => void;
  }> = {},
): ExportTestClient {
  const client = createClient({
    deps: {
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
      contentWorkspace: {
        inspectWorkspace: async () => unavailableAsync("vendor content workspace inspection"),
        readFile: async () => unavailableAsync("vendor content workspace file read"),
        readTree: async () => unavailableAsync("vendor content workspace tree read"),
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
      packaging: {
        artifactReader: { read: async () => unavailableAsync("package artifact read") },
        output: { publish: async () => unavailableAsync("package output") },
        coworkV1: {
          encode: async () => unavailableAsync("cowork archive encode"),
          packageDigest: () => unavailable("cowork package digest"),
        },
      },
      exports: createExportLifecycleRuntime(exportsRuntime),
      providers: unavailableProviderRuntime(options.onProviderAccess),
      governance: {
        git: {
          inspect: async () => unavailableAsync("governance inspect"),
          readBlob: async () => unavailableAsync("governance blob read"),
          isAncestor: async () => unavailableAsync("governance ancestry"),
        },
      },
    },
    scope: {
      controllerIdentity: "controller://export-runtime-test",
      controllerDataRootIdentity: "controller-data://export-runtime-test",
    },
    config: {},
  });
  let invocationCount = 0;
  return Object.freeze({
    exports: Object.freeze({
      apply(input: ExportAgentPluginsRequest) {
        invocationCount += 1;
        return client.exports.apply(input, {
          context: {
            invocation: {
              traceId: `trace-export-runtime-${invocationCount}`,
              commandId: `command-export-runtime-${invocationCount}`,
            },
          },
        });
      },
    }),
  });
}

function unavailableProviderRuntime(
  onAccess: (label: string) => void = () => undefined,
): ProviderLifecycleRuntime {
  const unavailableProvider = (label: string): never => {
    onAccess(label);
    return unavailable(label);
  };
  const unavailableProviderAsync = async (label: string): Promise<never> => unavailableProvider(label);
  return {
    currentMain: { resolve: async () => unavailableProviderAsync("provider current-main selection") },
    canonicalNative: {
      inspectCapabilities: async () => unavailableProviderAsync("canonical provider capabilities"),
      observe: async () => unavailableProviderAsync("canonical provider inventory"),
      apply: async () => unavailableProviderAsync("canonical provider mutation"),
    },
    releases: { read: async () => unavailableProviderAsync("provider release") },
    provider: {
      projectionAdapterProtocol: () => unavailableProvider("provider adapter protocol"),
      inspectCapabilities: async () => unavailableProviderAsync("provider capabilities"),
      readInventory: async () => unavailableProviderAsync("provider inventory"),
      verifyProjection: async () => unavailableProviderAsync("provider visibility"),
    },
    providerMutator: { apply: async () => unavailableProviderAsync("provider mutation") },
    receipts: { read: async () => unavailableProviderAsync("provider receipt") },
    receiptWriter: {
      publish: async () => unavailableProviderAsync("provider receipt publication"),
    },
    identities: {
      read: async () => unavailableProviderAsync("provider identity"),
      readAll: async () => unavailableProviderAsync("complete provider identities"),
    },
    identityWriter: { admit: async () => unavailableProviderAsync("provider identity admission") },
    projectionMaterializer: {
      materialize: async () => unavailableProviderAsync("provider projection materialization"),
    },
    marketplaceMaterializer: {
      materialize: async () => unavailableProviderAsync("provider marketplace materialization"),
    },
    evidence: {
      inspect: async () => unavailableProviderAsync("provider evidence inspection"),
      publish: async () => unavailableProviderAsync("provider evidence publication"),
    },
  };
}

function artifactKey(ref: ArtifactRef): string {
  return Buffer.from(canonicalSerializeArtifactRef(ref)).toString("base64");
}

function unavailable(label: string): never {
  throw new Error(`Unexpected ${label} access in export runtime test`);
}

async function unavailableAsync(label: string): Promise<never> {
  return unavailable(label);
}

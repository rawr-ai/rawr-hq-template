import { createClient, type Deps } from "@rawr/agent-plugin-lifecycle";
import {
  type VerifiedArtifactSnapshotV1,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  createKnownNativeHomesSnapshot,
  type ExportAgentPluginsRequest,
  type ExportAgentPluginsResult,
  type ExportLifecycleHostRuntime,
  type KnownNativeHomeV1,
  type KnownNativeHomesReader,
  type KnownNativeHomesSnapshotV1,
} from "@rawr/agent-plugin-lifecycle/bindings/exports";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  unavailableContentWorkspace,
} from "../../../../../services/agent-plugin-lifecycle/test/support/client";
import {
  createSeededArtifactRepository,
} from "../../../../../services/agent-plugin-lifecycle/test/support/artifact-repository";

import { createExportLifecycleRuntime } from "../../../src/lib/agent-plugins/bindings/export-destination";

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

export async function createExportTestClient(
  artifacts: readonly VerifiedArtifactSnapshotV1[],
  exportsRuntime: Omit<ExportLifecycleHostRuntime, "destinationRuntime">,
  options: Readonly<{
    onProviderAccess?: (label: string) => void;
  }> = {},
): Promise<ExportTestClient> {
  const artifactRepository = await createSeededArtifactRepository(artifacts);
  const client = createClient({
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
      ...artifactRepository,
      contentWorkspace: unavailableContentWorkspace(),
      clock: { now: () => new Date("2026-07-17T00:00:00.000Z") },
      packageOutput: {
        encodeCoworkV1: async () => unavailableAsync("cowork archive encode"),
        publish: async () => unavailableAsync("package output"),
      },
      exports: createExportLifecycleRuntime(exportsRuntime),
      ...unavailableProviderDeps(options.onProviderAccess),
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

type ProviderLifecycleDeps = Pick<
  Deps,
  | "providerRecords"
  | "providerNativeResource"
  | "providerExecutables"
  | "providerProjectionRepositoryRoot"
>;

function unavailableProviderDeps(
  onAccess: (label: string) => void = () => undefined,
): ProviderLifecycleDeps {
  const unavailableProvider = (label: string): never => {
    onAccess(label);
    return unavailable(label);
  };
  const unavailableProviderAsync = async (label: string): Promise<never> => unavailableProvider(label);
  return Object.freeze({
    providerRecords: {
      readProjection: async () => unavailableProviderAsync("provider projection read"),
      publishProjection: async () => unavailableProviderAsync("provider projection publication"),
      readTarget: async () => unavailableProviderAsync("provider target read"),
      scanTargets: async () => unavailableProviderAsync("provider target scan"),
      captureTarget: async () => unavailableProviderAsync("provider target capture"),
      releaseTarget: async () => unavailableProviderAsync("provider target release"),
      writeTarget: async () => unavailableProviderAsync("provider target write"),
      restoreTarget: async () => unavailableProviderAsync("provider target restore"),
      settleTarget: async () => unavailableProviderAsync("provider target settlement"),
    },
    providerNativeResource: {
      acquireCodex: async () => unavailableProviderAsync("Codex provider acquisition"),
      acquireClaude: async () => unavailableProviderAsync("Claude provider acquisition"),
    },
    providerExecutables: Object.freeze({}),
    providerProjectionRepositoryRoot: "/unavailable/provider-projections",
  });
}

function unavailable(label: string): never {
  throw new Error(`Unexpected ${label} access in export runtime test`);
}

async function unavailableAsync(label: string): Promise<never> {
  return unavailable(label);
}

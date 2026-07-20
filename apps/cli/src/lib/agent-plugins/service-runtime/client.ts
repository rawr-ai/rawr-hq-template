import { resolveControllerReentry } from "@rawr/core";
import { createClient, type Client, type CreateClientOptions } from "@rawr/agent-plugin-lifecycle/client";
import {
  createKnownNativeHomesSnapshot,
  type ArtifactReader as ExportArtifactReader,
  type KnownNativeHomesReader,
  type UndoCandidateInput,
  type UndoWriter,
} from "@rawr/agent-plugin-lifecycle/bindings/exports";
import {
  createResourceExactGitReader,
} from "@rawr/agent-plugin-lifecycle/bindings/governance";
import {
  createResourceContentWorkspaceSnapshotReader,
  createResourceStagedContentWorkspaceObservationReader,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  makeDeferredNodeContentWorkspacePort,
} from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import {
  bindService,
  type ProcessView,
  type RoleView,
  type ServiceBinding,
  type ServiceBindingContext,
} from "@rawr/hq-sdk/plugins";

import {
  deriveAgentPluginControllerLayout,
} from "../layout";
import { createExportLifecycleRuntime } from "../bindings/export-destination";
import {
  createArtifactRepositoryReader,
  createArtifactRepositoryStore,
  createMechanicalEvidenceReader,
  createPackageOutputLifecycleRuntime,
} from "../bindings/output";
import {
  LifecycleAuthorityBindingError,
  type ControllerProjectionBinding,
  type LifecycleClientFactory,
  type LifecycleOperationClient,
  type LifecycleOperation,
} from "../commands/binding";
import { createGithubHostedApprovalHistoryReader } from "../bindings/governance";
import { createGovernanceLifecycleRuntime } from "./governance/runtime";
import { createNodeMechanicalEvidenceRuntime } from "./evidence/node-mechanical";
import {
  createNodeProviderLifecycleRuntime,
  createNodeProviderRecordState,
  createProviderOwnerCodecRegistration,
  type NodeProviderRecordState,
} from "./providers/node-runtime";
import { createGovernanceCanonicalChannelReader } from "./providers/governance-channel";
import { PROVIDER_OWNER } from "./providers/owner-protocol";
import {
  applyingRecoveryBlockingFailure,
  CapsuleControllerWriterV1,
  createAgentPluginOwnerProtocolRegistryV1,
  createExportUndoWriterV1,
  openNodeCapsuleStateStoreV1,
} from "../undo";

type LifecycleBoundary = CreateClientOptions;
type LifecycleProcess = ProcessView & Readonly<{
  processId: "rawr-cli";
}>;
type LifecycleRole = RoleView & Readonly<{
  roleId: "agent-plugin-lifecycle";
  capability: "agent-plugin-lifecycle";
}>;
type LifecycleBindingContext = ServiceBindingContext<LifecycleProcess, LifecycleRole>;

type LifecycleDeps = CreateClientOptions["deps"];

type LifecycleClientSelectors = Readonly<{
  [TOperation in LifecycleOperation]: (
    client: Client,
  ) => LifecycleOperationClient<TOperation>;
}>;

const lifecycleClientSelectors: LifecycleClientSelectors = Object.freeze({
  "releases.check": (client) => Object.freeze({
    releases: Object.freeze({ check: client.releases.check }),
  }),
  "releases.checkRepository": (client) => Object.freeze({
    releases: Object.freeze({ checkRepository: client.releases.checkRepository }),
  }),
  "releases.build": (client) => Object.freeze({
    releases: Object.freeze({ build: client.releases.build }),
  }),
  "vendors.status": (client) => Object.freeze({
    vendors: Object.freeze({ status: client.vendors.status }),
  }),
  "vendors.update": (client) => Object.freeze({
    vendors: Object.freeze({ update: client.vendors.update }),
  }),
  "packaging.package": (client) => Object.freeze({
    packaging: Object.freeze({ package: client.packaging.package }),
  }),
  "exports.apply": (client) => Object.freeze({
    exports: Object.freeze({ apply: client.exports.apply }),
  }),
  "providers.targetedTest": (client) => Object.freeze({
    providers: Object.freeze({ targetedTest: client.providers.targetedTest }),
  }),
  "providers.completeTest": (client) => Object.freeze({
    providers: Object.freeze({ completeTest: client.providers.completeTest }),
  }),
  "providers.canonicalSync": (client) => Object.freeze({
    providers: Object.freeze({ canonicalSync: client.providers.canonicalSync }),
  }),
  "providers.canonicalStatus": (client) => Object.freeze({
    providers: Object.freeze({ canonicalStatus: client.providers.canonicalStatus }),
  }),
  "providers.managedRetire": (client) => Object.freeze({
    providers: Object.freeze({ managedRetire: client.providers.managedRetire }),
  }),
  "governance.currentMainRecord": (client) => Object.freeze({
    governance: Object.freeze({ currentMainRecord: client.governance.currentMainRecord }),
  }),
  "governance.attestPromotion": (client) => Object.freeze({
    governance: Object.freeze({ attestPromotion: client.governance.attestPromotion }),
  }),
});

export const createProductionLifecycleClient: LifecycleClientFactory = (
  operation,
  binding,
): LifecycleOperationClient<typeof operation> => {
  const authority = controllerAuthority();
  const deps = createProductionLifecycleDeps({
    binding,
    controllerDataRoot: authority.dataRoot,
  });

  const lifecycleService = bindService(createClient, {
    bindingId: `rawr-cli/agent-plugin-lifecycle/${operation}`,
    deps,
    scope: () => ({
      controllerIdentity: `controller:${authority.controllerDigest}`,
      controllerDataRootIdentity: `controller-data:${authority.controllerDigest}`,
    }),
    config: {},
  } satisfies ServiceBinding<LifecycleBoundary, LifecycleProcess, LifecycleRole>);
  const client = lifecycleService.resolve({
    process: { processId: "rawr-cli" },
    role: {
      roleId: "agent-plugin-lifecycle",
      capability: "agent-plugin-lifecycle",
    },
  } satisfies LifecycleBindingContext);
  return selectLifecycleOperationClient(operation, client);
};

export function createProductionLifecycleDeps(input: Readonly<{
  binding: ControllerProjectionBinding;
  controllerDataRoot: string;
}>): LifecycleDeps {
  const { binding, controllerDataRoot } = input;
  const layout = deriveAgentPluginControllerLayout({ dataRoot: controllerDataRoot });
  const artifactReader = createArtifactRepositoryReader(layout.artifactStoreRoot);
  const contentWorkspace = makeDeferredNodeContentWorkspacePort({
    acquireGitExecutable: () => requiredGitExecutable(binding),
  });
  const providerState = createNodeProviderRecordState({
    controllerDataRoot,
    providerProjectionRoot: layout.providerProjectionRoot,
    providerTargetStateRoot: layout.providerTargetStateRoot,
  });
  const governance = createGovernanceLifecycleRuntime({
    git: createResourceExactGitReader({ contentWorkspace }),
    evidence: createNodeMechanicalEvidenceRuntime(layout.artifactStoreRoot).governance,
    approvals: createGithubHostedApprovalHistoryReader({
      acquireGithubExecutable: () => requiredHostedGovernanceExecutable(binding),
    }),
  });
  const providers = createNodeProviderLifecycleRuntime({
    channel: createGovernanceCanonicalChannelReader({ governance }),
    state: providerState,
    artifactReader,
    artifactStoreRoot: layout.artifactStoreRoot,
    capsuleRoot: layout.capsuleRoot,
    providerExecutables: binding.providerExecutables,
  });

  return Object.freeze({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    releases: Object.freeze({
      source: createResourceContentWorkspaceSnapshotReader({ contentWorkspace }),
      stagedSource: createResourceStagedContentWorkspaceObservationReader({ contentWorkspace }),
      artifacts: createArtifactRepositoryStore(layout.artifactStoreRoot),
      evidence: createMechanicalEvidenceReader(layout.artifactStoreRoot),
    }),
    vendors: Object.freeze({
      contentWorkspace,
      clock: Object.freeze({ now: () => new Date() }),
    }),
    packaging: createPackageOutputLifecycleRuntime({ artifactReader }),
    exports: createExportLifecycleRuntime({
      artifactReader: createExportArtifactReader(artifactReader),
      knownNativeHomesReader: createKnownNativeHomesReader(providerState),
      undoWriter: createNodeExportUndoWriter(layout.capsuleRoot),
    }),
    providers,
    governance,
  } satisfies LifecycleDeps);
}

function createExportArtifactReader(
  reader: ReturnType<typeof createArtifactRepositoryReader>,
): ExportArtifactReader {
  return Object.freeze({
    async read(ref: Parameters<ExportArtifactReader["read"]>[0]) {
      const result = await reader.read(ref);
      if (result.kind !== "Mismatch") return result;
      return Object.freeze({
        kind: "Mismatch" as const,
        ref,
        issues: Object.freeze(result.issues.map((issue) => Object.freeze({
          code: issue.code,
          path: "artifact",
          message: issue.detail,
        }))) as [
          Readonly<{ code: string; path: string; message: string }>,
          ...Readonly<{ code: string; path: string; message: string }>[],
        ],
      });
    },
  });
}

function createKnownNativeHomesReader(
  providerState: NodeProviderRecordState,
): KnownNativeHomesReader {
  return Object.freeze({
    async readCompleteSnapshot() {
      try {
        const observed = await providerState.targets.completeIdentities.readAll();
        if (!observed.ok) {
          return Object.freeze({
            kind: "Unavailable" as const,
            failure: Object.freeze({
              code: "NativeHomesUnavailable" as const,
              phase: "native-homes-read",
              message: observed.issues.map((issue) => issue.message).join("; "),
            }),
          });
        }
        const verified = createKnownNativeHomesSnapshot(observed.value.map((home) => ({
          provider: home.provider,
          canonicalPath: home.canonicalHome,
        })));
        return verified.ok
          ? Object.freeze({ kind: "Verified" as const, snapshot: verified.snapshot })
          : Object.freeze({ kind: "Unavailable" as const, failure: verified.failure });
      } catch (error) {
        return Object.freeze({
          kind: "Unavailable" as const,
          failure: Object.freeze({
            code: "NativeHomesUnavailable" as const,
            phase: "native-homes-read",
            message: errorMessage(error),
          }),
        });
      }
    },
  });
}

export function createNodeExportUndoWriter(
  capsuleRoot: Parameters<typeof openNodeCapsuleStateStoreV1>[0]["root"],
): UndoWriter {
  const writer = lazy(async () => {
    const registry = createAgentPluginOwnerProtocolRegistryV1(
      {},
      createProviderOwnerCodecRegistration(),
    );
    const opened = await openNodeCapsuleStateStoreV1({ root: capsuleRoot, registry });
    if (opened.kind === "Rejected") {
      throw new LifecycleAuthorityBindingError(opened.failure.message);
    }
    const observed = await opened.store.read();
    if (observed.kind === "Rejected") {
      throw new LifecycleAuthorityBindingError(observed.failure.message);
    }
    if (
      observed.observation.state.body.state.kind === "applying"
      && observed.observation.state.body.state.candidate.owner === PROVIDER_OWNER
    ) {
      throw new LifecycleAuthorityBindingError(
        "Applying provider lifecycle state requires qualified recovery before export mutation",
      );
    }
    const controller = new CapsuleControllerWriterV1({
      store: opened.store,
      registry,
    });
    const recovery = await controller.recoverApplying({
      expectedStateDigest: observed.observation.state.stateDigest,
    });
    const recoveryFailure = applyingRecoveryBlockingFailure(recovery);
    if (recoveryFailure !== null) {
      throw new LifecycleAuthorityBindingError(recoveryFailure.message);
    }
    return createExportUndoWriterV1(controller);
  });
  return Object.freeze({
    async preflight(input: UndoCandidateInput) {
      return (await writer()).preflight(input);
    },
    async begin(input: UndoCandidateInput) {
      return (await writer()).begin(input);
    },
  });
}

function lazy<T>(factory: () => Promise<T>): () => Promise<T> {
  let value: Promise<T> | undefined;
  return () => value ??= factory();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function controllerAuthority(): Readonly<{
  dataRoot: string;
  controllerDigest: string;
}> {
  const reentry = resolveControllerReentry();
  const dataRoot = reentry.env.RAWR_DATA_DIR;
  const controllerDigest = reentry.env.RAWR_CONTROLLER_DIGEST;
  if (dataRoot === undefined || controllerDigest === undefined) {
    throw new LifecycleAuthorityBindingError("Verified controller data identity is unavailable");
  }
  return Object.freeze({ dataRoot, controllerDigest });
}

function selectLifecycleOperationClient<TOperation extends LifecycleOperation>(
  operation: TOperation,
  client: Client,
): LifecycleOperationClient<TOperation> {
  return lifecycleClientSelectors[operation](client);
}

function requiredGitExecutable(
  binding: ControllerProjectionBinding,
): string {
  if (binding.gitExecutable === undefined) {
    throw new LifecycleAuthorityBindingError(
      "Agent-plugin lifecycle requires an explicit Git executable binding",
    );
  }
  return binding.gitExecutable;
}

function requiredHostedGovernanceExecutable(
  binding: ControllerProjectionBinding,
): string {
  if (binding.hostedGovernanceExecutable === undefined) {
    throw new LifecycleAuthorityBindingError(
      "Agent-plugin lifecycle requires an explicit hosted-governance executable binding",
    );
  }
  return binding.hostedGovernanceExecutable;
}

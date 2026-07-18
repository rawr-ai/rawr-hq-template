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
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  makeNodeContentWorkspacePort,
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
type SelectedLifecycleRuntime =
  | Readonly<{ owner: "releases"; runtime: LifecycleDeps["releases"] }>
  | Readonly<{ owner: "vendors"; runtime: LifecycleDeps["vendors"] }>
  | Readonly<{ owner: "packaging"; runtime: LifecycleDeps["packaging"] }>
  | Readonly<{ owner: "exports"; runtime: LifecycleDeps["exports"] }>
  | Readonly<{ owner: "providers"; runtime: LifecycleDeps["providers"] }>
  | Readonly<{ owner: "governance"; runtime: LifecycleDeps["governance"] }>;

type LifecycleClientSelectors = Readonly<{
  [TOperation in LifecycleOperation]: (
    client: Client,
  ) => LifecycleOperationClient<TOperation>;
}>;

const lifecycleClientSelectors: LifecycleClientSelectors = Object.freeze({
  "releases.check": (client) => Object.freeze({
    releases: Object.freeze({ check: client.releases.check }),
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
  "governance.attestPromotion": (client) => Object.freeze({
    governance: Object.freeze({ attestPromotion: client.governance.attestPromotion }),
  }),
});

export const createProductionLifecycleClient: LifecycleClientFactory = async (
  operation,
  binding,
): Promise<LifecycleOperationClient<typeof operation>> => {
  const authority = controllerAuthority();
  const layout = deriveAgentPluginControllerLayout({ dataRoot: authority.dataRoot });
  const artifactReader = createArtifactRepositoryReader(layout.artifactStoreRoot);
  const selected = await createSelectedLifecycleRuntime({
    operation,
    binding,
    layout,
    artifactReader,
    controllerDataRoot: authority.dataRoot,
    scope: {
      controllerIdentity: `controller:${authority.controllerDigest}`,
      controllerDataRootIdentity: `controller-data:${authority.controllerDigest}`,
    },
  });
  const deps = createSelectedLifecycleDeps(selected);

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

async function createSelectedLifecycleRuntime(input: Readonly<{
  operation: LifecycleOperation;
  binding: ControllerProjectionBinding;
  layout: ReturnType<typeof deriveAgentPluginControllerLayout>;
  artifactReader: ReturnType<typeof createArtifactRepositoryReader>;
  controllerDataRoot: string;
  scope: LifecycleBoundary["scope"];
}>): Promise<SelectedLifecycleRuntime> {
  const { operation, binding, layout, artifactReader, controllerDataRoot } = input;

  if (operation === "releases.check" || operation === "releases.build") {
    const gitExecutable = requiredGitExecutable(binding, operation);
    const contentWorkspace = makeNodeContentWorkspacePort({ gitExecutable });
    return Object.freeze({
      owner: "releases",
      runtime: Object.freeze({
        source: createResourceContentWorkspaceSnapshotReader({ contentWorkspace }),
        artifacts: createArtifactRepositoryStore(layout.artifactStoreRoot),
        evidence: createMechanicalEvidenceReader(layout.artifactStoreRoot),
      }),
    });
  }
  if (operation === "packaging.package") {
    return Object.freeze({
      owner: "packaging",
      runtime: createPackageOutputLifecycleRuntime({ artifactReader }),
    });
  }
  if (operation === "exports.apply") {
    const providerState = lazy(async () => createNodeProviderRecordState({
      controllerDataRoot,
      providerProjectionRoot: layout.providerProjectionRoot,
      providerTargetStateRoot: layout.providerTargetStateRoot,
    }));
    return Object.freeze({
      owner: "exports",
      runtime: createExportLifecycleRuntime({
        artifactReader: createExportArtifactReader(artifactReader),
        knownNativeHomesReader: createKnownNativeHomesReader(providerState),
        undoWriter: createNodeExportUndoWriter(layout.capsuleRoot),
      }),
    });
  }
  if (operation === "vendors.status" || operation === "vendors.update") {
    return Object.freeze({
      owner: "vendors",
      runtime: Object.freeze({
        contentWorkspace: makeNodeContentWorkspacePort({
          gitExecutable: requiredGitExecutable(binding, operation),
        }),
        clock: Object.freeze({ now: () => new Date() }),
      }),
    });
  }
  if (operation === "governance.attestPromotion") {
    return Object.freeze({
      owner: "governance",
      runtime: await productionGovernanceRuntime(binding, operation, layout.artifactStoreRoot),
    });
  }
  if (operation.startsWith("providers.")) {
    const governance = operation === "providers.canonicalSync" || operation === "providers.canonicalStatus"
      ? await productionGovernanceRuntime(binding, operation, layout.artifactStoreRoot)
      : createUnavailableGovernanceRuntime();
    const channel = createGovernanceCanonicalChannelReader({
      governance,
      operation,
      scope: input.scope,
    });
    return Object.freeze({
      owner: "providers",
      runtime: await createNodeProviderLifecycleRuntime({
        channel,
        roots: {
          controllerDataRoot,
          providerProjectionRoot: layout.providerProjectionRoot,
          providerTargetStateRoot: layout.providerTargetStateRoot,
        },
        artifactReader,
        artifactStoreRoot: layout.artifactStoreRoot,
        capsuleRoot: layout.capsuleRoot,
        providerExecutables: binding.providerExecutables,
      }),
    });
  }
  throw missingRuntimeBinding(operation);
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

async function productionGovernanceRuntime(
  binding: ControllerProjectionBinding,
  operation: LifecycleOperation,
  artifactStoreRoot: Parameters<typeof createNodeMechanicalEvidenceRuntime>[0],
) {
  const contentWorkspace = makeNodeContentWorkspacePort({
    gitExecutable: requiredGitExecutable(binding, operation),
  });
  return createGovernanceLifecycleRuntime({
    git: createResourceExactGitReader({ contentWorkspace }),
    evidence: createNodeMechanicalEvidenceRuntime(artifactStoreRoot).governance,
    approvals: createGithubHostedApprovalHistoryReader({
      acquireGithubExecutable: () => requiredHostedGovernanceExecutable(binding, operation),
    }),
  });
}

function createKnownNativeHomesReader(
  providerState: () => Promise<NodeProviderRecordState>,
): KnownNativeHomesReader {
  return Object.freeze({
    async readCompleteSnapshot() {
      try {
        const state = await providerState();
        const observed = await state.targets.completeIdentities.readAll();
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

function createSelectedLifecycleDeps(selected: SelectedLifecycleRuntime): LifecycleDeps {
  const shared = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
  };
  switch (selected.owner) {
    case "releases":
      return Object.freeze({
        ...shared,
        releases: selected.runtime,
        get vendors(): never { return unavailableDependency("vendors"); },
        get packaging(): never { return unavailableDependency("packaging"); },
        get exports(): never { return unavailableDependency("exports"); },
        get providers(): never { return unavailableDependency("providers"); },
        get governance(): never { return unavailableDependency("governance"); },
      });
    case "vendors":
      return Object.freeze({
        ...shared,
        get releases(): never { return unavailableDependency("releases"); },
        vendors: selected.runtime,
        get packaging(): never { return unavailableDependency("packaging"); },
        get exports(): never { return unavailableDependency("exports"); },
        get providers(): never { return unavailableDependency("providers"); },
        get governance(): never { return unavailableDependency("governance"); },
      });
    case "packaging":
      return Object.freeze({
        ...shared,
        get releases(): never { return unavailableDependency("releases"); },
        get vendors(): never { return unavailableDependency("vendors"); },
        packaging: selected.runtime,
        get exports(): never { return unavailableDependency("exports"); },
        get providers(): never { return unavailableDependency("providers"); },
        get governance(): never { return unavailableDependency("governance"); },
      });
    case "exports":
      return Object.freeze({
        ...shared,
        get releases(): never { return unavailableDependency("releases"); },
        get vendors(): never { return unavailableDependency("vendors"); },
        get packaging(): never { return unavailableDependency("packaging"); },
        exports: selected.runtime,
        get providers(): never { return unavailableDependency("providers"); },
        get governance(): never { return unavailableDependency("governance"); },
      });
    case "providers":
      return Object.freeze({
        ...shared,
        get releases(): never { return unavailableDependency("releases"); },
        get vendors(): never { return unavailableDependency("vendors"); },
        get packaging(): never { return unavailableDependency("packaging"); },
        get exports(): never { return unavailableDependency("exports"); },
        providers: selected.runtime,
        get governance(): never { return unavailableDependency("governance"); },
      });
    case "governance":
      return Object.freeze({
        ...shared,
        get releases(): never { return unavailableDependency("releases"); },
        get vendors(): never { return unavailableDependency("vendors"); },
        get packaging(): never { return unavailableDependency("packaging"); },
        get exports(): never { return unavailableDependency("exports"); },
        get providers(): never { return unavailableDependency("providers"); },
        governance: selected.runtime,
      });
  }
}

function createUnavailableGovernanceRuntime(): LifecycleDeps["governance"] {
  return Object.freeze({
    get git(): never { return unavailableDependency("governance.git"); },
    get evidence(): never { return unavailableDependency("governance.evidence"); },
    get approvals(): never { return unavailableDependency("governance.approvals"); },
  });
}

function unavailableDependency(label: string): never {
  throw new Error(`Unexpected ${label} lifecycle dependency access`);
}

function requiredGitExecutable(
  binding: ControllerProjectionBinding,
  operation: LifecycleOperation,
): string {
  if (binding.gitExecutable === undefined) {
    throw new LifecycleAuthorityBindingError(`${operation} requires an explicit Git executable binding`);
  }
  return binding.gitExecutable;
}

function requiredHostedGovernanceExecutable(
  binding: ControllerProjectionBinding,
  operation: LifecycleOperation,
): string {
  if (binding.hostedGovernanceExecutable === undefined) {
    throw new LifecycleAuthorityBindingError(
      `${operation} requires an explicit hosted-governance executable binding`,
    );
  }
  return binding.hostedGovernanceExecutable;
}

function missingRuntimeBinding(operation: LifecycleOperation): LifecycleAuthorityBindingError {
  const owner = operation.split(".", 1)[0];
  return new LifecycleAuthorityBindingError(
    `${owner} controller adapters are not yet assembled into the lifecycle client boundary`,
  );
}

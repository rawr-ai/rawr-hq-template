import { resolveControllerReentry } from "@rawr/core";
import { createClient, type Client, type CreateClientOptions } from "@rawr/agent-plugin-lifecycle/client";
import {
  createKnownNativeHomesSnapshot,
  type ArtifactReader as ExportArtifactReader,
  type KnownNativeHomesReader,
  type UndoCandidateInput,
  type UndoWriter,
} from "@rawr/agent-plugin-lifecycle/ports/exports";
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
  createPackageOutputLifecycleRuntime,
} from "../bindings/output";
import {
  LifecycleAuthorityBindingError,
  type ControllerProjectionBinding,
  type LifecycleClientFactory,
  type LifecycleOperation,
} from "../commands/binding";
import { createGithubHostedApprovalHistoryReader } from "../bindings/governance";
import { openNodeProviderState, type NodeProviderState } from "./providers/node-state";
import {
  createFilesystemMechanicalEvidenceReader,
  createGitContentWorkspaceSnapshotReader,
} from "./releases";
import { createReadOnlyGitAdapter } from "./governance/adapters/git";
import { createNodeReadOnlyGitBackend } from "./governance/adapters/node-git";
import { createGovernanceLifecycleRuntime } from "./governance/runtime";
import { createNodeMechanicalEvidenceRuntime } from "./evidence/node-mechanical";
import { createNodeProviderLifecycleRuntime } from "./providers/node-runtime";
import {
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

export const createProductionLifecycleClient: LifecycleClientFactory = async (
  operation,
  binding,
): Promise<Client> => {
  const authority = controllerAuthority();
  const layout = deriveAgentPluginControllerLayout({ dataRoot: authority.dataRoot });
  const artifactReader = createArtifactRepositoryReader(layout.artifactStoreRoot);
  const deps = unavailableDeps();

  if (operation === "releases.check" || operation === "releases.build") {
    const gitExecutable = requiredGitExecutable(binding, operation);
    deps.releases = {
      source: await createGitContentWorkspaceSnapshotReader({ gitExecutable }),
      artifacts: createArtifactRepositoryStore(layout.artifactStoreRoot),
      evidence: createFilesystemMechanicalEvidenceReader(layout.artifactStoreRoot),
    };
  } else if (operation === "packaging.package") {
    deps.packaging = createPackageOutputLifecycleRuntime({
      artifactReader,
    });
  } else if (operation === "exports.apply") {
    const providerState = lazy(() => openNodeProviderState({
      providerProjectionRoot: layout.providerProjectionRoot,
      providerTargetStateRoot: layout.providerTargetStateRoot,
    }));
    deps.exports = createExportLifecycleRuntime({
      artifactReader: createExportArtifactReader(artifactReader),
      knownNativeHomesReader: createKnownNativeHomesReader(providerState),
      undoWriter: createLazyExportUndoWriter(layout.capsuleRoot),
    });
  } else if (operation === "vendors.status" || operation === "vendors.update") {
    deps.vendors = {
      contentWorkspace: makeNodeContentWorkspacePort({
        gitExecutable: requiredGitExecutable(binding, operation),
      }),
      clock: { now: () => new Date() },
    };
  } else if (operation === "governance.attestPromotion") {
    deps.governance = await productionGovernanceRuntime(binding, operation, layout.artifactStoreRoot);
  } else if (operation.startsWith("providers.")) {
    const governance = operation === "providers.canonicalSync" || operation === "providers.canonicalStatus"
      ? await productionGovernanceRuntime(binding, operation, layout.artifactStoreRoot)
      : null;
    if (governance !== null) deps.governance = governance;
    deps.providers = await createNodeProviderLifecycleRuntime({
      roots: {
        providerProjectionRoot: layout.providerProjectionRoot,
        providerTargetStateRoot: layout.providerTargetStateRoot,
      },
      artifactReader,
      artifactStoreRoot: layout.artifactStoreRoot,
      capsuleRoot: layout.capsuleRoot,
      providerExecutables: binding.providerExecutables,
    });
  } else {
    throw missingRuntimeBinding(operation);
  }

  const lifecycleService = bindService(createClient, {
    bindingId: `rawr-cli/agent-plugin-lifecycle/${operation}`,
    deps,
    scope: () => ({
      controllerIdentity: `controller:${authority.controllerDigest}`,
      controllerDataRootIdentity: `controller-data:${authority.controllerDigest}`,
    }),
    config: {},
  } satisfies ServiceBinding<LifecycleBoundary, LifecycleProcess, LifecycleRole>);
  return lifecycleService.resolve({
    process: { processId: "rawr-cli" },
    role: {
      roleId: "agent-plugin-lifecycle",
      capability: "agent-plugin-lifecycle",
    },
  } satisfies LifecycleBindingContext);
};

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
  const githubExecutable = requiredHostedGovernanceExecutable(binding, operation);
  return createGovernanceLifecycleRuntime({
    git: createReadOnlyGitAdapter(await createNodeReadOnlyGitBackend({
      gitExecutable: requiredGitExecutable(binding, operation),
    })),
    evidence: createNodeMechanicalEvidenceRuntime(artifactStoreRoot).governance,
    approvals: createGithubHostedApprovalHistoryReader({
      githubExecutable,
    }),
  });
}

function createKnownNativeHomesReader(
  providerState: () => Promise<NodeProviderState>,
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

function createLazyExportUndoWriter(capsuleRoot: Parameters<typeof openNodeCapsuleStateStoreV1>[0]["root"]): UndoWriter {
  const writer = lazy(async () => {
    const registry = createAgentPluginOwnerProtocolRegistryV1();
    const opened = await openNodeCapsuleStateStoreV1({ root: capsuleRoot, registry });
    if (opened.kind === "Rejected") {
      throw new LifecycleAuthorityBindingError(opened.failure.message);
    }
    return createExportUndoWriterV1(new CapsuleControllerWriterV1({
      store: opened.store,
      registry,
    }));
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

function unavailableDeps(): CreateClientOptions["deps"] {
  return {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    releases: unavailablePort("releases"),
    vendors: unavailablePort("vendors"),
    packaging: unavailablePort("packaging"),
    exports: unavailablePort("exports"),
    providers: unavailablePort("providers"),
    governance: unavailablePort("governance"),
  };
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

function unavailablePort<T>(label: string): T {
  const target = () => {
    throw new Error(`Unexpected ${label} lifecycle port access`);
  };
  return new Proxy(target, {
    apply() {
      throw new Error(`Unexpected ${label} lifecycle port access`);
    },
    get(_value, property) {
      if (property === "then") return undefined;
      return unavailablePort(`${label}.${String(property)}`);
    },
  }) as T;
}

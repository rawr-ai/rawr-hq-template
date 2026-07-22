import {
  type Client,
  type CreateClientOptions,
  createClient,
} from "@rawr/agent-plugin-lifecycle/client";
import { resolveControllerReentry } from "@rawr/core";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  bindService,
  type ProcessView,
  type RoleView,
  type ServiceBinding,
  type ServiceBindingContext,
} from "@rawr/hq-sdk/plugins";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";
import { makeDeferredNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import {
  type ControllerProjectionBinding,
  LifecycleAuthorityBindingError,
  type LifecycleClientFactory,
  type LifecycleOperation,
  type LifecycleOperationClient,
} from "../commands/binding";
import { deriveAgentPluginControllerLayout } from "../layout";
import {
  createNodeProviderLifecycleDeps,
  createNodeProviderRecordState,
  type NodeProviderRecordState,
} from "./providers/node-runtime";

type LifecycleBoundary = CreateClientOptions;
type LifecycleProcess = ProcessView &
  Readonly<{
    processId: "rawr-cli";
  }>;
type LifecycleRole = RoleView &
  Readonly<{
    roleId: "agent-plugin-lifecycle";
    capability: "agent-plugin-lifecycle";
  }>;
type LifecycleBindingContext = ServiceBindingContext<LifecycleProcess, LifecycleRole>;

type LifecycleDeps = CreateClientOptions["deps"];

type LifecycleClientSelectors = Readonly<{
  [TOperation in LifecycleOperation]: (client: Client) => LifecycleOperationClient<TOperation>;
}>;

const lifecycleClientSelectors: LifecycleClientSelectors = Object.freeze({
  "releases.check": (client) =>
    Object.freeze({
      releases: Object.freeze({ check: client.releases.check }),
    }),
  "releases.checkRepository": (client) =>
    Object.freeze({
      releases: Object.freeze({ checkRepository: client.releases.checkRepository }),
    }),
  "releases.releaseInputRecord": (client) =>
    Object.freeze({
      releases: Object.freeze({ releaseInputRecord: client.releases.releaseInputRecord }),
    }),
  "releases.refreshReleaseInput": (client) =>
    Object.freeze({
      releases: Object.freeze({ refreshReleaseInput: client.releases.refreshReleaseInput }),
    }),
  "releases.build": (client) =>
    Object.freeze({
      releases: Object.freeze({ build: client.releases.build }),
    }),
  "vendors.status": (client) =>
    Object.freeze({
      vendors: Object.freeze({ status: client.vendors.status }),
    }),
  "vendors.update": (client) =>
    Object.freeze({
      vendors: Object.freeze({ update: client.vendors.update }),
    }),
  "packaging.package": (client) =>
    Object.freeze({
      packaging: Object.freeze({ package: client.packaging.package }),
    }),
  "providers.targetedTest": (client) =>
    Object.freeze({
      providers: Object.freeze({ targetedTest: client.providers.targetedTest }),
    }),
  "providers.completeTest": (client) =>
    Object.freeze({
      providers: Object.freeze({ completeTest: client.providers.completeTest }),
    }),
  "providers.canonicalSync": (client) =>
    Object.freeze({
      providers: Object.freeze({ canonicalSync: client.providers.canonicalSync }),
    }),
  "providers.canonicalStatus": (client) =>
    Object.freeze({
      providers: Object.freeze({ canonicalStatus: client.providers.canonicalStatus }),
    }),
  "governance.currentMainRecord": (client) =>
    Object.freeze({
      governance: Object.freeze({ currentMainRecord: client.governance.currentMainRecord }),
    }),
  "governance.currentMainSelection": (client) =>
    Object.freeze({
      governance: Object.freeze({ currentMainSelection: client.governance.currentMainSelection }),
    }),
});

export const createProductionLifecycleClient: LifecycleClientFactory = (
  operation,
  binding
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

export function createProductionLifecycleDeps(
  input: Readonly<{
    binding: ControllerProjectionBinding;
    controllerDataRoot: string;
  }>
): LifecycleDeps {
  const { binding, controllerDataRoot } = input;
  const layout = deriveAgentPluginControllerLayout({ dataRoot: controllerDataRoot });
  const artifactRepository = makeNodeArtifactRepositoryAsyncPort();
  const contentWorkspace = makeDeferredNodeContentWorkspacePort({
    acquireGitExecutable: () => requiredGitExecutable(binding),
  });
  const providerState = createNodeProviderRecordState({
    controllerDataRoot,
    providerProjectionRoot: layout.providerProjectionRoot,
    providerTargetStateRoot: layout.providerTargetStateRoot,
  });
  const providerDeps = createNodeProviderLifecycleDeps({
    state: providerState,
    providerExecutables: binding.providerExecutables,
  });

  return Object.freeze({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    artifactRepository,
    artifactRepositoryRoot: layout.artifactStoreRoot,
    contentWorkspace,
    clock: Object.freeze({ now: () => new Date() }),
    packageOutput: makeNodePackageOutputAsyncPort(),
    ...providerDeps,
  } satisfies LifecycleDeps);
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
  client: Client
): LifecycleOperationClient<TOperation> {
  return lifecycleClientSelectors[operation](client);
}

function requiredGitExecutable(binding: ControllerProjectionBinding): string {
  if (binding.gitExecutable === undefined) {
    throw new LifecycleAuthorityBindingError(
      "Agent-plugin lifecycle requires an explicit Git executable binding"
    );
  }
  return binding.gitExecutable;
}

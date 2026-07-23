import {
  type Client,
  type CreateClientOptions,
  createClient,
} from "@rawr/agent-plugin-lifecycle/client";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  bindService,
  type ProcessView,
  type RoleView,
  type ServiceBinding,
  type ServiceBindingContext,
} from "@rawr/hq-sdk/plugins";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";
import { makeDeferredNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { createNodeNativeProviderSessionResolver } from "../bindings/providers";
import {
  type LifecycleClientFactory,
  type LifecycleExecutableBinding,
  LifecycleExecutableBindingError,
  type LifecycleOperation,
  type LifecycleOperationClient,
} from "../commands/binding";

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
  "providers.test": (client) =>
    Object.freeze({
      providers: Object.freeze({ test: client.providers.test }),
    }),
  "providers.sync": (client) =>
    Object.freeze({
      providers: Object.freeze({ sync: client.providers.sync }),
    }),
  "providers.status": (client) =>
    Object.freeze({
      providers: Object.freeze({ status: client.providers.status }),
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
  const deps = createProductionLifecycleDeps({ binding });

  const lifecycleService = bindService(createClient, {
    bindingId: `rawr-cli/agent-plugin-lifecycle/${operation}`,
    deps,
    scope: () => ({}),
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
    binding: LifecycleExecutableBinding;
  }>
): LifecycleDeps {
  const { binding } = input;
  const contentWorkspace = makeDeferredNodeContentWorkspacePort({
    acquireGitExecutable: () => requiredGitExecutable(binding),
  });

  return Object.freeze({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    contentWorkspace,
    clock: Object.freeze({ now: () => new Date() }),
    packageOutput: makeNodePackageOutputAsyncPort(),
    providerNativeSessions: createNodeNativeProviderSessionResolver(binding.providerExecutables),
  } satisfies LifecycleDeps);
}

function selectLifecycleOperationClient<TOperation extends LifecycleOperation>(
  operation: TOperation,
  client: Client
): LifecycleOperationClient<TOperation> {
  return lifecycleClientSelectors[operation](client);
}

function requiredGitExecutable(binding: LifecycleExecutableBinding): string {
  if (binding.gitExecutable === undefined) {
    throw new LifecycleExecutableBindingError(
      "Agent-plugin lifecycle requires an explicit Git executable binding"
    );
  }
  return binding.gitExecutable;
}

import {
  type Client,
  type CreateClientOptions,
  createClient,
} from "@habitat-ai/agent-plugin-lifecycle-service/client";
import { createNativeAgentProviderResources } from "../bindings/providers";
import {
  type LifecycleOperation,
  type LifecycleOperationClient,
  type LifecycleOperationSelector,
} from "../commands/binding";
import type { LifecycleProductionProfile } from "../profiles/production";

type LifecycleBoundary = CreateClientOptions;

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

/**
 * Binds one local lifecycle service client to a validated CLI command.
 *
 * @remarks
 * The profile is materialized once. Resource sessions and temporary values
 * remain operation-local and retain their existing cleanup owners.
 */
export function bindProductionLifecycleService(
  profile: LifecycleProductionProfile
): LifecycleOperationSelector {
  const client = createClient({
    deps: createProductionLifecycleDeps(profile),
    scope: {},
    config: {},
  } satisfies LifecycleBoundary);
  return (operation) => selectLifecycleOperationClient(operation, client);
}

/**
 * Materializes the ready lifecycle dependencies selected by the CLI profile.
 */
export function createProductionLifecycleDeps(profile: LifecycleProductionProfile): LifecycleDeps {
  return Object.freeze({
    logger: profile.createLogger(),
    analytics: profile.createAnalytics(),
    contentWorkspace: profile.createContentWorkspace(),
    clock: profile.createClock(),
    packageOutput: profile.createPackageOutput(),
    nativeProviders: createNativeAgentProviderResources(profile.nativeProviders),
    versionedContent: profile.createVersionedContent(),
  } satisfies LifecycleDeps);
}

function selectLifecycleOperationClient<TOperation extends LifecycleOperation>(
  operation: TOperation,
  client: Client
): LifecycleOperationClient<TOperation> {
  return lifecycleClientSelectors[operation](client);
}

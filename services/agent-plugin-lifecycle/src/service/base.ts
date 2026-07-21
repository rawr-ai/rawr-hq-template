import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";
import type { AgentPluginPackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output";
import type { AgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records";
import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";
import type {
  NativeProviderExecutablePaths,
  NativeProviderResourcePort,
} from "./model/dependencies/providers";
import type {
  ArtifactStoreFailpoint,
  BuildFailpoint,
  ReleaseRetentionReaders,
} from "./model/dependencies/releases";

export interface LifecycleClock {
  readonly now: () => Date;
}

type InitialContext = {
  deps: {
    artifactRepository: ArtifactRepositoryAsyncPort;
    artifactRepositoryRoot: string;
    releaseRetention?: ReleaseRetentionReaders;
    releaseBuildFailpoint?: BuildFailpoint;
    releaseArtifactFailpoint?: ArtifactStoreFailpoint;
    contentWorkspace: ContentWorkspaceNodeAsyncPort;
    clock: LifecycleClock;
    packageOutput: AgentPluginPackageOutputAsyncPort;
    providerRecords: AgentProviderRecordsAsyncPort;
    providerNativeResource: NativeProviderResourcePort;
    providerExecutables: NativeProviderExecutablePaths;
    providerProjectionRepositoryRoot: string;
  };
  scope: {
    controllerIdentity: string;
    controllerDataRootIdentity: string;
  };
  config: {};
};

type InvocationContext = {
  traceId: string;
  commandId: string;
};

type ProcedureMetadata = {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "releases" | "vendors" | "packaging" | "providers" | "governance";
};

export const policy = {
  events: {},
} as const;

const service = defineService<{
  initialContext: InitialContext;
  invocationContext: InvocationContext;
  metadata: ProcedureMetadata;
}>({
  metadataDefaults: {
    idempotent: true,
    domain: "agent-plugin-lifecycle",
    audience: "internal",
    audit: "basic",
    entity: "service",
  },
  baseline: {
    policy,
  },
});

export type Service = ServiceOf<typeof service>;

export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;
export const createRequiredServiceObservabilityMiddleware = service.createRequiredObservabilityMiddleware;
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;
export const createServiceProvider = service.createProvider;
export const createServiceImplementer = service.createImplementer;

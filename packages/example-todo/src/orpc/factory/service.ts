import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import type {
  AnyService,
  ServiceDeclaration,
  ServiceTypesOf,
  ServiceContextFrom,
  ServiceMetadataFrom,
} from "../base";
import { createBaseImplementer } from "../base";
import { createContractBuilder } from "./contract";
import { createNormalMiddlewareBuilder, createServiceProviderBuilder } from "./middleware";
import {
  createServiceObservabilityMiddleware,
  createServiceObservabilityBaselineMiddleware,
  type ServiceObservabilityMiddlewareInput,
  type ServiceObservabilityProfile,
} from "../middleware/observability";
import {
  createServiceAnalyticsMiddleware,
  createServiceAnalyticsBaselineMiddleware,
  type ServiceAnalyticsMiddlewareInput,
  type ServiceAnalyticsProfile,
} from "../middleware/analytics";
import type { BasePolicyProfile } from "../middleware/policy";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

type DefineServiceBaselineOptions<
  TDeclaration extends ServiceDeclaration,
  TPolicy extends BasePolicyProfile,
> = {
  analytics: ServiceAnalyticsProfile<
    ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>,
    ServiceContextFrom<ServiceTypesOf<TDeclaration>>
  >;
  observability: ServiceObservabilityProfile<
    ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>,
    ServiceContextFrom<ServiceTypesOf<TDeclaration>>,
    TPolicy
  >;
  policy: TPolicy;
};

type DefineServiceOptions<
  TDeclaration extends ServiceDeclaration,
  TPolicy extends BasePolicyProfile,
> = {
  metadataDefaults: ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>;
  baseline: DefineServiceBaselineOptions<TDeclaration, TPolicy>;
};

export type DefinedService<
  TDeclaration extends ServiceDeclaration,
  TPolicy extends BasePolicyProfile = BasePolicyProfile,
> = {
  readonly __service?: ServiceTypesOf<TDeclaration>;
  readonly __baselinePolicy?: TPolicy;
  oc: ReturnType<typeof createContractBuilder<ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>>>;
  createMiddleware<TRequiredContext extends object = {}>(): ReturnType<
    typeof createNormalMiddlewareBuilder<
      TRequiredContext,
      ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>
    >
  >;
  createObservabilityMiddleware<
    TRequiredContext extends object = ServiceContextFrom<ServiceTypesOf<TDeclaration>>,
  >(
    input: ServiceObservabilityMiddlewareInput<
      ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>,
      TRequiredContext
    >,
  ): ReturnType<
    typeof createServiceObservabilityMiddleware<
      ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>,
      TRequiredContext
    >
  >;
  createAnalyticsMiddleware<
    TRequiredContext extends object = ServiceContextFrom<ServiceTypesOf<TDeclaration>>,
  >(
    input: ServiceAnalyticsMiddlewareInput<
      ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>,
      TRequiredContext
    >,
  ): ReturnType<
    typeof createServiceAnalyticsMiddleware<
      ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>,
      TRequiredContext
    >
  >;
  createProvider<TRequiredContext extends object = {}>(): ReturnType<
    typeof createServiceProviderBuilder<
      TRequiredContext,
      ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>
    >
  >;
  createImplementer: {
    <const TContract extends AnyContractProcedure>(
      contract: TContract,
    ): ImplementerInternalWithMiddlewares<
      TContract,
      ServiceContextFrom<ServiceTypesOf<TDeclaration>>,
      ServiceContextFrom<ServiceTypesOf<TDeclaration>>
    >;
    <const TContract extends AnyContractRouterObject>(
      contract: TContract,
    ): ImplementerInternalWithMiddlewares<
      TContract,
      ServiceContextFrom<ServiceTypesOf<TDeclaration>>,
      ServiceContextFrom<ServiceTypesOf<TDeclaration>>
    >;
  };
};

export type ServiceOf<TDefinedService extends { readonly __service?: AnyService }> =
  NonNullable<TDefinedService["__service"]>;

/**
 * Bind the service-local authoring surfaces once.
 *
 * @remarks
 * `defineService(...)` is the high-level seam consumed by
 * `src/service/base.ts`.
 * It binds metadata-aware contract authoring, metadata-aware service middleware
 * authoring, metadata-aware service-provider authoring, and context-typed
 * implementer creation. The `baseline` option is the service assembly manifest
 * for baseline cross-cutting concern profiles, while `metadataDefaults`
 * supplies the service-authored default procedure metadata.
 *
 * Warning:
 * do not solve service-binding mismatches here with casts or silent type
 * widening. If a future change needs `as unknown as ...` or similar to make the
 * service baseline attach, treat that as a design failure and rework the seam
 * instead of hiding the mismatch.
 */
export function defineService<
  TDeclaration extends ServiceDeclaration,
  TPolicy extends BasePolicyProfile = BasePolicyProfile,
>(
  options: DefineServiceOptions<TDeclaration, TPolicy>,
): DefinedService<TDeclaration, TPolicy> {
  type TService = ServiceTypesOf<TDeclaration>;
  type TMeta = ServiceMetadataFrom<TService>;
  type TContext = ServiceContextFrom<TService>;

  function createServiceImplementer<const TContract extends AnyContractProcedure>(
    contract: TContract,
  ): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
  function createServiceImplementer<const TContract extends AnyContractRouterObject>(
    contract: TContract,
  ): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
  function createServiceImplementer(contract: AnyContractRouter) {
    const serviceObservability = createServiceObservabilityBaselineMiddleware(
      options.metadataDefaults,
      options.baseline.observability,
      options.baseline.policy,
    );
    const serviceAnalytics = createServiceAnalyticsBaselineMiddleware(
      options.metadataDefaults,
      options.baseline.analytics,
    );

    if (isContractProcedure(contract)) {
      return createBaseImplementer<AnyContractProcedure, TContext>(contract)
        .use(serviceObservability)
        .use(serviceAnalytics);
    }

    return createBaseImplementer<AnyContractRouterObject, TContext>(
      contract as AnyContractRouterObject,
    )
      .use(serviceObservability)
      .use(serviceAnalytics);
  }

  return {
    oc: createContractBuilder<TMeta>({ baseMetadata: options.metadataDefaults }),
    createMiddleware<
      TRequiredContext extends object = {},
    >() {
      return createNormalMiddlewareBuilder<TRequiredContext, TMeta>({
        baseMetadata: options.metadataDefaults,
      });
    },
    createObservabilityMiddleware<
      TRequiredContext extends object = TContext,
    >(input: ServiceObservabilityMiddlewareInput<TMeta, TRequiredContext>) {
      return createServiceObservabilityMiddleware(options.metadataDefaults, input);
    },
    createAnalyticsMiddleware<
      TRequiredContext extends object = TContext,
    >(input: ServiceAnalyticsMiddlewareInput<TMeta, TRequiredContext>) {
      return createServiceAnalyticsMiddleware(options.metadataDefaults, input);
    },
    createProvider<
      TRequiredContext extends object = {},
    >() {
      return createServiceProviderBuilder<TRequiredContext, TMeta>({
        baseMetadata: options.metadataDefaults,
      });
    },
    createImplementer: createServiceImplementer,
  };
}

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
  createRequiredServiceObservabilityMiddleware,
  createServiceObservabilityMiddleware,
  type RequiredServiceObservabilityMiddleware,
  type RequiredServiceObservabilityMiddlewareInput,
  type ServiceObservabilityMiddlewareInput,
} from "../middleware/observability";
import {
  createRequiredServiceAnalyticsMiddleware,
  createServiceAnalyticsMiddleware,
  type RequiredServiceAnalyticsMiddleware,
  type RequiredServiceAnalyticsMiddlewareInput,
  type ServiceAnalyticsMiddlewareInput,
} from "../middleware/analytics";
import type { BasePolicyProfile } from "../middleware/policy";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

type WithoutProvided<TContext extends object> =
  TContext extends { provided: unknown } ? Omit<TContext, "provided"> : TContext;

type DefineServiceBaselineOptions<TPolicy extends BasePolicyProfile> = {
  policy: TPolicy;
};

type DefineServiceOptions<
  TDeclaration extends ServiceDeclaration,
  TPolicy extends BasePolicyProfile,
> = {
  metadataDefaults: ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>;
  baseline: DefineServiceBaselineOptions<TPolicy>;
};

type RequiredServiceContext<TService extends AnyService> = WithoutProvided<
  ServiceContextFrom<TService>
>;

type RequiredServiceExtensions<
  TService extends AnyService,
> = {
  observability: RequiredServiceObservabilityMiddleware<
    RequiredServiceContext<TService>,
    ServiceMetadataFrom<TService>
  >;
  analytics: RequiredServiceAnalyticsMiddleware<
    RequiredServiceContext<TService>,
    ServiceMetadataFrom<TService>
  >;
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
  createRequiredObservabilityMiddleware(
    input: RequiredServiceObservabilityMiddlewareInput<
      ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>,
      RequiredServiceContext<ServiceTypesOf<TDeclaration>>,
      TPolicy["events"]
    >,
  ): RequiredServiceObservabilityMiddleware<
    RequiredServiceContext<ServiceTypesOf<TDeclaration>>,
    ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>
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
  createRequiredAnalyticsMiddleware(
    input: RequiredServiceAnalyticsMiddlewareInput<
      ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>,
      RequiredServiceContext<ServiceTypesOf<TDeclaration>>
    >,
  ): RequiredServiceAnalyticsMiddleware<
    RequiredServiceContext<ServiceTypesOf<TDeclaration>>,
    ServiceMetadataFrom<ServiceTypesOf<TDeclaration>>
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
      requiredExtensions: RequiredServiceExtensions<ServiceTypesOf<TDeclaration>>,
    ): ImplementerInternalWithMiddlewares<
      TContract,
      ServiceContextFrom<ServiceTypesOf<TDeclaration>>,
      ServiceContextFrom<ServiceTypesOf<TDeclaration>>
    >;
    <const TContract extends AnyContractRouterObject>(
      contract: TContract,
      requiredExtensions: RequiredServiceExtensions<ServiceTypesOf<TDeclaration>>,
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
 * `defineService(...)` binds metadata-aware contract authoring, metadata-aware
 * additive middleware authoring, metadata-aware provider authoring, required
 * service middleware extension builders, and context-typed implementer
 * creation.
 *
 * The declarative service seam is intentionally narrow:
 * - `metadataDefaults` for static procedure metadata
 * - `baseline.policy` for service-wide policy vocabulary
 *
 * Runtime telemetry behavior does not live here. It is authored with the
 * required service middleware extension builders and supplied at
 * `createServiceImplementer(...)`.
 *
 * A required service middleware extension is the enforced runtime pattern for
 * service-authored baseline specialization when SDK-owned baseline middleware
 * cannot be correct without service-specific runtime behavior.
 *
 * @agents
 * If you are changing required service middleware extension architecture, this
 * is the SDK binding seam that controls which builders exist and what
 * `createServiceImplementer` requires. Do not silently widen types here to make
 * mismatches disappear.
 *
 * Warning:
 * do not solve service-binding mismatches here with casts or silent type
 * widening. If a future change needs `as unknown as ...` or similar to make the
 * service seam typecheck, treat that as a design failure and rework the seam
 * instead.
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
  type TRequiredContext = RequiredServiceContext<TService>;

  function createServiceImplementer<const TContract extends AnyContractProcedure>(
    contract: TContract,
    requiredExtensions: RequiredServiceExtensions<TService>,
  ): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
  function createServiceImplementer<const TContract extends AnyContractRouterObject>(
    contract: TContract,
    requiredExtensions: RequiredServiceExtensions<TService>,
  ): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
  function createServiceImplementer(
    contract: AnyContractRouter,
    requiredExtensions: RequiredServiceExtensions<TService>,
  ) {
    if (isContractProcedure(contract)) {
      return createBaseImplementer<AnyContractProcedure, TContext>(contract)
        .use(requiredExtensions.observability)
        .use(requiredExtensions.analytics);
    }

    return createBaseImplementer<AnyContractRouterObject, TContext>(
      contract as AnyContractRouterObject,
    )
      .use(requiredExtensions.observability)
      .use(requiredExtensions.analytics);
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
    createRequiredObservabilityMiddleware(
      input: RequiredServiceObservabilityMiddlewareInput<
        TMeta,
        TRequiredContext,
        TPolicy["events"]
      >,
    ) {
      return createRequiredServiceObservabilityMiddleware(
        options.metadataDefaults,
        input,
        options.baseline.policy.events,
      );
    },
    createAnalyticsMiddleware<
      TRequiredContext extends object = TContext,
    >(input: ServiceAnalyticsMiddlewareInput<TMeta, TRequiredContext>) {
      return createServiceAnalyticsMiddleware(options.metadataDefaults, input);
    },
    createRequiredAnalyticsMiddleware(
      input: RequiredServiceAnalyticsMiddlewareInput<TMeta, TRequiredContext>,
    ) {
      return createRequiredServiceAnalyticsMiddleware(options.metadataDefaults, input);
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

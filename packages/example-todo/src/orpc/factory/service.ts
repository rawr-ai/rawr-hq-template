import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import type {
  BaseContext,
  BaseDeps,
  BaseMetadata,
  ServiceContextOf,
  ServiceDepsOf,
  ServiceMetadataOf,
} from "../base";
import { createBaseImplementer } from "../base";
import { createContractBuilder } from "./contract";
import { createNormalMiddlewareBuilder, createServiceProviderBuilder } from "./middleware";
import {
  createServiceObservabilityMiddleware,
  createServiceObservabilityBaselineMiddleware,
  defineServiceObservabilityProfile,
  type ServiceObservabilityMiddlewareInput,
  type ServiceObservabilityProfile,
} from "../middleware/observability";
import {
  createServiceAnalyticsMiddleware,
  createServiceAnalyticsBaselineMiddleware,
  defineServiceAnalyticsProfile,
  type ServiceAnalyticsMiddlewareInput,
  type ServiceAnalyticsProfile,
} from "../middleware/analytics";
import type { BasePolicyProfile } from "../middleware/policy";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

type ServiceKitInput = {
  deps: object;
  scope: object;
  config: object;
  invocation: object;
  metadata: object;
};

declare const serviceKitBrand: unique symbol;

type ComposeServiceDeps<TInput extends ServiceKitInput> = ServiceDepsOf<TInput["deps"]>;
type ComposeServiceMetadata<TInput extends ServiceKitInput> = ServiceMetadataOf<TInput["metadata"]>;
type ComposeServiceContext<TInput extends ServiceKitInput> = ServiceContextOf<
  ComposeServiceDeps<TInput>,
  TInput["scope"],
  TInput["config"],
  TInput["invocation"]
>;

export type ServiceKit<
  TInput extends ServiceKitInput,
> = {
  readonly [serviceKitBrand]: TInput;
  defineObservability(
    profile: ServiceObservabilityProfile<
      ComposeServiceMetadata<TInput>,
      ComposeServiceContext<TInput>,
      BasePolicyProfile
    >,
  ): ServiceObservabilityProfile<
    ComposeServiceMetadata<TInput>,
    ComposeServiceContext<TInput>,
    BasePolicyProfile
  >;
  defineAnalytics(
    profile: ServiceAnalyticsProfile<
      ComposeServiceMetadata<TInput>,
      ComposeServiceContext<TInput>
    >,
  ): ServiceAnalyticsProfile<
    ComposeServiceMetadata<TInput>,
    ComposeServiceContext<TInput>
  >;
  definePolicy<TPolicy extends BasePolicyProfile>(
    profile: TPolicy,
  ): TPolicy;
};

export type AnyServiceKit = {
  readonly [serviceKitBrand]: ServiceKitInput;
};

export type ServiceKitDeps<TKit extends AnyServiceKit> =
  TKit extends { readonly [serviceKitBrand]: infer TInput extends ServiceKitInput }
    ? ComposeServiceDeps<TInput>
    : never;
export type ServiceKitScope<TKit extends AnyServiceKit> =
  TKit extends { readonly [serviceKitBrand]: infer TInput extends ServiceKitInput }
    ? TInput["scope"]
    : never;
export type ServiceKitConfig<TKit extends AnyServiceKit> =
  TKit extends { readonly [serviceKitBrand]: infer TInput extends ServiceKitInput }
    ? TInput["config"]
    : never;
export type ServiceKitInvocation<TKit extends AnyServiceKit> =
  TKit extends { readonly [serviceKitBrand]: infer TInput extends ServiceKitInput }
    ? TInput["invocation"]
    : never;
export type ServiceKitMetadata<TKit extends AnyServiceKit> =
  TKit extends { readonly [serviceKitBrand]: infer TInput extends ServiceKitInput }
    ? ComposeServiceMetadata<TInput>
    : never;
export type ServiceKitContext<TKit extends AnyServiceKit> =
  TKit extends { readonly [serviceKitBrand]: infer TInput extends ServiceKitInput }
    ? ComposeServiceContext<TInput>
    : never;

type DefineServiceBaseOptions<TInput extends ServiceKitInput> = {
  analytics: ServiceAnalyticsProfile<ComposeServiceMetadata<TInput>, ComposeServiceContext<TInput>>;
  observability: ServiceObservabilityProfile<
    ComposeServiceMetadata<TInput>,
    ComposeServiceContext<TInput>,
    BasePolicyProfile
  >;
  policy: BasePolicyProfile;
};

type DefineServiceOptions<TInput extends ServiceKitInput> = {
  kit: ServiceKit<TInput>;
  metadata: ComposeServiceMetadata<TInput>;
  base: DefineServiceBaseOptions<TInput>;
};

/**
 * Create the single service-type declaration kit for a domain package.
 *
 * @remarks
 * Service code should declare deps/scope/config/invocation/metadata once here.
 * The kit keeps helper-based composition (`ServiceDepsOf`, `ServiceMetadataOf`,
 * `ServiceContextOf`) internal so user-facing service code does not have to
 * manually spell those helpers everywhere.
 */
export function createServiceKit<
  TInput extends ServiceKitInput,
>() {
  return {
    defineObservability(
      profile: ServiceObservabilityProfile<
        ComposeServiceMetadata<TInput>,
        ComposeServiceContext<TInput>,
        BasePolicyProfile
      >,
    ) {
      return defineServiceObservabilityProfile<
        ComposeServiceMetadata<TInput>,
        ComposeServiceContext<TInput>,
        BasePolicyProfile
      >(profile);
    },
    defineAnalytics(
      profile: ServiceAnalyticsProfile<
        ComposeServiceMetadata<TInput>,
        ComposeServiceContext<TInput>
      >,
    ) {
      return defineServiceAnalyticsProfile<
        ComposeServiceMetadata<TInput>,
        ComposeServiceContext<TInput>
      >(profile);
    },
    definePolicy<TPolicy extends BasePolicyProfile>(profile: TPolicy) {
      return profile;
    },
  } as ServiceKit<TInput>;
}

/**
 * Bind the service-local authoring surfaces once.
 *
 * @remarks
 * `defineService(...)` is the high-level seam consumed by
 * `src/service/base/index.ts`.
 * It binds metadata-aware contract authoring, metadata-aware service middleware
 * authoring, metadata-aware service-provider authoring, and context-typed
 * implementer creation. The `base` option is the service assembly manifest for
 * baseline cross-cutting concern profiles.
 */
export function defineService<
  TInput extends ServiceKitInput,
>(
  options: DefineServiceOptions<TInput>,
) {
  type TMeta = ComposeServiceMetadata<TInput>;
  type TContext = ComposeServiceContext<TInput>;

  function createServiceImplementer<const TContract extends AnyContractProcedure>(
    contract: TContract,
  ): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
  function createServiceImplementer<const TContract extends AnyContractRouterObject>(
    contract: TContract,
  ): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
  function createServiceImplementer(contract: AnyContractRouter) {
    const serviceObservability = createServiceObservabilityBaselineMiddleware(
      options.metadata,
      options.base.observability,
      options.base.policy,
    );
    const serviceAnalytics = createServiceAnalyticsBaselineMiddleware(
      options.metadata,
      options.base.analytics,
    );

    if (isContractProcedure(contract)) {
      return createBaseImplementer<AnyContractProcedure, TContext>(contract)
        .use(serviceObservability as never)
        .use(serviceAnalytics as never);
    }

    return createBaseImplementer<AnyContractRouterObject, TContext>(
      contract as AnyContractRouterObject,
    )
      .use(serviceObservability as never)
      .use(serviceAnalytics as never);
  }

  return {
    oc: createContractBuilder<TMeta>({ baseMetadata: options.metadata }),
    createMiddleware<
      TRequiredContext extends object = {},
    >() {
      return createNormalMiddlewareBuilder<TRequiredContext, TMeta>({
        baseMetadata: options.metadata,
      });
    },
    createObservabilityMiddleware<
      TRequiredContext extends object = TContext,
    >(input: ServiceObservabilityMiddlewareInput<TMeta, TRequiredContext>) {
      return createServiceObservabilityMiddleware(options.metadata, input);
    },
    createAnalyticsMiddleware<
      TRequiredContext extends object = TContext,
    >(input: ServiceAnalyticsMiddlewareInput<TMeta, TRequiredContext>) {
      return createServiceAnalyticsMiddleware(options.metadata, input);
    },
    createProvider<
      TRequiredContext extends object = {},
    >() {
      return createServiceProviderBuilder<TRequiredContext, TMeta>({
        baseMetadata: options.metadata,
      });
    },
    createImplementer: createServiceImplementer,
  };
}

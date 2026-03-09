import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import type { BaseContext, BaseDeps, BaseMetadata } from "../base";
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

type DefineServiceBaseOptions<
  TMeta extends BaseMetadata,
  TContext extends BaseContext<BaseDeps, object, object, object>,
> = {
  analytics: ServiceAnalyticsProfile<TMeta, TContext>;
  observability: ServiceObservabilityProfile<TMeta, TContext, BasePolicyProfile>;
  policy: BasePolicyProfile;
};

type DefineServiceOptions<
  TMeta extends BaseMetadata,
  TContext extends BaseContext<BaseDeps, object, object, object>,
> = {
  metadata: TMeta;
  base: DefineServiceBaseOptions<TMeta, TContext>;
};

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
  TMeta extends BaseMetadata,
  TContext extends BaseContext<BaseDeps, object, object, object>,
>(
  options: DefineServiceOptions<TMeta, TContext>,
) {
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
    oc: createContractBuilder<TMeta>({ baseMetadata: options.metadata }),
    createMiddleware<
      TRequiredContext extends object = {},
    >() {
      return createNormalMiddlewareBuilder<TRequiredContext, TMeta>({
        baseMetadata: options.metadata,
      });
    },
    createObservabilityMiddleware<
      TRequiredContext extends {
        deps: {
          logger: BaseDeps["logger"];
        };
      } = TContext,
    >(input: ServiceObservabilityMiddlewareInput<TMeta, TRequiredContext>) {
      return createServiceObservabilityMiddleware(options.metadata, input);
    },
    createAnalyticsMiddleware<
      TRequiredContext extends {
        deps: {
          analytics: BaseDeps["analytics"];
        };
      } = TContext,
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

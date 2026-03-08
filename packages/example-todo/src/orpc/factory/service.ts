import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import type { BaseContext, BaseDeps, BaseAssemblyOptions, BaseMetadata } from "../base";
import { createBaseImplementer } from "../base";
import { createContractBuilder } from "./contract";
import { createNormalMiddlewareBuilder, createServiceProviderBuilder } from "./middleware";
import {
  createServiceObservabilityMiddleware,
  type BaseObservabilityProfile,
} from "../middleware/observability";
import type { BasePolicyProfile } from "../middleware/policy";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

type DefineServiceBaseOptions<
  TMeta extends BaseMetadata,
  TContext extends BaseContext<BaseDeps, object, object, object>,
> = BaseAssemblyOptions & {
  observability: BaseObservabilityProfile<TMeta, TContext, BasePolicyProfile>;
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
    const serviceObservability = createServiceObservabilityMiddleware(
      options.metadata,
      options.base.observability,
      options.base.policy,
    );

    if (isContractProcedure(contract)) {
      return createBaseImplementer<AnyContractProcedure, TContext>(
        contract,
        {
          analytics: options.base.analytics,
        },
      ).use(serviceObservability);
    }

    return createBaseImplementer<AnyContractRouterObject, TContext>(
      contract as AnyContractRouterObject,
      {
        analytics: options.base.analytics,
      },
    ).use(serviceObservability);
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

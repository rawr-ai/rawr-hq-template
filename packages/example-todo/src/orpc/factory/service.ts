import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import type { BaseContext, BaseDeps, BaseImplementerOptions, BaseMetadata } from "../base";
import { createBaseImplementer } from "../base";
import { createContractBuilder } from "./contract";
import { createMiddlewareBuilder } from "./middleware";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

type DefineServiceOptions<TMeta extends BaseMetadata> = {
  metadata: TMeta;
  implementer: BaseImplementerOptions;
};

/**
 * Bind the service-local authoring surfaces once.
 *
 * @remarks
 * `defineService(...)` is the high-level seam consumed by `src/service/base.ts`.
 * It binds metadata-aware contract authoring, metadata-aware service middleware
 * authoring, and context-typed implementer creation.
 */
export function defineService<
  TMeta extends BaseMetadata,
  TContext extends BaseContext<BaseDeps>,
>(
  options: DefineServiceOptions<TMeta>,
) {
  function createServiceImplementer<const TContract extends AnyContractProcedure>(
    contract: TContract,
  ): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
  function createServiceImplementer<const TContract extends AnyContractRouterObject>(
    contract: TContract,
  ): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
  function createServiceImplementer(contract: AnyContractRouter) {
    if (isContractProcedure(contract)) {
      return createBaseImplementer<AnyContractProcedure, TContext>(
        contract,
        options.implementer,
      );
    }

    return createBaseImplementer<AnyContractRouterObject, TContext>(
      contract as AnyContractRouterObject,
      options.implementer,
    );
  }

  return {
    oc: createContractBuilder<TMeta>({ baseMetadata: options.metadata }),
    createMiddleware<
      TRequiredContext extends { deps: object } = { deps: {} },
    >() {
      return createMiddlewareBuilder<TRequiredContext, TMeta>({
        baseMetadata: options.metadata,
      });
    },
    createImplementer: createServiceImplementer,
  };
}

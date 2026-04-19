import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import { implement } from "@orpc/server";
import type { Context } from "@orpc/server";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import type { ExecutionContext } from "../context/types";
import type { BaseDeps } from "../baseline/types";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

/**
 * Create a bare procedure implementer with only context binding.
 */
export function createBareProcedureImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(contract: TContract) {
  return implement(contract).$context<TContext>();
}

/**
 * Create a bare router implementer with only context binding.
 */
export function createBareRouterImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(contract: TContract) {
  return implement(contract).$context<TContext>();
}

/**
 * Create a typed router implementer for non-service plugin/app shells.
 */
export function createContextualRouterBuilder<
  const TContract extends AnyContractRouterObject,
  TContext extends Context,
>(contract: TContract) {
  return implement(contract).$context<TContext>();
}

export function createBareImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(contract: TContract): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBareImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(contract: TContract): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBareImplementer<
  const TContract extends AnyContractProcedure | AnyContractRouterObject,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(contract: TContract) {
  if (isContractProcedure(contract)) {
    return createBareProcedureImplementer<
      Extract<TContract, AnyContractProcedure>,
      TContext
    >(contract as Extract<TContract, AnyContractProcedure>);
  }

  return createBareRouterImplementer<
    Extract<TContract, AnyContractRouterObject>,
    TContext
  >(contract as Extract<TContract, AnyContractRouterObject>);
}

import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import { createBaseAnalyticsMiddleware } from "../middleware/analytics";
import { createBaseObservabilityMiddleware } from "../middleware/observability";
import {
  createBareProcedureImplementer,
  createBareRouterImplementer,
} from "../factory/implementer";
import type { ExecutionContext } from "../context/types";
import type { BaseDeps } from "./types";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

/**
 * Create the central domain-package implementer tree with guaranteed framework
 * baseline middleware.
 */
export function createBaseProcedureImplementer<
 const TContract extends AnyContractProcedure,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
) {
  return createBareProcedureImplementer<TContract, TContext>(contract)
    .use(createBaseObservabilityMiddleware())
    .use(createBaseAnalyticsMiddleware());
}

/**
 * Create the central domain-package router implementer tree with guaranteed
 * framework baseline middleware.
 */
export function createBaseRouterImplementer<
 const TContract extends AnyContractRouterObject,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
) {
  return createBareRouterImplementer<TContract, TContext>(contract)
    .use(createBaseObservabilityMiddleware())
    .use(createBaseAnalyticsMiddleware());
}

export function createBaseImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBaseImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBaseImplementer(
  contract: AnyContractRouter,
) {
  if (isContractProcedure(contract)) {
    return createBaseProcedureImplementer(contract);
  }

  return createBaseRouterImplementer(contract as AnyContractRouterObject);
}

import type { AnyContractRouter } from "@orpc/contract";
import type { AnyRouter } from "@orpc/server";

export type AnyContractRouterObject = {
  [key: string]: AnyContractRouter;
};

export type AnyProcedureRouterObject = {
  [key: string]: AnyRouter;
};

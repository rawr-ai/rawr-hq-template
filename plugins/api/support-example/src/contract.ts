import { minifyContractRouter, type AnyContractRouter } from "@orpc/contract";
import { supportExampleApiRouter } from "./router";

export const supportExampleApiContract = minifyContractRouter(
  supportExampleApiRouter as unknown as AnyContractRouter,
) as typeof supportExampleApiRouter;

export type SupportExampleApiContract = typeof supportExampleApiContract;

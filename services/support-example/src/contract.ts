import { minifyContractRouter, type AnyContractRouter } from "@orpc/contract";
import { supportExampleRouter } from "./router";

export const supportExampleContract = minifyContractRouter(
  supportExampleRouter as unknown as AnyContractRouter,
) as typeof supportExampleRouter;

export type SupportExampleContract = typeof supportExampleContract;

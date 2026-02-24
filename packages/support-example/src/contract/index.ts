import { oc } from "@orpc/contract";
import { triageContract } from "./triage";

export const supportExampleContract = oc.router({
  triage: triageContract,
});

export type SupportExampleContract = typeof supportExampleContract;

export { supportExampleContractErrorMap, throwSupportExampleDomainErrorAsContractError } from "./errors";

import { oc } from "@orpc/contract";
import {
  completeItemContract,
  getItemContract,
  listItemsContract,
  requestItemContract,
  startItemContract,
} from "./triage";

export const supportExampleContract = oc.router({
  triage: oc.router({
    items: oc.router({
      request: requestItemContract,
      list: listItemsContract,
      get: getItemContract,
      start: startItemContract,
      complete: completeItemContract,
    }),
  }),
});

export type SupportExampleContract = typeof supportExampleContract;

export { supportExampleContractErrorMap } from "./errors";

import { oc } from "@orpc/contract";
import {
  completeItemContract,
  getItemContract,
  listItemsContract,
  requestItemContract,
  startItemContract,
} from "./triage";

export const supportExampleContract = oc.router({
  triage: {
    items: {
      request: requestItemContract,
      list: listItemsContract,
      get: getItemContract,
      start: startItemContract,
      complete: completeItemContract,
    },
  },
});

export type SupportExampleContract = typeof supportExampleContract;

export { supportExampleContractErrorMap } from "./errors";

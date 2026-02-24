import { oc } from "@orpc/contract";
import { completeItemContract } from "./complete";
import { getItemContract } from "./get";
import { listItemsContract } from "./list";
import { requestItemContract } from "./request";
import { startItemContract } from "./start";

export const itemsContract = oc.router({
  request: requestItemContract,
  list: listItemsContract,
  get: getItemContract,
  start: startItemContract,
  complete: completeItemContract,
});

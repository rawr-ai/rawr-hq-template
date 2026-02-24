import { oc } from "@orpc/contract";
import { itemsContract } from "./items";

export const triageContract = oc.router({
  items: itemsContract,
});

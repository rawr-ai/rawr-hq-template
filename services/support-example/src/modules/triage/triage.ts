import {
  completeItemProcedure,
  getItemProcedure,
  listItemsProcedure,
  requestItemProcedure,
  startItemProcedure,
} from "./items";

export const triageRouter = {
  items: {
    request: requestItemProcedure,
    list: listItemsProcedure,
    get: getItemProcedure,
    start: startItemProcedure,
    complete: completeItemProcedure,
  },
} as const;

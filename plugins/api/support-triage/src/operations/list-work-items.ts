import { os } from "../orpc";

export const listWorkItems = os.supportTriage.listWorkItems.handler(async ({ context, input }) => {
  return context.supportTriage.listWorkItems(input);
});

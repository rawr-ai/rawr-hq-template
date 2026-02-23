import { os } from "../orpc";

export const getWorkItem = os.supportTriage.getWorkItem.handler(async ({ context, input }) => {
  return context.supportTriage.getWorkItem(input);
});

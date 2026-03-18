import { os } from "../orpc";

export const completeWorkItem = os.supportTriage.completeWorkItem.handler(async ({ context, input }) => {
  return context.supportTriage.completeWorkItem(input);
});

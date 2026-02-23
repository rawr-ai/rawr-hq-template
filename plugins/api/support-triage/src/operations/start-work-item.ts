import { os } from "../orpc";

export const startWorkItem = os.supportTriage.startWorkItem.handler(async ({ context, input }) => {
  return context.supportTriage.startWorkItem(input);
});

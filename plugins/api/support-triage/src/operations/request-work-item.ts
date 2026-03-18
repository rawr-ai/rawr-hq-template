import { os } from "../orpc";

export const requestWorkItem = os.supportTriage.requestWorkItem.handler(async ({ context, input }) => {
  return context.supportTriage.requestWorkItem(input);
});

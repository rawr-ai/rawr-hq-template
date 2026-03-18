import { os } from "../orpc";

export const requestWorkItem = os.supportExample.requestWorkItem.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.request(input);
});

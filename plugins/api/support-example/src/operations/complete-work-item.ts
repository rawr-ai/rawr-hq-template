import { os } from "../orpc";

export const completeWorkItem = os.supportExample.completeWorkItem.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.complete(input);
});

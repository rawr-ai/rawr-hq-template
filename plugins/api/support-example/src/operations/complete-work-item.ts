import { os } from "../orpc";

export const completeWorkItem = os.supportExample.triage.items.complete.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.complete(input);
});

import { os } from "../../../orpc";

export const completeWorkItem = os.triage.items.complete.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.complete(input);
});

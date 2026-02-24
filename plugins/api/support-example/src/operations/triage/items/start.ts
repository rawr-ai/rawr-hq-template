import { os } from "../../../orpc";

export const startWorkItem = os.triage.items.start.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.start(input);
});

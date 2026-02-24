import { os } from "../orpc";

export const startWorkItem = os.supportExample.startWorkItem.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.start(input);
});

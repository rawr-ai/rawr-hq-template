import { os } from "../orpc";

export const getWorkItem = os.supportExample.getWorkItem.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.get(input);
});

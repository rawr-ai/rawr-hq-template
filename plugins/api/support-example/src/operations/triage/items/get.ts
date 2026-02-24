import { os } from "../../../orpc";

export const getWorkItem = os.supportExample.triage.items.get.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.get(input);
});

import { os } from "../../../orpc";

export const listWorkItems = os.supportExample.triage.items.list.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.list(input);
});

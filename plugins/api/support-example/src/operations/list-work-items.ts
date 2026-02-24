import { os } from "../orpc";

export const listWorkItems = os.supportExample.listWorkItems.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.list(input);
});

import { os } from "../../../orpc";

export const listWorkItems = os.triage.items.list.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.list(input);
});

import { os } from "../orpc";

export const requestWorkItem = os.supportExample.triage.items.request.handler(async ({ context, input }) => {
  return context.supportExample.triage.items.request(input);
});

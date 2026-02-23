import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const startWorkItem = os.supportTriage.startWorkItem.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).startWorkItem(input);
});

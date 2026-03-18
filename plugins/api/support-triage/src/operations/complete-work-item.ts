import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const completeWorkItem = os.supportTriage.completeWorkItem.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).completeWorkItem(input);
});

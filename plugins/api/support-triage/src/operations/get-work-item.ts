import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const getWorkItem = os.supportTriage.getWorkItem.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).getWorkItem(input);
});

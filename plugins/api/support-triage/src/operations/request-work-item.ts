import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const requestWorkItem = os.supportTriage.requestWorkItem.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).requestWorkItem(input);
});

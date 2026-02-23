import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const listWorkItems = os.supportTriage.listWorkItems.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).listWorkItems(input);
});

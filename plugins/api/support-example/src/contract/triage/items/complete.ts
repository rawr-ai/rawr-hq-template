import { supportExampleContract } from "@rawr/support-example/contract";
import { withApiRoute } from "../../procedure-route";

const supportExampleTag = ["support-example"] as const;

export const completeWorkItemApiContract = withApiRoute(supportExampleContract.triage.items.complete, {
  method: "POST",
  path: "/support-example/triage/work-items/{workItemId}/complete",
  tags: supportExampleTag,
  summary: "Complete triage work item",
  description: "Finalizes a running triage work item with triage metrics.",
  operationId: "supportExampleCompleteWorkItem",
});

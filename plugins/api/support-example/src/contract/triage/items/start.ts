import { supportExampleContract } from "@rawr/support-example/contract";
import { withApiRoute } from "../../procedure-route";

const supportExampleTag = ["support-example"] as const;

export const startWorkItemApiContract = withApiRoute(supportExampleContract.triage.items.start, {
  method: "POST",
  path: "/support-example/triage/work-items/{workItemId}/start",
  tags: supportExampleTag,
  summary: "Start triage work item",
  description: "Transitions a queued triage work item into running state.",
  operationId: "supportExampleStartWorkItem",
});

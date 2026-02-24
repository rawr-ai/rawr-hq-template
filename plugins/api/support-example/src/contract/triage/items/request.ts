import { supportExampleContract } from "@rawr/support-example/contract";
import { withApiRoute } from "../../procedure-route";

const supportExampleTag = ["support-example"] as const;

export const requestWorkItemApiContract = withApiRoute(supportExampleContract.triage.items.request, {
  method: "POST",
  path: "/support-example/triage/work-items",
  tags: supportExampleTag,
  summary: "Queue triage work item",
  description: "Creates a queue-scoped triage work item lifecycle record in queued state.",
  operationId: "supportExampleRequestWorkItem",
});

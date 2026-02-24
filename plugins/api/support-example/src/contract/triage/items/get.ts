import { supportExampleContract } from "@rawr/support-example/contract";
import { withApiRoute } from "../../procedure-route";

const supportExampleTag = ["support-example"] as const;

export const getWorkItemApiContract = withApiRoute(supportExampleContract.triage.items.get, {
  method: "GET",
  path: "/support-example/triage/work-items/{workItemId}",
  tags: supportExampleTag,
  summary: "Get triage work item",
  description: "Fetches one triage work item lifecycle record by stable identifier.",
  operationId: "supportExampleGetWorkItem",
});

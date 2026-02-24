import { supportExampleContract } from "@rawr/support-example/contract";
import { withApiRoute } from "../../procedure-route";

const supportExampleTag = ["support-example"] as const;

export const listWorkItemsApiContract = withApiRoute(supportExampleContract.triage.items.list, {
  method: "GET",
  path: "/support-example/triage/work-items",
  tags: supportExampleTag,
  summary: "List triage work items",
  description: "Returns queue-scoped triage work items, optionally filtered by lifecycle status.",
  operationId: "supportExampleListWorkItems",
});

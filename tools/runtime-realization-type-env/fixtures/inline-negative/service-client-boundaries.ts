import type { ConstructionBoundServiceClients } from "@rawr/sdk/service";
import { WorkItemsServerApiServices } from "../../scenarios/work-items/server-api-plugin";

const clients = undefined as unknown as ConstructionBoundServiceClients<
  typeof WorkItemsServerApiServices
>;

// @ts-expect-error construction-bound clients cannot call procedures before withInvocation(...).
clients.workItems.items.create({
  title: "No invocation",
});

const invocationBound = clients.workItems.withInvocation({
  invocation: {
    traceId: "trace-1",
  },
});

invocationBound.items.create({
  title: "With invocation",
});

import { defineServerApiPlugin } from "@rawr/sdk/plugins/server";
import { useService } from "@rawr/sdk/service";
import {
  WorkItemsService,
  type CreateWorkItemInput,
  type WorkItem,
} from "./work-items-service";

export const WorkItemsServerApiServices = {
  workItems: useService(WorkItemsService),
} as const;

export const WorkItemsServerApiPlugin = defineServerApiPlugin({
  id: "work-items.public-api",
  services: WorkItemsServerApiServices,
  routes: (api) => ({
    create: api.route<CreateWorkItemInput, WorkItem>().effect(function* ({
      input,
      context,
      execution,
    }) {
      const workItems = context.clients.workItems.withInvocation({
        invocation: {
          traceId: execution.traceId,
        },
      });

      return yield* workItems.items.create(input);
    }),
  }),
});

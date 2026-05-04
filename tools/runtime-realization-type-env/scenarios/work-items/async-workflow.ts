import {
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineWorkflow,
  stepEffect,
  type AsyncStepBridgeInput,
} from "@rawr/sdk/plugins/async";
import { useService } from "@rawr/sdk/service";
import { WorkItemNotFound, WorkItemsService } from "./work-items-service";

export interface WorkItemsSyncEvent {
  readonly itemId: string;
  readonly requestedBy: string;
}

export const WorkItemsAsyncServices = {
  workItems: useService(WorkItemsService),
} as const;

export const SyncWorkItemStep = defineAsyncStepEffect<
  { readonly skipped: true } | { readonly synced: true },
  WorkItemNotFound,
  never,
  typeof WorkItemsAsyncServices,
  WorkItemsSyncEvent
>({
  id: "sync-work-item",
  effect: function* ({ event, clients }) {
    const item = yield* clients.workItems.items.get({
      id: event.data.itemId,
    });

    if (item.status === "done") {
      return { skipped: true as const };
    }

    return yield* clients.workItems.items.sync({
      id: event.data.itemId,
      requestedBy: event.data.requestedBy,
    });
  },
});

export const WorkItemsSyncWorkflow = defineWorkflow({
  kind: "async.workflow",
  id: "work-items.sync",
  async run(
    ctx: AsyncStepBridgeInput<typeof WorkItemsAsyncServices, WorkItemsSyncEvent>,
  ) {
    return stepEffect(ctx).run(SyncWorkItemStep);
  },
});

export const WorkItemsAsyncPlugin = defineAsyncWorkflowPlugin({
  kind: "plugin.async-workflow",
  id: "work-items.async",
  workflows: [WorkItemsSyncWorkflow],
});

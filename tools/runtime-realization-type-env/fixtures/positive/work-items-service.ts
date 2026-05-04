import { Effect, TaggedError } from "@rawr/sdk/effect";
import {
  defineService,
  implementService,
  serviceProcedure,
} from "@rawr/sdk/service";

export interface WorkItem {
  readonly id: string;
  readonly title: string;
  readonly status: "open" | "done";
}

export interface CreateWorkItemInput {
  readonly title: string;
  readonly description?: string;
}

export interface SyncWorkItemInput {
  readonly id: string;
  readonly requestedBy: string;
}

export class WorkItemNotFound extends TaggedError("WorkItemNotFound")<{
  readonly id: string;
}> {}

export const WorkItemsService = defineService({
  id: "work-items",
  modules: {
    items: {
      get: serviceProcedure<{ readonly id: string }, WorkItem, WorkItemNotFound>(),
      create: serviceProcedure<CreateWorkItemInput, WorkItem>(),
      sync: serviceProcedure<SyncWorkItemInput, { readonly synced: true }>(),
    },
  },
});

export const WorkItemsServiceUses = {
  workItems: {
    kind: "service.use",
    service: WorkItemsService,
  },
} as const;

const service = implementService(WorkItemsService);

export const GetWorkItemDescriptor = service.items.get.effect(function* ({ input }) {
  if (input.id === "missing") {
    return yield* Effect.fail(new WorkItemNotFound({ id: input.id }));
  }

  return {
    id: input.id,
    title: "Fixture item",
    status: "open" as const,
  };
});

import {
  defineServerApiPlugin,
  type ServerApiPlugin,
} from "@rawr/hq-sdk/plugins";
import type { ExampleTodoClientResolver } from "./context";
import { exampleTodoApiContract } from "./contract";
import { createExampleTodoApiRouter } from "./router";

export type ExampleTodoApiPluginBound = Readonly<{
  resolveClient: ExampleTodoClientResolver;
}>;

export const exampleTodoApiPlugin = defineServerApiPlugin<"example-todo", ExampleTodoApiPluginBound, { resolveClient: ExampleTodoClientResolver }, typeof exampleTodoApiContract, ReturnType<typeof createExampleTodoApiRouter>>({
  capability: "example-todo",
  exposure: {
    internal: {
      contract: exampleTodoApiContract,
    },
    published: {
      contract: exampleTodoApiContract,
    },
  },
  resources({ bound }) {
    return {
      resolveClient: bound.resolveClient,
    } as const;
  },
  routes({ resources, exposure }) {
    const internal = {
      contract: exposure.internal.contract,
      router: createExampleTodoApiRouter(resources.resolveClient),
    } as const;

    return {
      internal,
      published: internal,
    };
  },
});

export type ExampleTodoApiPluginRegistration = ServerApiPlugin<
  "example-todo",
  typeof exampleTodoApiContract,
  ReturnType<typeof createExampleTodoApiRouter>,
  ExampleTodoApiPluginBound
>;

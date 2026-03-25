import {
  defineApiPlugin,
  defineApiPluginDeclaration,
  type ApiPluginContribution,
} from "@rawr/hq-sdk/apis";
import type { ExampleTodoClientResolver } from "./context";
import { exampleTodoApiContract } from "./contract";
import { createExampleTodoApiRouter } from "./router";

export {
  type ExampleTodoApiContext,
  type ExampleTodoClientResolver,
} from "./context";
export { createExampleTodoApiRouter, type ExampleTodoApiRouter } from "./router";

export type ExampleTodoApiPluginBound = Readonly<{
  resolveClient: ExampleTodoClientResolver;
}>;

const exampleTodoApiDeclaration = defineApiPluginDeclaration({
  internal: {
    contract: exampleTodoApiContract,
  },
  published: {
    contract: exampleTodoApiContract,
  },
});

function contributeExampleTodoApiPlugin(
  bound: ExampleTodoApiPluginBound,
): ApiPluginContribution<typeof exampleTodoApiContract, ReturnType<typeof createExampleTodoApiRouter>> {
  const internal = {
    contract: exampleTodoApiDeclaration.internal.contract,
    router: createExampleTodoApiRouter(bound.resolveClient),
  } as const;

  return {
    internal,
    published: internal,
  };
}

export function registerExampleTodoApiPlugin(input: ExampleTodoApiPluginBound) {
  const contribution = contributeExampleTodoApiPlugin(input);

  return defineApiPlugin({
    declaration: exampleTodoApiDeclaration,
    contribute: contributeExampleTodoApiPlugin,
    ...contribution,
  });
}

export type ExampleTodoApiPluginRegistration = ReturnType<typeof registerExampleTodoApiPlugin>;

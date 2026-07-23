/** Publishes Example Todo API operations from the sealed service contract. */
import {
  type ApiPluginContribution,
  defineApiPlugin,
  defineApiPluginDeclaration,
} from "@rawr/hq-sdk/apis";
import type { ClientResolver } from "./service/base";
import { contract } from "./service/contract";
import { router } from "./service/router";

/** Host-owned capability required to bind the Example Todo API contribution. */
export type ExampleTodoApiPluginBound = Readonly<{
  resolveClient: ClientResolver;
}>;

const exampleTodoApiDeclaration = defineApiPluginDeclaration({
  internal: {
    contract,
  },
  published: {
    contract,
  },
});

function contributeExampleTodoApiPlugin(
  bound: ExampleTodoApiPluginBound
): ApiPluginContribution<typeof contract, ReturnType<typeof router>> {
  const internal = {
    contract: exampleTodoApiDeclaration.internal.contract,
    router: router(bound.resolveClient),
  } as const;

  return {
    internal,
    published: internal,
  };
}

/** Declares the Example Todo API plugin for later host-owned dependency binding. */
export function registerExampleTodoApiPlugin() {
  return defineApiPlugin({
    declaration: exampleTodoApiDeclaration,
    contribute: contributeExampleTodoApiPlugin,
  });
}

/** Registration type consumed by the application host's plugin declaration seam. */
export type ExampleTodoApiPluginRegistration = ReturnType<typeof registerExampleTodoApiPlugin>;

export { contract };

/** Publishes Example Todo API operations from the sealed service contract. */
import { defineApiPlugin, defineApiPluginDeclaration } from "@habitat-ai/rawr-hq-sdk/apis";
import { contract } from "./service/contract";
import { router } from "./service/router";

const exampleTodoApiDeclaration = defineApiPluginDeclaration({
  internal: {
    contract,
  },
  published: {
    contract,
  },
});

const internal = {
  contract: exampleTodoApiDeclaration.internal.contract,
  router,
} as const;

/** Registers the complete static API contribution for host composition. */
export function registerExampleTodoApiPlugin() {
  const registration = defineApiPlugin({
    declaration: exampleTodoApiDeclaration,
  });

  return {
    ...registration,
    internal,
    published: internal,
  } as const;
}

/** Registration type consumed by the application host's plugin declaration seam. */
export type ExampleTodoApiPluginRegistration = ReturnType<typeof registerExampleTodoApiPlugin>;
export type { Context as ExampleTodoApiContext } from "./service/base";

export { contract };

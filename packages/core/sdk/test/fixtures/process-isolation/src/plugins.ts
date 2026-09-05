import { defineAsyncWorkflowPlugin, defineWorkflow } from "@habitat-ai/sdk/plugins/async";
import {
  type AsyncStepExecutionContext,
  defineAsyncStepEffect,
  stepEffect,
} from "@habitat-ai/sdk/plugins/async/effect";
import { defineServerApiPlugin, type ServerPluginContext } from "@habitat-ai/sdk/plugins/server";
import "@habitat-ai/sdk/plugins/server/effect";
import type { RuntimeResourceMap } from "@habitat-ai/sdk/runtime/providers";
import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";
import { standard } from "@habitat-ai/sdk/service/schema";
import { openapi } from "@orpc/openapi";
import { os } from "@orpc/server";
import { type Static, Type } from "typebox";
import { operationSchema, performOperation, state } from "./control.js";
import { clientRequirement, fileRequirement } from "./resources.js";

const resultSchema = standard(
  Type.Object({ key: Type.String(), token: Type.String(), pid: Type.Number() })
);
const server = os.$context<ServerPluginContext<{}>>();
export const apiPlugin = defineServerApiPlugin.factory()({
  capability: "isolation",
  services: {},
  resourceRequirements: [fileRequirement],
  routeBase: "/api",
  api: () => ({
    probe: server
      .meta(openapi({ method: "POST", path: "/probe" }))
      .input(standard(operationSchema))
      .output(resultSchema)
      .effect(function* ({ input, context }) {
        return yield* performOperation(context.resources.get(fileRequirement), input);
      }),
  }),
})();

type StepContext = AsyncStepExecutionContext<
  Static<typeof operationSchema>,
  {},
  RuntimeResourceMap
>;
const step = defineAsyncStepEffect({
  id: "read-lease",
  policy: {},
  effect: ({ event, resources }: StepContext) =>
    performOperation(resources.get(fileRequirement), event),
});
export const workflowPlugin = defineAsyncWorkflowPlugin.factory()({
  capability: "isolation",
  services: {},
  resourceRequirements: [fileRequirement, clientRequirement],
  workflows: [
    defineWorkflow({
      id: "isolation-work",
      eventName: "process-isolation/work",
      inputSchema: RuntimeSchema.fromTypeBox(operationSchema),
      steps: [step],
      options: { retries: 0, checkpointing: false },
      async run(context) {
        state.counters.outerRuns++;
        return stepEffect(context).run(step);
      },
    }),
  ],
})();

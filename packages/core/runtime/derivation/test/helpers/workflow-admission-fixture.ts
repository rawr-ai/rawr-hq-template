import { os } from "@orpc/server";
import { Type } from "typebox";

import {
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineServerApiPlugin,
  defineServerInternalPlugin,
  defineService,
  defineWorkflow,
  Effect,
  providerFx,
  providerSelection,
  requireResource,
  resourceDep,
  useService,
} from "../../../definition/src/index";
import type { WorkflowEventSender } from "../../../definition/src/workflow-admission";
import { useWorkflowDispatcher } from "../../../definition/src/workflow-dispatcher-use";
import { RuntimeSchema } from "../../../schema/src/index";
import { coldService } from "../support/cold-service";
import { deriveServerFixture } from "./server-source-fixture";

export const zeroAdmissionCalls = {
  run: 0,
  effect: 0,
  validate: 0,
  decode: 0,
  build: 0,
  acquire: 0,
  release: 0,
  send: 0,
  factory: 0,
};

export function workflowAdmissionFixture(reverse = false) {
  const calls = { ...zeroAdmissionCalls };
  const rawSchema = RuntimeSchema.fromTypeBox(Type.Object({ count: Type.Number() }));
  const schema = {
    ...rawSchema,
    decode: (input: unknown) => {
      calls.decode++;
      return rawSchema.decode(input);
    },
    validate: (input: unknown) => {
      calls.validate++;
      return rawSchema.validate(input);
    },
  };
  const step = defineAsyncStepEffect({
    id: "execution-only-step",
    policy: {},
    effect: () => {
      calls.effect++;
      return Effect.succeed("executed");
    },
  });
  const workflow = (id: "alpha" | "zeta") =>
    defineWorkflow({
      id,
      eventName: "admission/shared-event",
      inputSchema: schema,
      steps: [step],
      run: () => {
        calls.run++;
      },
    });
  const alpha = workflow("alpha");
  const zeta = workflow("zeta");
  const executionOnly = defineRuntimeResource({
    id: "execution-only",
    title: "Execution only",
    purpose: "Must not enter admission closure",
  });
  const executionService = coldService(
    defineService({
      id: "execution-service",
      deps: { resource: resourceDep(executionOnly) },
    })
  );
  const target = defineAsyncWorkflowPlugin.factory()({
    capability: "admission-target",
    instance: "target-instance",
    services: { execution: useService(executionService) },
    resourceRequirements: [requireResource({ resource: executionOnly, reason: "Execution only" })],
    workflows: [zeta, alpha],
  })();
  const clientResource = defineRuntimeResource<"admission-client", WorkflowEventSender>({
    id: "admission-client",
    title: "Admission client",
    purpose: "Existing native client resource",
  });
  const leftClient = requireResource({
    resource: clientResource,
    instance: "left",
    reason: "Left admission",
  });
  const rightClient = requireResource({
    resource: clientResource,
    instance: "right",
    reason: "Right admission",
  });
  const provider = defineRuntimeProvider({
    id: "admission-client-provider",
    title: "Admission client",
    provides: clientResource,
    requires: [],
    build: () => {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: async () => {
            calls.acquire++;
            return {
              send: async () => {
                calls.send++;
                return { ids: ["native-event-id"] };
              },
            };
          },
          catch: (cause) => cause,
        }),
        release: () => {
          calls.release++;
          return providerFx.succeed(undefined);
        },
      });
    },
  });
  const alphaUse = useWorkflowDispatcher(target, { workflows: [alpha], client: leftClient });
  const rightUse = useWorkflowDispatcher(target, { workflows: [alpha], client: rightClient });
  const bothUse = useWorkflowDispatcher(target, {
    workflows: reverse ? [alpha, zeta] : [zeta, alpha],
    client: leftClient,
  });
  const zetaUse = useWorkflowDispatcher(target, { workflows: [zeta], client: leftClient });
  const uses = { zeta: zetaUse, right: rightUse, both: bothUse, alpha: alphaUse, alias: alphaUse };
  const api = defineServerApiPlugin.factory()({
    capability: "admission-caller",
    services: {},
    routeBase: "/admit",
    resourceRequirements: [leftClient],
    workflows: reverse
      ? { alias: alphaUse, alpha: alphaUse, both: bothUse, right: rightUse, zeta: zetaUse }
      : uses,
    api: () => {
      calls.factory++;
      return { submit: os.handler(() => undefined) };
    },
  })();
  const internal = defineServerInternalPlugin.factory()({
    capability: "admission-caller",
    services: {},
    routeBase: "/internal/admit",
    workflows: { forwarded: rightUse },
    internal: () => {
      calls.factory++;
      return { submit: os.handler(() => undefined) };
    },
  })();
  const providers = [
    providerSelection({ resource: clientResource, provider, instance: "left" }),
    providerSelection({ resource: clientResource, provider, instance: "right" }),
  ];
  const plugins = reverse ? [internal, api, target] : [target, api, internal];
  return {
    alpha,
    zeta,
    schema,
    target,
    api,
    internal,
    alphaUse,
    rightUse,
    leftClient,
    rightClient,
    provider,
    providers,
    calls,
    derivation: deriveServerFixture(
      plugins,
      ["server"],
      reverse ? [...providers].reverse() : providers
    ),
  };
}

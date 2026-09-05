import { expect, test } from "bun:test";
import { type as schemaType } from "@orpc/contract";
import type { WithEffectContext } from "@orpc/experimental-effect";
import "@orpc/experimental-effect/extensions/effect";
import { createRouterClient, implement } from "@orpc/server";
import { Effect } from "effect";
import { type Static, Type } from "typebox";
import { Check } from "typebox/value";

import { compileRuntimePlan } from "../../compiler/src/compile-runtime-plan";
import { defineApp, defineEntrypoint, defineProcessCatalog } from "../../definition/src/app";
import { readAsyncStepBridge } from "../../definition/src/async-context";
import { defineAsyncWorkflowPlugin, defineWorkflow } from "../../definition/src/async-plugin";
import {
  type AsyncStepExecutionContext,
  defineAsyncStepEffect,
} from "../../definition/src/execution";
import { defineRuntimeProfile } from "../../definition/src/profile";
import type { RuntimeSchema } from "../../definition/src/schema";
import {
  defineService,
  type ServiceClients,
  sealService,
  useService,
} from "../../definition/src/service";
import { deriveRuntimeArtifacts } from "../../derivation/src/derive-runtime-artifacts";
import { provisionProcess } from "../../substrate/effect/src/provision-process";
import { createProcessRuntime } from "../src/create-process-runtime";

test("async steps explicitly bind selected clients through the service-owned invocation schema", async () => {
  const calls = { construct: 0, bind: 0, procedure: 0, step: 0, decode: 0, validate: 0 };
  const eventShape = Type.Object({ actorId: Type.String(), at: Type.String() });
  type Event = Static<typeof eventShape>;
  type Invocation = { actorId: string; at: Date };
  const schema: RuntimeSchema<Invocation> = {
    kind: "runtime.schema",
    serializable: eventShape,
    decode(input) {
      calls.decode++;
      return Check(eventShape, input) &&
        input.actorId.length > 0 &&
        Number.isFinite(Date.parse(input.at))
        ? { success: true, value: { actorId: input.actorId, at: new Date(input.at) } }
        : { success: false, issues: [{ message: "Expected encoded service invocation." }] };
    },
    validate(input) {
      calls.validate++;
      return typeof input === "object" &&
        input !== null &&
        "actorId" in input &&
        typeof input.actorId === "string" &&
        input.actorId.length > 0 &&
        "at" in input &&
        input.at instanceof Date &&
        Number.isFinite(input.at.getTime())
        ? { success: true, value: { actorId: input.actorId, at: input.at } }
        : { success: false, issues: [{ message: "Expected a nonempty actor and decoded Date." }] };
    },
    toRedactedShape: () => ({ schema: eventShape }),
  };
  const definition = defineService({ id: "async.actor", deps: {}, invocation: schema });
  const contract = definition.oc.router({ read: definition.oc.output(schemaType<string>()) });
  let received: Invocation | undefined;
  const service = sealService(definition, {
    contract,
    construct({ clients }) {
      calls.construct++;
      const native = implement(contract).$context<WithEffectContext<never> & Invocation>();
      const router = native.router({
        read: native.read.effect(function* ({ context }) {
          calls.procedure++;
          return yield* Effect.succeed(`${context.actorId}:${context.at.toISOString()}`);
        }),
      });
      return {
        kind: "service.client.construction-bound",
        serviceId: definition.id,
        withInvocation({ invocation }) {
          calls.bind++;
          received = invocation;
          return clients.bind({
            context: () => invocation,
            createNativeClient: (options) => createRouterClient(router, options),
          });
        },
      };
    },
  });
  const uses = { actor: useService(service) };
  type StepContext = AsyncStepExecutionContext<Event, ServiceClients<typeof uses>>;
  let selected: ServiceClients<typeof uses>["actor"] | undefined;
  let authoredInvocation: Invocation | undefined;
  const step = defineAsyncStepEffect({
    id: "read-actor",
    policy: {},
    effect: function* ({ event, clients }: StepContext) {
      calls.step++;
      if (selected === undefined) throw new Error("Expected the selected construction client.");
      expect(clients.actor).toBe(selected);
      expect(clients.actor.kind).toBe("service.client.construction-bound");
      expect(clients.actor).not.toHaveProperty("read");
      expect(calls.bind).toBe(0);
      expect(() =>
        clients.actor.withInvocation({ invocation: { actorId: "", at: new Date(event.at) } })
      ).toThrow("Service invocation failed its owning schema.");
      expect(calls.bind).toBe(0);
      authoredInvocation = { actorId: event.actorId, at: new Date(event.at) };
      return yield* clients.actor.withInvocation({ invocation: authoredInvocation }).read();
    },
  });
  const eventSchema: RuntimeSchema<Event> = {
    kind: "runtime.schema",
    serializable: eventShape,
    decode: (input) =>
      Check(eventShape, input)
        ? { success: true, value: input }
        : { success: false, issues: [{ message: "Expected event data." }] },
    validate: (input) =>
      Check(eventShape, input)
        ? { success: true, value: input }
        : { success: false, issues: [{ message: "Expected event data." }] },
    toRedactedShape: () => ({ schema: eventShape }),
  };
  const app = defineApp({
    id: "async-service-test",
    plugins: [
      defineAsyncWorkflowPlugin.factory()({
        capability: "actor",
        services: uses,
        workflows: [
          defineWorkflow({
            id: "read-actor",
            eventName: "actor/read",
            inputSchema: eventSchema,
            steps: [step],
            run: (context) => readAsyncStepBridge(context).run(step),
          }),
        ],
      })(),
    ],
  });
  const profile = defineRuntimeProfile({ id: "test", providers: [] });
  const process = defineProcessCatalog({ worker: { id: "worker", roles: ["async"] } }).worker;
  const entrypoint = defineEntrypoint({
    id: "test",
    app,
    process,
    profile,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "test",
      deployment: "test",
      source: "owner-test",
    },
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const compilation = compileRuntimePlan({ derivation });
  expect(compilation.plan.bootgraphInput.nodes).toEqual([]);
  expect(calls).toEqual({ construct: 0, bind: 0, procedure: 0, step: 0, decode: 0, validate: 0 });
  // This is a zero-resource execution proof, not a boot-order or native replay fixture.
  const provisioned = await provisionProcess({
    compilation,
    bootgraph: {
      kind: "bootgraph.ordered",
      modules: [],
      order: [],
      rollbackOrder: [],
      releaseOrder: [],
    },
    sources: { appRoot: import.meta.dir },
  });
  const runtime = await createProcessRuntime({
    compilation,
    provisioned,
    descriptorTable: derivation.executionDescriptorTable,
  });
  try {
    const binding = compilation.plan.serviceBindings[0];
    const ref = derivation.executionDescriptorTable.entries()[0]?.[0];
    if (binding === undefined || ref === undefined)
      throw new Error("Expected selected service and async boundary.");
    selected = runtime.binding(binding.bindingId, service);
    expect(calls).toEqual({ construct: 1, bind: 0, procedure: 0, step: 0, decode: 0, validate: 0 });
    const event = { actorId: "actor-17", at: "2026-09-05T12:00:00.000Z" };
    const result = await runtime.execution.execute({
      boundary: runtime.registry.get<Event, string, unknown, { event: Event }>(ref),
      invocation: { input: event, context: { event } },
    });
    expect(result).toBe("actor-17:2026-09-05T12:00:00.000Z");
    expect(received).toBe(authoredInvocation);
    expect(received?.at).toBeInstanceOf(Date);
    expect(calls).toEqual({ construct: 1, bind: 1, procedure: 1, step: 1, decode: 0, validate: 2 });
  } finally {
    await runtime.stop();
  }
});

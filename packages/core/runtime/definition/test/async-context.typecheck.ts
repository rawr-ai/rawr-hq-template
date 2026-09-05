import type { GetFunctionInput, Inngest } from "inngest";
import type { Jsonify } from "inngest/types";

import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import {
  type AsyncRunContext,
  type AsyncStepResult,
  defineAsyncConsumerPlugin,
  defineAsyncSchedulePlugin,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineConsumer,
  defineSchedule,
  defineWorkflow,
  Effect,
  readAsyncStepBridge,
} from "../src/index";

type TypesEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export function assertAsyncContextTypes(
  schema: RuntimeSchema<{ count: number; createdAt: Date }>
): void {
  const selected = defineAsyncStepEffect({
    id: "selected",
    policy: {},
    effect: () => Effect.succeed({ date: new Date(), optional: undefined as string | undefined }),
  });
  const undeclared = defineAsyncStepEffect({
    id: "undeclared",
    policy: {},
    effect: selected.effect,
  });
  const empty = defineAsyncStepEffect({
    id: "empty",
    policy: {},
    effect: () => Effect.succeed<void>(undefined),
  });
  const optionalShape: TypesEqual<
    AsyncStepResult<typeof selected>,
    Jsonify<{ date: Date; optional: string | undefined }>
  > = true;
  const nullShape: TypesEqual<AsyncStepResult<typeof empty>, null> = true;
  const stableOptionalShape: TypesEqual<
    Jsonify<AsyncStepResult<typeof selected>>,
    AsyncStepResult<typeof selected>
  > = true;
  const nativeTools: TypesEqual<AsyncRunContext["step"], GetFunctionInput<Inngest>["step"]> = true;
  void [optionalShape, nullShape, stableOptionalShape, nativeTools];

  const workflow = defineWorkflow({
    id: "workflow",
    eventName: "items/changed",
    inputSchema: schema,
    steps: [selected, empty],
    options: {
      checkpointing: false,
      retries: 2,
      concurrency: { limit: 3, key: "event.data.count" },
      cancelOn: [{ event: "items/cancelled" }],
      onFailure(context) {
        context.logger.error(context.error);
        const failedFunction: string = context.event.data.function_id;
        // @ts-expect-error Native onFailure is not a Habitat invocation capability.
        readAsyncStepBridge(context);
        return failedFunction;
      },
    },
    async run(context) {
      const count: number = context.event.data.count;
      const createdAt: Date = context.event.data.createdAt;
      const native: GetFunctionInput<Inngest>["step"] = context.step;
      context.logger.info("native logger");
      const result = await readAsyncStepBridge(context).run(selected);
      const date: string = result.date;
      const optional: string | undefined = result.optional;
      const nothing: null = await readAsyncStepBridge(context).run(empty);
      void [count, createdAt, native, date, optional, nothing];
      // @ts-expect-error An undeclared step with identical output is not a member.
      readAsyncStepBridge(context).run(undeclared);
      // @ts-expect-error Step factories are not declared descriptors.
      readAsyncStepBridge(context).run(() => selected);
      // @ts-expect-error Decoded data is not the schema's raw representation.
      const rawDate: string = context.event.data.createdAt;
      void rawDate;
      // @ts-expect-error Services exist only within an admitted Effect step.
      context.clients;
      // @ts-expect-error Service definitions are not orchestration context.
      context.services;
      // @ts-expect-error Resources exist only within an admitted Effect step.
      context.resources;
      // @ts-expect-error Execution authority is private to the step callback.
      context.execution;
      // @ts-expect-error Process runtimes are not orchestration tools.
      context.runtime;
      // @ts-expect-error ManagedRuntime is not an authoring capability.
      context.managedRuntime;
      return date;
    },
  });
  const consumer = defineConsumer({
    id: "consumer",
    eventName: "items/changed",
    eventSchema: schema,
    steps: [selected],
    async run(context) {
      const count: number = context.event.data.count;
      const createdAt: Date = context.event.data.createdAt;
      // @ts-expect-error Another declaration's member is unavailable here.
      readAsyncStepBridge(context).run(empty);
      return [count, createdAt, await readAsyncStepBridge(context).run(selected)];
    },
  });
  const schedule = defineSchedule({
    id: "schedule",
    cron: "* * * * *",
    steps: [],
    run(context) {
      const cron: string = context.event.data.cron;
      // @ts-expect-error Empty membership admits no Effect descriptor.
      readAsyncStepBridge(context).run(selected);
      return cron;
    },
  });
  defineAsyncWorkflowPlugin.factory()({ capability: "typed", services: {}, workflows: [workflow] });
  defineAsyncConsumerPlugin.factory()({ capability: "typed", services: {}, consumers: [consumer] });
  defineAsyncSchedulePlugin.factory()({ capability: "typed", services: {}, schedules: [schedule] });
  // @ts-expect-error Event routing is authored explicitly, never generated from workflow id.
  defineWorkflow({ id: "missing-event", inputSchema: schema, steps: [], run: () => undefined });
  // @ts-expect-error Membership alone is not an executable orchestration function.
  defineSchedule({ id: "missing-run", cron: "* * * * *", steps: [] });
  defineSchedule({
    id: "fixed",
    cron: "* * * * *",
    steps: [],
    run: () => undefined,
    // @ts-expect-error Native configuration cannot replace authored function identity.
    options: { id: "different" },
  });
  defineSchedule({
    id: "fixed",
    cron: "* * * * *",
    steps: [],
    run: () => undefined,
    // @ts-expect-error Native configuration cannot replace authored trigger policy.
    options: { triggers: [{ event: "different" }] },
  });
  defineSchedule({
    id: "fixed",
    cron: "* * * * *",
    steps: [],
    run: () => undefined,
    // @ts-expect-error Native configuration cannot hide the authored orchestration callback.
    options: { run: () => undefined },
  });
}

import { expect, test } from "bun:test";
import { eventType, Middleware } from "inngest";
import { Type } from "typebox";

import { RuntimeSchema } from "../../schema/src/index";
import {
  type AsyncStepRunner,
  attachAsyncStepBridge,
  defineAsyncStepEffect,
  defineConsumer,
  defineSchedule,
  defineWorkflow,
  Effect,
  readAsyncStepBridge,
} from "../src/index";

test("async authoring keeps exact native run, schemas, triggers, and cold membership", () => {
  let calls = 0;
  const run = () => {
    calls++;
  };
  const step = defineAsyncStepEffect({
    id: "member",
    policy: {},
    effect: () => {
      calls++;
      return Effect.succeed(undefined);
    },
  });
  const schema = RuntimeSchema.fromTypeBox(Type.Object({ count: Type.Number() }));
  const steps = [step];
  const workflow = defineWorkflow({
    id: "workflow-id",
    eventName: "shared/event",
    inputSchema: schema,
    steps,
    run,
  });
  const consumer = defineConsumer({
    id: "consumer-id",
    eventName: "shared/event",
    eventSchema: schema,
    steps,
    run,
  });
  const schedule = defineSchedule({ id: "schedule-id", cron: "* * * * *", steps, run });
  steps.length = 0;
  for (const declaration of [workflow, consumer, schedule]) {
    expect(declaration.run).toBe(run);
    expect(declaration.steps).toEqual([step]);
    expect(declaration.steps[0]).toBe(step);
    expect(Object.isFrozen(declaration)).toBe(true);
    expect(Object.isFrozen(declaration.steps)).toBe(true);
  }
  expect(workflow.inputSchema).toBe(schema);
  expect(consumer.eventSchema).toBe(schema);
  expect(workflow.eventName).toBe(consumer.eventName);
  expect(schedule.cron).toBe("* * * * *");
  expect(calls).toBe(0);
});

test("private async bridge is invocation-bound and absent from enumerable native context", async () => {
  const member = defineAsyncStepEffect({
    id: "member",
    policy: {},
    effect: () => Effect.succeed(undefined),
  });
  const calls: object[] = [];
  const runner: AsyncStepRunner<readonly [typeof member]> = {
    run(descriptor) {
      calls.push(descriptor);
      return Promise.reject(new Error("native boundary sentinel"));
    },
  };
  const event = { name: "event", data: { value: 1 } };
  const native = { event, runId: "run-id", step: { native: true } };
  const context = attachAsyncStepBridge(native, runner);
  expect(Object.is(context, native)).toBe(true);
  expect(context.event).toBe(event);
  expect(Object.keys(context)).toEqual(["event", "runId", "step"]);
  expect(readAsyncStepBridge(context)).toBe(runner);
  await expect(readAsyncStepBridge(context).run(member)).rejects.toThrow(
    "native boundary sentinel"
  );
  expect(calls).toEqual([member]);
  expect(() => attachAsyncStepBridge(context, runner)).toThrow(TypeError);
  expect(() => readAsyncStepBridge({ ...context })).toThrow(TypeError);
  expect(() => readAsyncStepBridge(Object.create(context))).toThrow(TypeError);
});

test("native function options are cold snapshots with exact callbacks and native instances", () => {
  let calls = 0;
  const onFailure = () => {
    calls++;
  };
  class TestMiddleware extends Middleware.BaseMiddleware {
    readonly id = "cold-options";
  }
  const cancellation = eventType("items/cancelled");
  const concurrency = { limit: 2 };
  Reflect.set(concurrency, "opaque-native-reference", concurrency);
  const options = {
    checkpointing: false,
    concurrency,
    cancelOn: [{ event: cancellation }],
    onFailure,
    middleware: [TestMiddleware],
  };
  const schedule = defineSchedule({
    id: "configured",
    cron: "* * * * *",
    steps: [],
    options,
    run: () => undefined,
  });
  options.checkpointing = true;
  options.middleware = [];
  expect(schedule.options).not.toBe(options);
  expect(schedule.options?.checkpointing).toBe(false);
  expect(schedule.options?.concurrency).toBe(concurrency);
  expect(schedule.options?.onFailure).toBe(onFailure);
  expect(schedule.options?.cancelOn?.[0]?.event).toBe(cancellation);
  expect(schedule.options?.middleware?.[0]).toBe(TestMiddleware);
  expect(Object.isFrozen(schedule.options)).toBe(true);
  expect(Object.isFrozen(concurrency)).toBe(false);
  expect(Object.isFrozen(schedule.options?.cancelOn)).toBe(false);
  expect(calls).toBe(0);
});

for (const key of ["id", "triggers", "run"] as const) {
  test(`native options cannot replace authored ${key}`, () => {
    const options = {};
    Reflect.set(options, key, "substitute");
    expect(() =>
      defineSchedule({
        id: "fixed",
        cron: "* * * * *",
        steps: [],
        options,
        run: () => undefined,
      })
    ).toThrow(TypeError);
  });
}

test("snapshotting native options never evaluates accessor callbacks", () => {
  let calls = 0;
  const options = { checkpointing: true };
  Object.defineProperty(options, "retries", {
    enumerable: true,
    get() {
      calls++;
      return 1;
    },
  });
  expect(() =>
    defineSchedule({
      id: "getter",
      cron: "* * * * *",
      steps: [],
      options,
      run: () => undefined,
    })
  ).toThrow(TypeError);
  expect(calls).toBe(0);
});

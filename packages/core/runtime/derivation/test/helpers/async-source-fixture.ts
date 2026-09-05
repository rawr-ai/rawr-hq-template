import { Type } from "typebox";

import {
  defineApp,
  defineAsyncConsumerPlugin,
  defineAsyncSchedulePlugin,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineConsumer,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineSchedule,
  defineWorkflow,
  Effect,
} from "../../../definition/src/index";
import { RuntimeSchema } from "../../../schema/src/index";
import { deriveRuntimeArtifacts } from "../../src/index";

export function asyncSourceFixture() {
  const calls = { run: 0, effect: 0, decode: 0, failure: 0 };
  const run = () => {
    calls.run++;
  };
  const onFailure = () => {
    calls.failure++;
  };
  const rawSchema = RuntimeSchema.fromTypeBox(Type.Object({ count: Type.String() }));
  const decode = (input: unknown) => {
    calls.decode++;
    const result = rawSchema.decode(input);
    return result.success
      ? { success: true as const, value: { count: Number(result.value.count) } }
      : result;
  };
  const schema = { ...rawSchema, decode, validate: decode };
  const shared = defineAsyncStepEffect({
    id: "shared",
    policy: {},
    effect: () => {
      calls.effect++;
      return Effect.succeed({ at: new Date() });
    },
  });
  const membershipOnly = defineAsyncStepEffect({
    id: "membership-only",
    policy: {},
    effect: () => {
      calls.effect++;
      return Effect.succeed("never sequenced implicitly");
    },
  });
  const workflow = defineWorkflow({
    id: "workflow",
    eventName: "shared/event",
    inputSchema: schema,
    steps: [shared, membershipOnly],
    run,
    options: { checkpointing: false, retries: 1, onFailure },
  });
  const consumer = defineConsumer({
    id: "consumer",
    eventName: "shared/event",
    eventSchema: schema,
    steps: [shared],
    run,
  });
  const schedule = defineSchedule({
    id: "schedule",
    cron: "0 * * * *",
    steps: [shared],
    run,
    options: { checkpointing: true },
  });
  const app = defineApp({
    id: "async-source-fixture",
    plugins: [
      defineAsyncWorkflowPlugin.factory()({
        capability: "work",
        services: {},
        workflows: [workflow],
      })(),
      defineAsyncConsumerPlugin.factory()({
        capability: "events",
        services: {},
        consumers: [consumer],
      })(),
      defineAsyncSchedulePlugin.factory()({
        capability: "timers",
        services: {},
        schedules: [schedule],
      })(),
    ],
  });
  const profile = defineRuntimeProfile({ id: "async-source-profile", providers: [] });
  const process = defineProcessCatalog({
    main: { id: "async-source-process", roles: ["async"] },
  }).main;
  const entrypoint = defineEntrypoint({
    id: "async-source-entrypoint",
    app,
    process,
    profile,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "async-source-entrypoint",
      deployment: "test",
      source: "async-source-fixture",
    },
  });
  return {
    derivation: deriveRuntimeArtifacts({ entrypoint, profileId: profile.id }),
    calls,
    workflow,
    consumer,
    schedule,
    shared,
    membershipOnly,
  };
}

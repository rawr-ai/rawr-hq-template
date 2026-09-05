import { closeSync, existsSync, openSync, unlinkSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cause, Effect, Exit, Option } from "effect";
import { expect, expectTypeOf, test } from "vitest";

import { orderBootgraph } from "../../runtime/bootgraph/src/index";
import { compileRuntimePlan } from "../../runtime/compiler/src/index";
import {
  type AsyncStepExecutionContext,
  type BoundaryTelemetry,
  defineApp,
  defineAsyncSchedulePlugin,
  defineAsyncStepEffect,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineSchedule,
  type EffectBoundaryContext,
  type EffectExecutionPolicy,
  type HabitatTimeoutError,
  providerFx,
  providerSelection,
  requireResource,
} from "../../runtime/definition/src/index";
import { deriveRuntimeArtifacts } from "../../runtime/derivation/src/index";
import { createProcessRuntime } from "../../runtime/process-runtime/src/index";
import { provisionProcess } from "../../runtime/substrate/effect/src/index";

type StepContext = AsyncStepExecutionContext<
  { readonly eventId: string },
  Readonly<Record<string, never>>,
  { readonly fd: number },
  BoundaryTelemetry,
  EffectBoundaryContext
>;

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function failed<A, E>(exit: Exit.Exit<A, E>): Cause.Cause<E> {
  if (!Exit.isFailure(exit)) throw new Error("Expected a failed execution fixture.");
  return exit.cause;
}

async function start<A, E>(
  effect: (context: StepContext) => Effect.Effect<A, E>,
  policy: EffectExecutionPolicy = {}
) {
  const root = await mkdtemp(join(tmpdir(), "habitat-execution-"));
  const leasePath = join(root, "execution.lease");
  const calls = { build: 0, acquire: 0, release: 0, body: 0, callerTelemetry: 0 };
  const events: string[] = [];
  const lease = defineRuntimeResource<"execution.lease", { readonly fd: number }>({
    id: "execution.lease",
    title: "Execution lease",
    purpose: "Real native execution lifetime proof",
  });
  const provider = defineRuntimeProvider({
    id: "execution.lease.provider",
    title: "Execution lease provider",
    provides: lease,
    requires: [],
    build() {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          const fd = openSync(leasePath, "wx");
          calls.acquire++;
          events.push("acquired");
          return { fd };
        }),
        release: ({ fd }) =>
          Effect.sync(() => {
            closeSync(fd);
            unlinkSync(leasePath);
            calls.release++;
            events.push("released");
          }),
      });
    },
  });
  const step = defineAsyncStepEffect({
    id: "work",
    policy,
    effect(context: StepContext) {
      calls.body++;
      return effect(context);
    },
  });
  const plugin = defineAsyncSchedulePlugin.factory()({
    capability: "execution-jobs",
    services: {},
    resourceRequirements: [requireResource({ resource: lease, reason: "Execution lifetime" })],
    schedules: [defineSchedule({ id: "hourly", cron: "0 * * * *", steps: [step] })],
  })();
  const app = defineApp({ id: "execution.app", plugins: [plugin] });
  const profile = defineRuntimeProfile({
    id: "execution.profile",
    providers: [providerSelection({ resource: lease, provider })],
  });
  const process = defineProcessCatalog({
    worker: { id: "execution.worker", roles: ["async"] },
  }).worker;
  const entrypoint = defineEntrypoint({
    id: "execution.entrypoint",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "execution.entrypoint",
      deployment: "test",
      source: "sdk-execution-proof",
    },
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const compilation = compileRuntimePlan({ derivation });
  const bootgraph = orderBootgraph(compilation.plan.bootgraphInput);
  expect(calls).toEqual({ build: 0, acquire: 0, release: 0, body: 0, callerTelemetry: 0 });
  const provisioned = await provisionProcess({
    compilation,
    bootgraph,
    sources: { appRoot: root },
  });
  try {
    const runtime = await createProcessRuntime({
      compilation,
      provisioned,
      descriptorTable: derivation.executionDescriptorTable,
    });
    const ref = compilation.plan.executionPlans[0]?.ref;
    if (ref === undefined)
      throw new Error("Execution fixture requires its real derived async ref.");
    const boundary = runtime.registry.get<void, A, E, StepContext>(ref);
    const callerTelemetry: BoundaryTelemetry = {
      span: () => Effect.die(new Error("Caller telemetry must not replace runtime telemetry.")),
      event: () =>
        Effect.sync(() => {
          calls.callerTelemetry++;
          throw new Error("Caller telemetry must not replace runtime telemetry.");
        }),
    };
    const context: StepContext = {
      event: { eventId: "event-one" },
      clients: {},
      resources: runtime.access.process.resource(lease),
      telemetry: callerTelemetry,
      execution: {
        appId: "caller-supplied",
        processId: "caller-supplied",
        entrypointId: "caller-supplied",
        profileId: "caller-supplied",
        role: "async",
        ownerId: "caller-supplied",
        executionId: "caller-supplied",
        traceId: "caller-supplied",
      },
    };
    expect(calls).toMatchObject({ build: 1, acquire: 1, release: 0, body: 0 });
    return {
      runtime,
      provisioned,
      compilation,
      boundary,
      invocation: { input: undefined, context, requestId: "request-one" },
      context,
      calls,
      events,
      leasePath,
      async cleanup() {
        await runtime.stop();
        await rm(root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await provisioned.managedRuntime.dispose();
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

test("executes a real derived async boundary with native parent trace and runtime-owned context", async () => {
  const fixture = await start((context) =>
    Effect.gen(function* () {
      const span = yield* Effect.orDie(Effect.currentSpan);
      yield* context.telemetry.event("work.entered", { eventId: context.event.eventId });
      const child = yield* context.telemetry.span("work.child", Effect.orDie(Effect.currentSpan));
      return {
        span,
        child,
        execution: context.execution,
        event: context.event,
        resources: context.resources,
      };
    })
  );
  try {
    const parent = {
      traceId: "1234567890abcdef1234567890abcdef",
      spanId: "1234567890abcdef",
      sampled: true,
    };
    const result = await fixture.runtime.execution.execute({
      boundary: fixture.boundary,
      invocation: { ...fixture.invocation, parentSpan: parent },
    });
    expect(result.span.name).toBe("runtime.execution");
    expect(result.span.traceId).toBe(parent.traceId);
    expect(Option.getOrThrow(result.span.parent).spanId).toBe(parent.spanId);
    expect(result.execution.traceId).toBe(result.span.traceId);
    expect(result.execution).toMatchObject({
      appId: "execution.app",
      processId: "execution.worker",
      entrypointId: "execution.entrypoint",
      profileId: "execution.profile",
      role: "async",
      surface: "async/schedule",
      capability: "execution-jobs",
      ownerId: fixture.boundary.ref.ownerId,
      executionId: fixture.boundary.ref.executionId,
      requestId: "request-one",
    });
    expect(result.child.name).toBe("work.child");
    expect(result.child.traceId).toBe(parent.traceId);
    expect(Option.getOrThrow(result.child.parent).spanId).toBe(result.span.spanId);
    expect(result.event).toBe(fixture.context.event);
    expect(result.resources).toBe(fixture.context.resources);
    expect(fixture.context.execution.traceId).toBe("caller-supplied");
    expect(fixture.calls).toMatchObject({ body: 1, callerTelemetry: 0, acquire: 1, release: 0 });
  } finally {
    await fixture.cleanup();
  }
});

test("preserves exact typed failures, defects, self-interruption and mixed native Cause reasons", async () => {
  const expected = Object.freeze({ _tag: "ExpectedFailure", key: "exact-error" });
  const defect = new Error("exact-defect");
  const mixed = Cause.combine(
    Cause.combine(Cause.fail(expected), Cause.die(defect)),
    Cause.interrupt(765)
  );
  const programs = [
    Effect.fail(expected),
    Effect.die(defect),
    Effect.interrupt,
    Effect.failCause(mixed),
  ];
  for (const program of programs) {
    const fixture = await start(() => program);
    try {
      const pending = fixture.runtime.execution.executeExit({
        boundary: fixture.boundary,
        invocation: fixture.invocation,
      });
      expectTypeOf(pending).toEqualTypeOf<
        Promise<Exit.Exit<never, typeof expected | HabitatTimeoutError>>
      >();
      const cause = failed(await pending);
      if (program === programs[0]) {
        expect(cause.reasons).toHaveLength(1);
        expect(Option.getOrThrow(Cause.findErrorOption(cause))).toBe(expected);
        expect(Cause.hasDies(cause)).toBe(false);
        expect(Cause.hasInterrupts(cause)).toBe(false);
      } else if (program === programs[1]) {
        expect(cause.reasons).toHaveLength(1);
        expect(cause.reasons.find(Cause.isDieReason)?.defect).toBe(defect);
        expect(Cause.hasFails(cause)).toBe(false);
      } else if (program === programs[2]) {
        expect(Cause.hasInterruptsOnly(cause)).toBe(true);
      } else {
        expect(cause.reasons).toHaveLength(3);
        expect(Option.getOrThrow(Cause.findErrorOption(cause))).toBe(expected);
        expect(cause.reasons.find(Cause.isDieReason)?.defect).toBe(defect);
        expect([...Cause.interruptors(cause)]).toEqual([765]);
      }
      expect(fixture.calls.body).toBe(1);
    } finally {
      await fixture.cleanup();
    }
  }
});

test("a failed telemetry event never replaces the native operation outcome", async () => {
  const expected = Object.freeze({ _tag: "ExpectedFailure", key: "after-event" });
  const diagnosticFailure = new Error("native-span-event-failed");
  let eventCalls = 0;
  for (const fail of [false, true]) {
    const fixture = await start((context) =>
      Effect.gen(function* () {
        const span = yield* Effect.orDie(Effect.currentSpan);
        const original = span.event;
        span.event = () => {
          eventCalls++;
          throw diagnosticFailure;
        };
        yield* Effect.ensuring(
          context.telemetry.event("fails"),
          Effect.sync(() => {
            span.event = original;
          })
        );
        return fail ? yield* Effect.fail(expected) : "completed";
      })
    );
    try {
      const exit = await fixture.runtime.execution.executeExit({
        boundary: fixture.boundary,
        invocation: fixture.invocation,
      });
      if (fail) {
        const cause = failed(exit);
        expect(Option.getOrThrow(Cause.findErrorOption(cause))).toBe(expected);
        expect(Cause.hasDies(cause)).toBe(false);
      } else {
        expect(exit).toEqual(Exit.succeed("completed"));
      }
      expect(fixture.calls.callerTelemetry).toBe(0);
    } finally {
      await fixture.cleanup();
    }
  }
  expect(eventCalls).toBe(2);
});

test("a synchronous authored step throw remains a native defect", async () => {
  const defect = new Error("authored-step-factory-threw");
  const fixture = await start<never, never>(() => {
    throw defect;
  });
  try {
    const cause = failed(
      await fixture.runtime.execution.executeExit({
        boundary: fixture.boundary,
        invocation: fixture.invocation,
      })
    );
    expect(cause.reasons.find(Cause.isDieReason)?.defect).toBe(defect);
    expect(Cause.hasFails(cause)).toBe(false);
    expect(fixture.calls.body).toBe(1);
  } finally {
    await fixture.cleanup();
  }
});

test("timeout remains an exact typed policy failure and retry is explicitly authored", async () => {
  const timeout = await start(() => Effect.never, { timeout: { duration: 1 } });
  try {
    const pending = timeout.runtime.execution.executeExit({
      boundary: timeout.boundary,
      invocation: timeout.invocation,
    });
    expectTypeOf(pending).toEqualTypeOf<Promise<Exit.Exit<never, HabitatTimeoutError>>>();
    expect(Option.getOrThrow(Cause.findErrorOption(failed(await pending)))).toEqual({
      _tag: "HabitatTimeoutError",
      duration: 1,
    });
  } finally {
    await timeout.cleanup();
  }
  let attempts = 0;
  const retry = await start(
    () =>
      Effect.suspend(() =>
        ++attempts < 3 ? Effect.fail("transient") : Effect.succeed("recovered")
      ),
    { retry: { times: 2 } }
  );
  try {
    expect(
      await retry.runtime.execution.execute({
        boundary: retry.boundary,
        invocation: retry.invocation,
      })
    ).toBe("recovered");
    expect(attempts).toBe(3);
    expect(retry.calls.body).toBe(3);
  } finally {
    await retry.cleanup();
  }
});

test("refuses native async signals, malformed trace parents and copied boundaries before execution", async () => {
  const fixture = await start(() => Effect.succeed("not-run"));
  try {
    const signal = new AbortController().signal;
    await expect(
      fixture.runtime.execution.executeExit({
        boundary: fixture.boundary,
        invocation: { ...fixture.invocation, signal },
      })
    ).rejects.toThrow("synthetic interruption signal");
    await expect(
      fixture.runtime.execution.executeExit({
        boundary: fixture.boundary,
        invocation: {
          ...fixture.invocation,
          parentSpan: { traceId: "0".repeat(32), spanId: "1".repeat(16) },
        },
      })
    ).rejects.toThrow("invalid native trace parent");
    await expect(
      fixture.runtime.execution.executeExit({
        boundary: { ...fixture.boundary },
        invocation: fixture.invocation,
      })
    ).rejects.toThrow(TypeError);
    expect(fixture.calls.body).toBe(0);
  } finally {
    await fixture.cleanup();
  }
});

test("process stop drains an admitted native async finalizer before releasing resources", async () => {
  const finalizing = deferred();
  const finish = deferred();
  const fixture = await start(() =>
    Effect.ensuring(
      Effect.interrupt,
      Effect.promise(async () => {
        finalizing.resolve();
        await finish.promise;
      })
    )
  );
  try {
    const result = fixture.runtime.execution.executeExit({
      boundary: fixture.boundary,
      invocation: fixture.invocation,
    });
    await finalizing.promise;
    let stopped = false;
    const stopping = fixture.runtime.stop();
    void stopping.then(() => {
      stopped = true;
    });
    await expect(
      fixture.runtime.execution.executeExit({
        boundary: fixture.boundary,
        invocation: fixture.invocation,
      })
    ).rejects.toThrow("admission is closed");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stopped).toBe(false);
    expect(fixture.calls.release).toBe(0);
    expect(existsSync(fixture.leasePath)).toBe(true);
    finish.resolve();
    expect(Cause.hasInterruptsOnly(failed(await result))).toBe(true);
    await stopping;
    expect(existsSync(fixture.leasePath)).toBe(false);
    expect(fixture.calls).toMatchObject({ body: 1, acquire: 1, release: 1 });
  } finally {
    finish.resolve();
    await fixture.cleanup();
  }
});

test("process executeExit retains a successful iterator through stop and native cleanup", async () => {
  const cleanupStarted = deferred();
  const finish = deferred();
  const events: string[] = [];
  const source = (async function* () {
    try {
      yield "first";
      return "complete";
    } finally {
      events.push("cleanup-started");
      cleanupStarted.resolve();
      await finish.promise;
      events.push("cleanup-finished");
    }
  })();
  const fixture = await start(() => Effect.succeed(source));
  let iterator: typeof source | undefined;
  try {
    const exit = await fixture.runtime.execution.executeExit({
      boundary: fixture.boundary,
      invocation: fixture.invocation,
    });
    if (!Exit.isSuccess(exit)) throw new Error("Expected a successful native iterator Exit.");
    iterator = exit.value;
    expect(fixture.calls.body).toBe(1);
    let stopped = false;
    const stopping = fixture.runtime.stop();
    void stopping.then(() => {
      stopped = true;
      events.push("stopped");
    });
    expect(await iterator.next()).toEqual({ done: false, value: "first" });
    const returning = iterator.return("consumer-stop");
    await cleanupStarted.promise;
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stopped).toBe(false);
    expect(fixture.calls.release).toBe(0);
    expect(existsSync(fixture.leasePath)).toBe(true);
    finish.resolve();
    expect(await returning).toEqual({ done: true, value: "consumer-stop" });
    await stopping;
    expect(events).toEqual(["cleanup-started", "cleanup-finished", "stopped"]);
    expect(existsSync(fixture.leasePath)).toBe(false);
    expect(fixture.calls).toMatchObject({ body: 1, acquire: 1, release: 1 });
  } finally {
    finish.resolve();
    await iterator?.return("cleanup");
    await fixture.cleanup();
  }
});

test("the qualified ready native handle preserves signal cancellation and managed scope registration", async () => {
  const entered = deferred();
  const finalizing = deferred();
  const finish = deferred();
  let finalized = false;
  const fixture = await start(() => Effect.succeed("unused-async-body"));
  try {
    const abort = new AbortController();
    const result = fixture.provisioned.managedRuntime.runExit(
      Effect.gen(function* () {
        entered.resolve();
        return yield* Effect.ensuring(
          Effect.never,
          Effect.promise(async () => {
            finalizing.resolve();
            await finish.promise;
            finalized = true;
          })
        );
      }),
      { signal: abort.signal }
    );
    await entered.promise;
    abort.abort();
    await finalizing.promise;
    let stopped = false;
    const stopping = fixture.runtime.stop();
    void stopping.then(() => {
      stopped = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stopped).toBe(false);
    expect(finalized).toBe(false);
    // The raw native scope closes in parallel; process admission owns resource-release ordering.
    finish.resolve();
    expect(Cause.hasInterruptsOnly(failed(await result))).toBe(true);
    await stopping;
    expect(finalized).toBe(true);
    expect(fixture.calls).toMatchObject({ body: 0, acquire: 1, release: 1 });
    const disposed = await fixture.provisioned.managedRuntime.runExit(Effect.succeed("cannot-run"));
    expect(Cause.hasDies(failed(disposed))).toBe(true);
    expect(fixture.calls.acquire).toBe(1);
  } finally {
    finish.resolve();
    await fixture.cleanup();
  }
});

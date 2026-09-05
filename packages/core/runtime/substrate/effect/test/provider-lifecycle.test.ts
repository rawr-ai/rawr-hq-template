import { describe, expect, test } from "bun:test";
import { Cause, Context, Exit, ManagedRuntime, Effect as NativeEffect } from "effect";

import {
  defineRuntimeProvider,
  defineRuntimeResource,
  Effect,
  providerFx,
  type ResourceRequirement,
  type RuntimeObservationRecord,
  type RuntimeProvider,
  requireResource,
} from "../../../definition/src/index";
import { createManagedRuntimeHandle } from "../src/managed-runtime-handle";
import {
  createProviderLifecycleLayer,
  type ProviderLifecycleInput,
  ProvisionedResourceValues,
  type ReadyProvider,
} from "../src/provider-lifecycle";

function provider(
  id: string,
  build: RuntimeProvider["build"],
  requires: readonly ResourceRequirement[] = []
): RuntimeProvider {
  return defineRuntimeProvider({
    id,
    title: id,
    provides: defineRuntimeResource<string, unknown>({
      id: `${id}.resource`,
      title: id,
      purpose: id,
    }),
    requires,
    build,
  });
}

function ready(
  selected: RuntimeProvider,
  dependencies: ReadyProvider["dependencies"] = [],
  config: unknown = undefined
): ReadyProvider {
  return {
    key: {
      kind: "boot.resource-key",
      selectionId: selected.id,
      resourceId: selected.provides.id,
      lifetime: "process",
    },
    provider: selected,
    config,
    dependencies,
  };
}

function input(
  providers: readonly ReadyProvider[],
  observations: RuntimeObservationRecord[] = []
): ProviderLifecycleInput {
  return {
    processId: "test.process",
    providers,
    observation: {
      publish: (record) => {
        observations.push(record);
      },
    },
  };
}

function failure<A, E>(exit: Exit.Exit<A, E>): Cause.Cause<E> {
  if (Exit.isSuccess(exit)) throw new Error("Expected native startup failure.");
  return exit.cause;
}

async function startupExit(specification: ProviderLifecycleInput) {
  const runtime = ManagedRuntime.make(createProviderLifecycleLayer(specification));
  try {
    return await NativeEffect.runPromiseExit(runtime.contextEffect);
  } finally {
    await runtime.dispose();
  }
}

function deferred<T>() {
  let complete: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    complete = resolve;
  });
  return { promise, resolve: (value: T) => complete(value) };
}

describe("one native provider lifecycle", () => {
  test("forces an empty managed context and exposes only its closed handle", async () => {
    const handle = await createManagedRuntimeHandle(input([]));
    const resources = Context.get(handle.context, ProvisionedResourceValues);
    expect(Object.isFrozen(handle)).toBe(true);
    expect(Object.isFrozen(resources)).toBe(true);
    expect(Object.keys(handle)).toEqual([
      "kind",
      "processId",
      "context",
      "run",
      "runExit",
      "dispose",
    ]);
    expect(Object.keys(resources)).toEqual(["has", "get"]);
    expect(resources.has("missing")).toBe(false);
    expect(() => resources.get("missing")).toThrow(TypeError);
    expect(await handle.run(NativeEffect.succeed(3))).toBe(3);
    expect(Cause.hasFails(failure(await handle.runExit(NativeEffect.fail("typed"))))).toBe(true);
    await handle.dispose();
    await handle.dispose();
    expect(Cause.hasDies(failure(await handle.runExit(NativeEffect.void)))).toBe(true);
  });

  test("builds in boot order with exact dependencies and unredacted decoded config", async () => {
    const events: string[] = [];
    const firstValue = Object.freeze({ connection: "first" });
    const secondValue = Object.freeze({ connection: "second" });
    const config = Object.freeze({ token: "provider-local-secret" });
    const first = provider("first", () => {
      events.push("first.build");
      return providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: () => {
            events.push("first.acquire");
            return firstValue;
          },
          catch: (error) => error,
        }),
        release: (value) =>
          Effect.gen(function* () {
            expect(value).toBe(firstValue);
            events.push("first.release");
            yield* Effect.succeed(undefined);
          }),
      });
    });
    const requirement = requireResource({ resource: first.provides, reason: "first dependency" });
    const missing = requireResource({
      resource: first.provides,
      reason: "optional",
      optional: true,
    });
    const second = provider(
      "second",
      (context) => {
        events.push("second.build");
        expect(context.config).toBe(config);
        expect(Object.isFrozen(context.resources)).toBe(true);
        expect(context.resources.has(requirement)).toBe(true);
        expect(context.resources.get(requirement)).toBe(firstValue);
        expect(context.resources.get(missing)).toBeUndefined();
        expect(context.resources.has({ ...requirement })).toBe(false);
        expect(() => context.resources.get({ ...requirement })).toThrow(TypeError);
        return providerFx.acquireRelease({
          acquire: providerFx.tryPromise({
            try: () => {
              events.push("second.acquire");
              return secondValue;
            },
            catch: (error) => error,
          }),
          release: (value) =>
            Effect.gen(function* () {
              expect(value).toBe(secondValue);
              events.push("second.release");
              yield* Effect.succeed(undefined);
            }),
        });
      },
      [requirement, missing]
    );
    const handle = await createManagedRuntimeHandle(
      input([ready(first), ready(second, [[requirement, first.id]], config)])
    );
    expect(events).toEqual(["first.build", "first.acquire", "second.build", "second.acquire"]);
    expect(
      await handle.run(
        NativeEffect.map(ProvisionedResourceValues, (values) => values.get("second"))
      )
    ).toBe(secondValue);
    await handle.dispose();
    await handle.dispose();
    expect(events.slice(-2)).toEqual(["second.release", "first.release"]);
    expect(events.filter((event) => event.endsWith("release"))).toHaveLength(2);
  });

  test("distinguishes a successfully acquired undefined value from a missing selection", async () => {
    const selected = provider("undefined-value", () =>
      providerFx.acquireRelease({
        acquire: providerFx.succeed(undefined),
        release: () => providerFx.succeed(undefined),
      })
    );
    const handle = await createManagedRuntimeHandle(input([ready(selected)]));
    const resources = Context.get(handle.context, ProvisionedResourceValues);
    expect(resources.has(selected.id)).toBe(true);
    expect(resources.get(selected.id)).toBeUndefined();
    await handle.dispose();
  });

  test("maps acquire failures, rolls back only the acquired prefix and never releases a failed acquire", async () => {
    for (const asynchronous of [false, true]) {
      const events: string[] = [];
      const error = Object.freeze({ _tag: "AcquireFailure" });
      const first = provider("first", () =>
        providerFx.acquireRelease({
          acquire: providerFx.succeed("first-value"),
          release: () =>
            Effect.gen(function* () {
              events.push("first.release");
              yield* Effect.succeed(undefined);
            }),
        })
      );
      const second = provider("second", () =>
        providerFx.acquireRelease({
          acquire: providerFx.tryPromise({
            try: () => {
              if (asynchronous) return Promise.reject("source");
              throw "source";
            },
            catch: (cause) => {
              expect(cause).toBe("source");
              events.push("mapped");
              return error;
            },
          }),
          release: () =>
            Effect.gen(function* () {
              events.push("second.release");
              yield* Effect.succeed(undefined);
            }),
        })
      );
      const cause = failure(await startupExit(input([ready(first), ready(second)])));
      expect(Cause.hasFails(cause)).toBe(true);
      expect(Cause.hasDies(cause)).toBe(false);
      expect(Cause.squash(cause)).toBe(error);
      expect(events).toEqual(["mapped", "first.release"]);
    }
  });

  test("keeps build throws, forged plans, authored exceptions and mapper throws as defects", async () => {
    const defect = new TypeError("source-owned secret must not enter observations");
    const valid = providerFx.acquireRelease({
      acquire: providerFx.succeed(1),
      release: () => providerFx.succeed(undefined),
    });
    const cases: readonly RuntimeProvider["build"][] = [
      () => {
        throw defect;
      },
      () => ({ ...valid }),
      () =>
        providerFx.acquireRelease({
          acquire: Effect.gen(function* () {
            yield* Effect.succeed(undefined);
            throw defect;
          }),
          release: () => providerFx.succeed(undefined),
        }),
      () =>
        providerFx.acquireRelease({
          acquire: providerFx.tryPromise({
            try: () => Promise.reject("source"),
            catch: () => {
              throw defect;
            },
          }),
          release: () => providerFx.succeed(undefined),
        }),
    ];
    for (const build of cases) {
      let releases = 0;
      const first = provider("first", () =>
        providerFx.acquireRelease({
          acquire: providerFx.succeed(undefined),
          release: () =>
            Effect.gen(function* () {
              releases += 1;
              yield* Effect.succeed(undefined);
            }),
        })
      );
      const cause = failure(
        await startupExit(input([ready(first), ready(provider("broken", build))]))
      );
      expect(Cause.hasDies(cause)).toBe(true);
      expect(Cause.hasFails(cause)).toBe(false);
      expect(releases).toBe(1);
    }
  });

  test("failed handle creation rolls back and returns no mount handoff", async () => {
    let releases = 0;
    let produced = false;
    const first = provider("first", () =>
      providerFx.acquireRelease({
        acquire: providerFx.succeed(1),
        release: () =>
          Effect.gen(function* () {
            releases += 1;
            yield* Effect.succeed(undefined);
          }),
      })
    );
    const second = provider("second", () =>
      providerFx.acquireRelease({
        acquire: Effect.fail("failed startup"),
        release: () => providerFx.succeed(undefined),
      })
    );
    await expect(
      createManagedRuntimeHandle(input([ready(first), ready(second)])).then(() => {
        produced = true;
      })
    ).rejects.toBeDefined();
    expect(produced).toBe(false);
    expect(releases).toBe(1);
  });

  test("lets providers recover and observe expected cleanup failures inside infallible release", async () => {
    const observations: RuntimeObservationRecord[] = [];
    const selected = provider("recovering", (context) =>
      providerFx.acquireRelease({
        acquire: providerFx.succeed(1),
        release: () =>
          Effect.match(
            Effect.tryPromise({
              try: () => Promise.reject("expected cleanup"),
              catch: () => ({ _tag: "CleanupFailure" }),
            }),
            {
              onSuccess: () => undefined,
              onFailure: () =>
                context.observation.publish({
                  phase: "provisioning",
                  boundary: "provider.release",
                  kind: "cleanup.recovered",
                  correlationId: "test.process",
                  payload: { recovered: true },
                }),
            }
          ),
      })
    );
    const handle = await createManagedRuntimeHandle(input([ready(selected)], observations));
    await handle.dispose();
    expect(observations.map((record) => record.kind)).toEqual(["cleanup.recovered"]);
  });

  test("defers throwing release callbacks and continues reverse release after native defects", async () => {
    const events: string[] = [];
    const observations: RuntimeObservationRecord[] = [];
    const secret = "private-release-secret";
    const first = provider("first", () =>
      providerFx.acquireRelease({
        acquire: providerFx.succeed(1),
        release: () =>
          Effect.gen(function* () {
            events.push("first.release");
            yield* Effect.succeed(undefined);
          }),
      })
    );
    const second = provider("second", () =>
      providerFx.acquireRelease({
        acquire: providerFx.succeed(2),
        release: () => {
          events.push("second.release");
          throw new Error(secret);
        },
      })
    );
    const third = provider("third", () =>
      providerFx.acquireRelease({
        acquire: providerFx.succeed(3),
        release: () =>
          Effect.gen(function* () {
            events.push("third.release");
            yield* Effect.succeed(undefined);
            throw new Error(secret);
          }),
      })
    );
    const handle = await createManagedRuntimeHandle(
      input([ready(first), ready(second), ready(third)], observations)
    );
    expect(events).toEqual([]);
    await handle.dispose();
    await handle.dispose();
    expect(events).toEqual(["third.release", "second.release", "first.release"]);
    expect(observations.map((record) => record.kind)).toEqual([
      "provider.release.failed",
      "provider.release.failed",
    ]);
    expect(observations.map((record) => record.payload)).toEqual([
      {
        selectionId: "third",
        providerId: "third",
        typedFailure: false,
        defect: true,
        interrupted: false,
      },
      {
        selectionId: "second",
        providerId: "second",
        typedFailure: false,
        defect: true,
        interrupted: false,
      },
    ]);
    expect(JSON.stringify(observations)).not.toContain(secret);
  });

  test("contains malformed release results and continues native reverse cleanup", async () => {
    for (const invalid of [undefined, {}, 7]) {
      const events: string[] = [];
      const observed: unknown[] = [];
      const first = provider("first", () =>
        providerFx.acquireRelease({
          acquire: providerFx.succeed("first"),
          release: () =>
            Effect.gen(function* () {
              events.push("first.released");
              yield* Effect.succeed(undefined);
            }),
        })
      );
      const broken = provider("broken", () =>
        providerFx.acquireRelease({
          acquire: providerFx.succeed("broken"),
          release: () => {
            events.push("broken.released");
            return invalid as NativeEffect.Effect<void>;
          },
        })
      );
      const handle = await createManagedRuntimeHandle({
        ...input([ready(first), ready(broken)]),
        observation: {
          publish: (record) => {
            observed.push(record);
          },
        },
      });
      await handle.dispose();
      expect(events).toEqual(["broken.released", "first.released"]);
      expect(observed).toHaveLength(1);
      expect(observed[0]).toMatchObject({
        kind: "provider.release.failed",
        payload: { defect: true, typedFailure: false },
      });
      await handle.dispose();
      expect(events).toHaveLength(2);
    }
  });

  test("a throwing observation port cannot block remaining releases", async () => {
    const releases: string[] = [];
    const providers = ["first", "second"].map((id) =>
      ready(
        provider(id, () =>
          providerFx.acquireRelease({
            acquire: providerFx.succeed(id),
            release: () => {
              releases.push(id);
              throw new Error("release failure");
            },
          })
        )
      )
    );
    const handle = await createManagedRuntimeHandle({
      ...input(providers),
      observation: {
        publish() {
          throw new Error("observer failure");
        },
      },
    });
    await handle.dispose();
    expect(releases).toEqual(["second", "first"]);
  });

  test("registers one release after explicit retry success without rebuilding the provider", async () => {
    let builds = 0;
    let attempts = 0;
    let releases = 0;
    const selected = provider("retrying", () => {
      builds += 1;
      return providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: () => {
            attempts += 1;
            if (attempts < 3) throw "transient";
            return "value";
          },
          catch: (error) => error,
        }),
        release: () =>
          Effect.gen(function* () {
            releases += 1;
            yield* Effect.succeed(undefined);
          }),
        policy: { acquire: { retry: { times: 2 } } },
      });
    });
    const handle = await createManagedRuntimeHandle(input([ready(selected)]));
    expect([builds, attempts, releases]).toEqual([1, 3, 0]);
    await handle.dispose();
    expect(releases).toBe(1);
  });

  test("uses native acquisition masking to register release before stop", async () => {
    const entered = deferred<void>();
    const acquired = deferred<string>();
    const events: string[] = [];
    const selected = provider("masked", () =>
      providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: async () => {
            events.push("acquire.start");
            entered.resolve();
            const value = await acquired.promise;
            events.push("acquire.finish");
            return value;
          },
          catch: (error) => error,
        }),
        release: (value) =>
          Effect.gen(function* () {
            expect(value).toBe("lease");
            events.push("release");
            yield* Effect.succeed(undefined);
          }),
      })
    );
    const runtime = ManagedRuntime.make(createProviderLifecycleLayer(input([ready(selected)])));
    const context = runtime.context().then(
      () => {
        events.push("context.ready");
      },
      () => {
        events.push("context.failed");
      }
    );
    await entered.promise;
    let disposed = false;
    const disposing = runtime.dispose().then(() => {
      disposed = true;
      events.push("disposed");
    });
    await Promise.resolve();
    expect(disposed).toBe(false);
    acquired.resolve("lease");
    await Promise.all([context, disposing]);
    expect(events.indexOf("release")).toBeGreaterThan(events.indexOf("acquire.finish"));
    expect(events.indexOf("disposed")).toBeGreaterThan(events.indexOf("release"));
    expect(events.filter((event) => event === "release")).toHaveLength(1);
  });

  test("preserves explicit acquisition interruption without claiming cleanup of an unreturned value", async () => {
    const entered = deferred<void>();
    const foreign = deferred<string>();
    const foreignFinished = deferred<void>();
    const events: string[] = [];
    const selected = provider("interruptible", () =>
      providerFx.acquireRelease({
        acquire: Effect.interruptible(
          providerFx.tryPromise({
            try: async () => {
              events.push("started");
              entered.resolve();
              const value = await foreign.promise;
              events.push("foreign.finished");
              foreignFinished.resolve();
              return value;
            },
            catch: (error) => error,
          })
        ),
        release: () =>
          Effect.gen(function* () {
            events.push("released");
            yield* Effect.succeed(undefined);
          }),
      })
    );
    const runtime = ManagedRuntime.make(createProviderLifecycleLayer(input([ready(selected)])));
    const context = runtime.context().catch(() => {
      events.push("context.failed");
    });
    await entered.promise;
    await runtime.dispose();
    await context;
    expect(events).toEqual(["started", "context.failed"]);
    foreign.resolve("unreturned-value");
    await foreignFinished.promise;
    expect(events).toEqual(["started", "context.failed", "foreign.finished"]);
  });

  test("places the acquisition policy timeout outside registration and releases a late value", async () => {
    const events: string[] = [];
    const selected = provider("late", () =>
      providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: async () => {
            events.push("acquire.start");
            await new Promise((resolve) => setTimeout(resolve, 12));
            events.push("acquire.finish");
            return "late-value";
          },
          catch: (error) => error,
        }),
        release: (value) =>
          Effect.gen(function* () {
            expect(value).toBe("late-value");
            events.push("release");
            yield* Effect.succeed(undefined);
          }),
        policy: { acquire: { timeout: { duration: "1 ms" } } },
      })
    );
    const cause = failure(await startupExit(input([ready(selected)])));
    expect(Cause.hasFails(cause)).toBe(true);
    expect(Cause.squash(cause)).toEqual({ _tag: "HabitatTimeoutError", duration: "1 ms" });
    expect(events).toEqual(["acquire.start", "acquire.finish", "release"]);
  });
});

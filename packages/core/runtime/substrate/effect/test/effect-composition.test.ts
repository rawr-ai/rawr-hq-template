import { describe, expect, test } from "bun:test";
import { Cause, Exit, Effect as NativeEffect } from "effect";

import { Effect, type HabitatEffect } from "../../../definition/src/index";

function failure<A, E>(exit: Exit.Exit<A, E>): Cause.Cause<E> {
  if (Exit.isSuccess(exit)) throw new Error("Expected a native failure.");
  return exit.cause;
}

describe("native Habitat Effect composition", () => {
  test("remains lazy and rebuilds the authored generator on every execution", async () => {
    const calls: string[] = [];
    const effect = Effect.gen(function* () {
      calls.push("body");
      const value = yield* Effect.tryPromise({
        try: () => {
          calls.push("attempt");
          return 3;
        },
        catch: (error) => error,
      });
      return value * 2;
    });
    const native: NativeEffect.Effect<number, unknown> = effect;
    expect(calls).toEqual([]);
    expect(await NativeEffect.runPromise(native)).toBe(6);
    expect(await NativeEffect.runPromise(native)).toBe(6);
    expect(calls).toEqual(["body", "attempt", "body", "attempt"]);
  });

  test("matches native generator finally behavior on success, typed failure, defect and interruption", async () => {
    for (const outcome of ["success", "failure", "defect", "interruption"]) {
      const nativeTrace: string[] = [];
      const habitatTrace: string[] = [];
      const native = NativeEffect.gen(function* () {
        nativeTrace.push("entered");
        try {
          if (outcome === "failure") yield* NativeEffect.fail("failed");
          if (outcome === "defect") throw new Error("defect");
          if (outcome === "interruption") yield* NativeEffect.never;
          return "value";
        } finally {
          nativeTrace.push("finally");
        }
      });
      const habitat = Effect.gen(function* () {
        habitatTrace.push("entered");
        try {
          if (outcome === "failure") yield* Effect.fail("failed");
          if (outcome === "defect") throw new Error("defect");
          if (outcome === "interruption") {
            yield* Effect.tryPromise({
              try: () => new Promise<never>(() => {}),
              catch: () => "failed",
            });
          }
          return "value";
        } finally {
          habitatTrace.push("finally");
        }
      });
      const abort = new AbortController();
      const nativeRun = NativeEffect.runPromiseExit(native, { signal: abort.signal });
      const habitatRun = NativeEffect.runPromiseExit(habitat, {
        signal: abort.signal,
      });
      if (outcome === "interruption") abort.abort();
      const [nativeExit, habitatExit] = await Promise.all([nativeRun, habitatRun]);
      expect(habitatTrace).toEqual(nativeTrace);
      expect(habitatTrace).toEqual(
        outcome === "success" || outcome === "defect" ? ["entered", "finally"] : ["entered"]
      );
      expect(Exit.isSuccess(habitatExit)).toBe(Exit.isSuccess(nativeExit));
      if (Exit.isFailure(nativeExit) && Exit.isFailure(habitatExit)) {
        expect(Cause.hasFails(habitatExit.cause)).toBe(Cause.hasFails(nativeExit.cause));
        expect(Cause.hasDies(habitatExit.cause)).toBe(Cause.hasDies(nativeExit.cause));
        expect(Cause.hasInterrupts(habitatExit.cause)).toBe(Cause.hasInterrupts(nativeExit.cause));
      }
    }
  });

  test("maps both synchronous throws and rejected Promises through the exact mapper", async () => {
    for (const asynchronous of [false, true]) {
      const cause = new Error("source failure");
      const error = Object.freeze({ _tag: "AcquireError", source: cause });
      const mapped: unknown[] = [];
      const native = Effect.tryPromise({
        try: () => {
          if (asynchronous) return Promise.reject(cause);
          throw cause;
        },
        catch: (input) => {
          mapped.push(input);
          return error;
        },
      });
      expect(mapped).toEqual([]);
      const exit = await NativeEffect.runPromiseExit(native);
      const failed = failure(exit);
      expect(Cause.hasFails(failed)).toBe(true);
      expect(Cause.hasDies(failed)).toBe(false);
      expect(Cause.squash(failed)).toBe(error);
      expect(mapped).toEqual([cause]);
    }
  });

  test("keeps thrown mappers and authored body exceptions as defects", async () => {
    const defect = new TypeError("mapper defect");
    const throwingMapper = Effect.tryPromise({
      try: () => Promise.reject("expected failure"),
      catch: () => {
        throw defect;
      },
    });
    const throwingBody = Effect.gen(function* () {
      yield* Effect.succeed(undefined);
      throw defect;
    });
    for (const effect of [throwingMapper, throwingBody]) {
      const failed = failure(await NativeEffect.runPromiseExit(effect));
      expect(Cause.hasDies(failed)).toBe(true);
      expect(Cause.hasFails(failed)).toBe(false);
      expect(Cause.squash(failed)).toBe(defect);
    }
  });

  test("preserves typed-error transforms and residual tagged errors", async () => {
    const first = Object.freeze({ _tag: "First", value: 1 });
    const second = Object.freeze({ _tag: "Second", value: 2 });
    const selected: HabitatEffect<never, typeof first | typeof second> = Effect.fail(first);
    expect(
      await NativeEffect.runPromise(
        Effect.catchTag(selected, "First", (error) => Effect.succeed(error.value))
      )
    ).toBe(1);
    expect(
      await NativeEffect.runPromise(
        Effect.catchTags(selected, { First: (error) => Effect.succeed(error.value + 2) })
      )
    ).toBe(3);
    const unhandled: HabitatEffect<never, typeof first | typeof second> = Effect.fail(second);
    const residual = Effect.catchTags(unhandled, { First: () => Effect.succeed(0) });
    expect(Cause.squash(failure(await NativeEffect.runPromiseExit(residual)))).toBe(second);
    const mapped = Effect.mapError(Effect.fail(first), (error) => ({ value: error.value + 5 }));
    expect(
      await NativeEffect.runPromise(Effect.orElse(mapped, (error) => Effect.succeed(error.value)))
    ).toBe(6);
  });

  test("matches successes and typed failures without catching defects", async () => {
    const cases: readonly (readonly [HabitatEffect<number, number>, number])[] = [
      [Effect.succeed(2), 3],
      [Effect.fail(2), 4],
    ];
    for (const [effect, expected] of cases) {
      expect(
        await NativeEffect.runPromise(
          Effect.match(effect, {
            onSuccess: (value) => value + 1,
            onFailure: (error) => error + 2,
          })
        )
      ).toBe(expected);
    }
    const defect = new Error("not a typed error");
    let recovered = false;
    const effect = Effect.match(
      Effect.gen(function* () {
        yield* Effect.succeed(undefined);
        throw defect;
      }),
      {
        onSuccess: () => 1,
        onFailure: () => {
          recovered = true;
          return 2;
        },
      }
    );
    expect(Cause.squash(failure(await NativeEffect.runPromiseExit(effect)))).toBe(defect);
    expect(recovered).toBe(false);
  });

  test("composes record concurrency, discard and spans through native execution", async () => {
    let active = 0;
    let maximum = 0;
    const operation = (value: number) =>
      Effect.tryPromise({
        try: async () => {
          active += 1;
          maximum = Math.max(maximum, active);
          await new Promise((resolve) => setTimeout(resolve, 2));
          active -= 1;
          return value;
        },
        catch: (error) => error,
      });
    const effects = { a: operation(1), b: operation(2), c: operation(3), d: operation(4) };
    expect(
      await NativeEffect.runPromise(
        Effect.withSpan("batch", Effect.all(effects, { concurrency: 2 }), { count: 4 })
      )
    ).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    expect(maximum).toBe(2);
    const discarded: NativeEffect.Effect<void> = Effect.all(
      { a: Effect.succeed(1) },
      { discard: true }
    );
    expect(await NativeEffect.runPromise(discarded)).toBeUndefined();
  });

  test("preserves every exact record key without changing the result prototype", async () => {
    const value = Object.freeze({ lease: true });
    const entries = ["__proto__", "constructor", "toString", "regular"].map(
      (key): readonly [string, HabitatEffect<typeof value>] => [key, Effect.succeed(value)]
    );
    const result = await NativeEffect.runPromise(Effect.all(Object.fromEntries(entries)));
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.keys(result)).toEqual(entries.map(([key]) => key));
    for (const [key] of entries) {
      expect(Object.hasOwn(result, key)).toBe(true);
      expect(result[key]).toBe(value);
    }
  });

  test("uses Habitat timeout errors and translates the Habitat ms spelling", async () => {
    const pending = Effect.tryPromise({
      try: () => new Promise<never>(() => {}),
      catch: (error) => error,
    });
    for (const duration of [1, "1 ms"] satisfies Array<1 | "1 ms">) {
      const failed = failure(await NativeEffect.runPromiseExit(Effect.timeout(pending, duration)));
      expect(Cause.hasDies(failed)).toBe(false);
      expect(Cause.squash(failed)).toEqual({ _tag: "HabitatTimeoutError", duration });
    }
    expect(await NativeEffect.runPromise(Effect.timeout(Effect.succeed(4), "1 minutes"))).toBe(4);
    const sourceError = Object.freeze({ _tag: "Source" });
    expect(
      Cause.squash(
        failure(await NativeEffect.runPromiseExit(Effect.timeout(Effect.fail(sourceError), 20)))
      )
    ).toBe(sourceError);
  });

  test("defaults to zero retries and bounds explicit fixed and exponential retries", async () => {
    for (const policy of [
      {},
      { times: 2 },
      { times: 2, backoff: "fixed", delay: 0 },
      { times: 2, backoff: "exponential", delay: 1 },
    ] satisfies Parameters<typeof Effect.retry>[1][]) {
      let attempts = 0;
      const effect = Effect.retry(
        Effect.tryPromise({
          try: () => {
            attempts += 1;
            throw "retryable";
          },
          catch: (error) => error,
        }),
        policy
      );
      const failed = failure(await NativeEffect.runPromiseExit(effect));
      expect(Cause.hasFails(failed)).toBe(true);
      expect(attempts).toBe((policy.times ?? 0) + 1);
    }
  });

  test("refuses invalid consumed retry policies as defects and does not retry defects", async () => {
    for (const policy of [
      { times: -1 },
      { times: Number.NaN },
      { times: 1.5 },
      { times: 1, backoff: "fixed" },
    ] satisfies Parameters<typeof Effect.retry>[1][]) {
      const exit = await NativeEffect.runPromiseExit(Effect.retry(Effect.fail("failure"), policy));
      expect(Cause.hasDies(failure(exit))).toBe(true);
    }
    let attempts = 0;
    const effect = Effect.retry(
      Effect.gen(function* () {
        yield* Effect.succeed(undefined);
        attempts += 1;
        throw new Error("defect");
      }),
      { times: 3 }
    );
    expect(Cause.hasDies(failure(await NativeEffect.runPromiseExit(effect)))).toBe(true);
    expect(attempts).toBe(1);
  });

  test("preserves explicit interruption without claiming foreign Promise cancellation", async () => {
    let resolve: (value: number) => void = () => {};
    let started: () => void = () => {};
    const entered = new Promise<void>((done) => {
      started = done;
    });
    const effect = Effect.interruptible(
      Effect.tryPromise({
        try: () => {
          started();
          return new Promise<number>((done) => {
            resolve = done;
          });
        },
        catch: (error) => error,
      })
    );
    const abort = new AbortController();
    const running = NativeEffect.runPromiseExit(NativeEffect.uninterruptible(effect), {
      signal: abort.signal,
    });
    await entered;
    abort.abort();
    expect(Cause.hasInterrupts(failure(await running))).toBe(true);
    resolve(1);
  });
});

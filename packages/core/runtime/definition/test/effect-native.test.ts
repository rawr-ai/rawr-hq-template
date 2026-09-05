import "@orpc/experimental-effect/extensions/effect";
import { expect, test } from "bun:test";
import { call, os } from "@orpc/server";
import { Cause, Context, Exit, Effect as NativeEffect } from "effect";
import { Type } from "typebox";

import { standard } from "../../schema/src";
import {
  Effect,
  type HabitatDurationInput,
  type HabitatEffect,
  type HabitatRetryPolicy,
  isHabitatEffect,
} from "../src";

type TypesEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
      ? true
      : false
    : false;

function failure<A, E>(exit: Exit.Exit<A, E>): Cause.Cause<E> {
  if (Exit.isSuccess(exit)) throw new Error("Expected a native failure.");
  return exit.cause;
}

test("curates native constructors without exporting runtime authority or touching values", () => {
  const keys = [
    "succeed",
    "fail",
    "gen",
    "tryPromise",
    "all",
    "timeout",
    "retry",
    "mapError",
    "catchTag",
    "catchTags",
    "orElse",
    "match",
    "withSpan",
    "interruptible",
  ];
  expect(Object.keys(Effect).sort()).toEqual(keys.sort());
  expect(Object.isFrozen(Effect)).toBe(true);
  expect(Effect.succeed).toBe(NativeEffect.succeed);
  expect(Effect.gen).toBe(NativeEffect.gen);
  expect(Effect.interruptible).toBe(NativeEffect.interruptible);
  expect(isHabitatEffect).toBe(NativeEffect.isEffect);

  let calls = 0;
  const source = NativeEffect.sync(() => ++calls);
  const sourceKeys = Reflect.ownKeys(source);
  const extensible = Object.isExtensible(source);
  const values = [
    Effect.timeout(source, 10),
    Effect.retry(source, { times: 1 }),
    Effect.all({ source }),
    Effect.withSpan("cold", source, { source: "native" }),
    Effect.interruptible(source),
  ];
  expect(values.every(isHabitatEffect)).toBe(true);
  expect(calls).toBe(0);
  expect(Reflect.ownKeys(source)).toEqual(sourceKeys);
  expect(Object.isExtensible(source)).toBe(extensible);
  expect(isHabitatEffect({ kind: "habitat.effect" })).toBe(false);
});

test("composes native resource and service operations in both generator directions", async () => {
  interface ReadyClock {
    readonly now: number;
  }
  const clock = Context.Service<ReadyClock>("definition-test/native-clock");
  let resourceReads = 0;
  let serviceCalls = 0;
  let bodyCalls = 0;
  const resource = {
    read: () =>
      NativeEffect.map(NativeEffect.service(clock), (ready) => {
        resourceReads += 1;
        return ready.now;
      }),
  };
  const service = {
    next: (value: number) =>
      NativeEffect.sync(() => {
        serviceCalls += 1;
        return value + 1;
      }),
  };
  const program = Effect.gen(function* () {
    bodyCalls += 1;
    const value = yield* resource.read();
    return yield* service.next(value);
  });
  const channelsMatch: TypesEqual<
    typeof program,
    NativeEffect.Effect<number, never, ReadyClock>
  > = true;
  const native = NativeEffect.gen(function* () {
    return (yield* program) + (yield* Effect.succeed(2));
  });
  expect(channelsMatch).toBe(true);
  expect([resourceReads, serviceCalls, bodyCalls]).toEqual([0, 0, 0]);
  expect(
    await NativeEffect.runPromise(NativeEffect.provideService(native, clock, { now: 7 }))
  ).toBe(10);
  expect([resourceReads, serviceCalls, bodyCalls]).toEqual([1, 1, 1]);
});

test("passes curated programs directly to the official native oRPC Effect generator", async () => {
  let calls = 0;
  const procedure = os
    .$context<{ readonly ready: number }>()
    .input(standard(Type.Number()))
    .effect(function* ({ input, context }) {
      return yield* Effect.gen(function* () {
        calls += 1;
        const value = yield* NativeEffect.succeed(context.ready);
        return yield* Effect.succeed(value + input);
      });
    });
  expect(calls).toBe(0);
  expect(await call(procedure, 3, { context: { ready: 7 } })).toBe(10);
  expect(calls).toBe(1);
});

test("maps sync throws and rejections but preserves mapper exceptions as native defects", async () => {
  const original = new Error("original");
  const mapped = Object.freeze({ _tag: "Mapped", original });
  const defect = new TypeError("mapper defect");
  for (const asynchronous of [false, true]) {
    const seen: unknown[] = [];
    const attempt = () => {
      if (asynchronous) return Promise.reject(original);
      throw original;
    };
    const effect = Effect.tryPromise({
      try: attempt,
      catch: (cause) => {
        seen.push(cause);
        return mapped;
      },
    });
    expect(seen).toEqual([]);
    const cause = failure(await NativeEffect.runPromiseExit(effect));
    expect(Cause.hasFails(cause)).toBe(true);
    expect(Cause.hasDies(cause)).toBe(false);
    expect(Cause.squash(cause)).toBe(mapped);
    expect(seen).toEqual([original]);

    const brokenMapper = Effect.tryPromise({
      try: attempt,
      catch: () => {
        throw defect;
      },
    });
    const broken = failure(await NativeEffect.runPromiseExit(brokenMapper));
    expect(Cause.hasDies(broken)).toBe(true);
    expect(Cause.hasFails(broken)).toBe(false);
    expect(Cause.squash(broken)).toBe(defect);
  }
});

test("retains errors for optional or absent tagged handlers", async () => {
  interface Failure {
    readonly _tag: "Failure";
  }
  const error: Failure = { _tag: "Failure" };
  const handlers: { readonly Failure?: (error: Failure) => HabitatEffect<number> } = {};
  const recovered = Effect.catchTags(Effect.fail(error), handlers);
  const channelsMatch: TypesEqual<typeof recovered, HabitatEffect<number, Failure>> = true;
  expect(channelsMatch).toBe(true);
  expect(Cause.squash(failure(await NativeEffect.runPromiseExit(recovered)))).toBe(error);
  const absent = Effect.catchTags(Effect.fail(error), { Failure: undefined });
  const absentChannelsMatch: TypesEqual<typeof absent, HabitatEffect<never, Failure>> = true;
  expect(absentChannelsMatch).toBe(true);
  expect(Cause.squash(failure(await NativeEffect.runPromiseExit(absent)))).toBe(error);
});

test("keeps retry defaults and invalid policy failures cold until native execution", async () => {
  let attempts = 0;
  const source = NativeEffect.suspend(() => {
    attempts += 1;
    return NativeEffect.fail("failed");
  });
  const noRetries = Effect.retry(source, {});
  expect(attempts).toBe(0);
  expect(Cause.squash(failure(await NativeEffect.runPromiseExit(noRetries)))).toBe("failed");
  expect(attempts).toBe(1);
  await NativeEffect.runPromiseExit(Effect.retry(source, { times: 2 }));
  expect(attempts).toBe(4);

  const invalidPolicies: readonly HabitatRetryPolicy[] = [
    { times: -1 },
    { times: 0.5 },
    { times: Number.NaN },
    { times: Number.POSITIVE_INFINITY },
    { times: 1, backoff: "fixed" },
    { times: 1, backoff: "exponential" },
    { times: 1, delay: -1 },
  ];
  for (const policy of invalidPolicies) {
    const cause = failure(await NativeEffect.runPromiseExit(Effect.retry(source, policy)));
    expect(Cause.hasDies(cause)).toBe(true);
    expect(Cause.squash(cause)).toBeInstanceOf(TypeError);
  }
  expect(attempts).toBe(4);
});

test("retains authored timeout spelling and refuses invalid duration before the source", async () => {
  const timed = Effect.timeout(NativeEffect.never, "1 ms");
  expect(Cause.squash(failure(await NativeEffect.runPromiseExit(timed)))).toEqual({
    _tag: "HabitatTimeoutError",
    duration: "1 ms",
  });
  let calls = 0;
  const source = NativeEffect.sync(() => ++calls);
  const invalid: readonly HabitatDurationInput[] = [
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "-1 seconds",
    "1e308 minutes",
  ];
  for (const duration of invalid) {
    const cause = failure(await NativeEffect.runPromiseExit(Effect.timeout(source, duration)));
    expect(Cause.hasDies(cause)).toBe(true);
    expect(Cause.squash(cause)).toBeInstanceOf(TypeError);
  }
  expect(calls).toBe(0);
});

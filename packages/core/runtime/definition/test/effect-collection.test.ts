import { expect, test } from "bun:test";
import { Effect as NativeEffect } from "effect";

import { Effect, type HabitatEffect, isHabitatEffect } from "../src/index";

test("cold collection preserves native discard typing without running its body", async () => {
  let calls = 0;
  const effects = {
    count: Effect.tryPromise({
      try: () => {
        calls++;
        return 7;
      },
      catch: () => "failed" as const,
    }),
  };
  const collected: HabitatEffect<{ readonly count: number }, "failed"> = Effect.all(effects);
  const discarded: HabitatEffect<void, "failed"> = Effect.all(effects, { discard: true });
  const conditional = (
    discard: boolean
  ): HabitatEffect<void | { readonly count: number }, "failed"> => Effect.all(effects, { discard });
  // @ts-expect-error Discarded success is void, not a fabricated result record.
  const notCollected: HabitatEffect<{ readonly count: number }, "failed"> = Effect.all(effects, {
    discard: true,
  });
  expect(isHabitatEffect(collected)).toBe(true);
  expect(isHabitatEffect(discarded)).toBe(true);
  expect(isHabitatEffect(conditional(false))).toBe(true);
  expect(isHabitatEffect(notCollected)).toBe(true);
  expect(calls).toBe(0);
  expect(await NativeEffect.runPromise(collected)).toEqual({ count: 7 });
  expect(await NativeEffect.runPromise(discarded)).toBeUndefined();
  expect(await NativeEffect.runPromise(conditional(false))).toEqual({ count: 7 });
  expect(await NativeEffect.runPromise(conditional(true))).toBeUndefined();
  expect(calls).toBe(4);
});

test("collects exact own keys from a cold snapshot without altering native values", async () => {
  let calls = 0;
  const native = NativeEffect.sync(() => ++calls);
  const effects = {
    ["__proto__"]: native,
    constructor: NativeEffect.succeed("constructor"),
    toString: NativeEffect.succeed("string"),
  };
  const collected = Effect.all(effects, { concurrency: 1 });
  effects.__proto__ = NativeEffect.succeed(99);
  expect(calls).toBe(0);
  const result = await NativeEffect.runPromise(collected);
  expect(Object.keys(result)).toEqual(["__proto__", "constructor", "toString"]);
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.getOwnPropertyDescriptor(result, "__proto__")?.value).toBe(1);
  expect(result.constructor).toBe("constructor");
  expect(result.toString).toBe("string");
  expect(calls).toBe(1);
});

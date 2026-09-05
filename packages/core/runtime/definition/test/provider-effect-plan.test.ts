import { describe, expect, test } from "bun:test";
import { Effect as NativeEffect } from "effect";

import type {
  HabitatEffect,
  ProviderAcquire,
  ProviderEffectPlan,
  ProviderFx,
  ProviderRelease,
} from "../src/index";
import { isHabitatEffect, providerFx, readProviderEffectPlan } from "../src/index";

type TypesEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

type HabitatEffectChannels<TEffect> =
  TEffect extends HabitatEffect<infer TValue, infer TError, infer TRequirements>
    ? readonly [TValue, TError, TRequirements]
    : never;

type ProviderEffectPlanChannels<TPlan> =
  TPlan extends ProviderEffectPlan<infer TValue, infer TAcquireError>
    ? readonly [TValue, TAcquireError]
    : never;

type IsPromise<TValue> = TValue extends PromiseLike<unknown> ? true : false;

interface TypeOracleValue {
  readonly id: "provider-value";
}

interface TypeOracleAcquireError {
  readonly _tag: "TypeOracleAcquireError";
}

interface TypeOracleReleaseError {
  readonly _tag: "TypeOracleReleaseError";
}

function createProviderEffectTypeOracle() {
  const acquire = providerFx.tryPromise<TypeOracleValue, TypeOracleAcquireError>({
    try: () => ({ id: "provider-value" }),
    catch: () => ({ _tag: "TypeOracleAcquireError" }),
  });
  const release: ProviderRelease<TypeOracleValue> = (value) => {
    const exactValue: TypeOracleValue = value;
    void exactValue;
    return providerFx.succeed(undefined);
  };
  const plan = providerFx.acquireRelease({ acquire, release });
  const success = providerFx.succeed<TypeOracleValue>({ id: "provider-value" });

  return { acquire, plan, release, success };
}

type ProviderEffectTypeOracleShape = ReturnType<typeof createProviderEffectTypeOracle>;

export type ProviderEffectTypeOracle = readonly [
  Assert<
    TypesEqual<
      ProviderFx<TypeOracleValue, TypeOracleAcquireError>,
      HabitatEffect<TypeOracleValue, TypeOracleAcquireError, never>
    >
  >,
  Assert<
    TypesEqual<
      ProviderAcquire<TypeOracleValue, TypeOracleAcquireError>,
      ProviderFx<TypeOracleValue, TypeOracleAcquireError>
    >
  >,
  Assert<
    TypesEqual<
      HabitatEffectChannels<ProviderEffectTypeOracleShape["acquire"]>,
      readonly [TypeOracleValue, TypeOracleAcquireError, never]
    >
  >,
  Assert<
    TypesEqual<
      HabitatEffectChannels<ProviderEffectTypeOracleShape["success"]>,
      readonly [TypeOracleValue, never, never]
    >
  >,
  Assert<
    TypesEqual<
      ProviderEffectPlanChannels<ProviderEffectTypeOracleShape["plan"]>,
      readonly [TypeOracleValue, TypeOracleAcquireError]
    >
  >,
  Assert<TypesEqual<Parameters<ProviderEffectTypeOracleShape["release"]>, [TypeOracleValue]>>,
  Assert<TypesEqual<ReturnType<ProviderEffectTypeOracleShape["release"]>, ProviderFx<void, never>>>,
  Assert<TypesEqual<IsPromise<ProviderEffectTypeOracleShape["acquire"]>, false>>,
  Assert<TypesEqual<IsPromise<ProviderEffectTypeOracleShape["plan"]>, false>>,
  Assert<
    TypesEqual<
      Extract<keyof typeof providerFx, string>,
      "acquireRelease" | "succeed" | "tryPromise"
    >
  >,
  Assert<
    TypesEqual<
      Extract<keyof ProviderEffectTypeOracleShape["plan"], string>,
      "acquire" | "kind" | "release"
    >
  >,
];

declare const providerEffectTypeOracle: ProviderEffectTypeOracleShape;
declare const acquireWithRequirements: HabitatEffect<
  TypeOracleValue,
  TypeOracleAcquireError,
  { readonly clock: true }
>;
declare const fallibleRelease: ProviderFx<void, TypeOracleReleaseError>;

if (false) {
  const genuinePlan: ProviderEffectPlan<TypeOracleValue, TypeOracleAcquireError> =
    providerEffectTypeOracle.plan;
  const structuralLookalike = {
    kind: "provider.effect-plan",
    acquire: {
      boundary: "provider.acquire",
      policy: undefined,
      telemetry: undefined,
    },
    release: {
      boundary: "provider.release",
      policy: undefined,
      telemetry: undefined,
    },
  } as const;

  genuinePlan;
  // @ts-expect-error A public structural lookalike lacks the private nominal witness.
  const forgedPlan: ProviderEffectPlan<TypeOracleValue, TypeOracleAcquireError> =
    structuralLookalike;
  // @ts-expect-error A ProviderFx value is not a Promise result.
  const promisedAcquire: Promise<TypeOracleValue> = providerEffectTypeOracle.acquire;
  forgedPlan;
  promisedAcquire;

  // @ts-expect-error Release is required for every provider plan.
  providerFx.acquireRelease({ acquire: providerEffectTypeOracle.acquire });
  const optionalReleaseInput: {
    readonly acquire: ProviderFx<TypeOracleValue, TypeOracleAcquireError>;
    readonly release?: ProviderRelease<TypeOracleValue>;
  } = {
    acquire: providerEffectTypeOracle.acquire,
    release: providerEffectTypeOracle.release,
  };
  // @ts-expect-error An optional release field cannot satisfy the required release contract.
  providerFx.acquireRelease(optionalReleaseInput);

  providerFx.acquireRelease({
    // @ts-expect-error Acquire is a ProviderFx value, never a thunk.
    acquire: () => providerEffectTypeOracle.acquire,
    release: providerEffectTypeOracle.release,
  });
  providerFx.acquireRelease({
    // @ts-expect-error Acquire is a ProviderFx value, never a Promise.
    acquire: Promise.resolve({ id: "provider-value" } as const),
    release: providerEffectTypeOracle.release,
  });
  providerFx.acquireRelease({
    // @ts-expect-error Acquire is a ProviderFx value, never an acquired raw value.
    acquire: { id: "provider-value" } as const,
    release: providerEffectTypeOracle.release,
  });
  providerFx.acquireRelease({
    // @ts-expect-error Provider acquisition cannot carry Effect requirements.
    acquire: acquireWithRequirements,
    release: providerEffectTypeOracle.release,
  });
  providerFx.acquireRelease({
    acquire: providerEffectTypeOracle.acquire,
    // @ts-expect-error Release must return ProviderFx<void, never>, never a Promise.
    release: async () => undefined,
  });
  providerFx.acquireRelease({
    acquire: providerEffectTypeOracle.acquire,
    // @ts-expect-error Release cannot retain a typed failure channel.
    release: () => fallibleRelease,
  });
  providerFx.acquireRelease({
    acquire: providerEffectTypeOracle.acquire,
    policy: {
      acquire: {},
      // @ts-expect-error Provider policy metadata admits only acquire and release members.
      invoke: {},
    },
    release: providerEffectTypeOracle.release,
  });
}

function expectFrozenEnumerableDataProperties(value: object, keys: readonly string[]): void {
  expect(Object.isFrozen(value)).toBe(true);
  expect(Object.keys(value)).toEqual([...keys]);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    expect(descriptor).toBeDefined();
    expect(descriptor?.configurable).toBe(false);
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.writable).toBe(false);
    expect(descriptor).toHaveProperty("value");
  }
}

function expectRecursivelyFrozenPublicData(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectRecursivelyFrozenPublicData(nested);
}

describe("provider Effect plans", () => {
  test("exposes an exact frozen facade that delegates cold native Effect construction", async () => {
    let attemptCalls = 0;
    let recoveryCalls = 0;
    const value = { id: "cold-value" } as const;
    const attempt = () => {
      attemptCalls += 1;
      return value;
    };
    const recover = (_cause: unknown) => {
      recoveryCalls += 1;
      return { _tag: "ColdFailure" } as const;
    };

    const success = providerFx.succeed(value);
    const attempted = providerFx.tryPromise({ try: attempt, catch: recover });

    expectFrozenEnumerableDataProperties(providerFx, ["succeed", "tryPromise", "acquireRelease"]);
    expect(isHabitatEffect(success)).toBe(true);
    expect(isHabitatEffect(attempted)).toBe(true);
    expect(attempted).not.toBeInstanceOf(Promise);
    expect(attemptCalls).toBe(0);
    expect(recoveryCalls).toBe(0);
    expect(await NativeEffect.runPromise(success)).toBe(value);
    expect(await NativeEffect.runPromise(attempted)).toBe(value);
    expect(attemptCalls).toBe(1);
    expect(recoveryCalls).toBe(0);
  });

  test("constructs the exact public plan and rejects copied-witness forgeries", () => {
    let releaseCalls = 0;
    const value = { id: "exact-value" } as const;
    const acquire = providerFx.succeed(value);
    const release: ProviderRelease<typeof value> = () => {
      releaseCalls += 1;
      return providerFx.succeed(undefined);
    };
    const plan = providerFx.acquireRelease({ acquire, release });

    expectFrozenEnumerableDataProperties(plan, ["kind", "acquire", "release"]);
    expectFrozenEnumerableDataProperties(plan.acquire, ["boundary", "policy", "telemetry"]);
    expectFrozenEnumerableDataProperties(plan.release, ["boundary", "policy", "telemetry"]);
    expect(plan.acquire).toEqual({
      boundary: "provider.acquire",
      policy: undefined,
      telemetry: undefined,
    });
    expect(plan.release).toEqual({
      boundary: "provider.release",
      policy: undefined,
      telemetry: undefined,
    });

    const witness = readProviderEffectPlan(plan);
    expect(Object.isFrozen(witness)).toBe(true);
    expect(Object.keys(witness)).toEqual(["acquire", "release"]);
    expect(witness.acquire).toBe(acquire);
    expect(witness.release).toBe(release);
    expect(releaseCalls).toBe(0);

    const symbols = Object.getOwnPropertySymbols(plan);
    expect(symbols).toHaveLength(1);
    const witnessSymbol = symbols[0];
    if (witnessSymbol === undefined) throw new TypeError("Expected a private witness symbol.");
    const witnessDescriptor = Object.getOwnPropertyDescriptor(plan, witnessSymbol);
    expect(witnessDescriptor).toEqual({
      configurable: false,
      enumerable: false,
      value: witness,
      writable: false,
    });
    if (witnessDescriptor === undefined) {
      throw new TypeError("Expected a private witness descriptor.");
    }

    const structuralLookalike = Object.freeze({
      kind: "provider.effect-plan" as const,
      acquire: plan.acquire,
      release: plan.release,
    });
    expect(() =>
      readProviderEffectPlan(
        structuralLookalike as unknown as ProviderEffectPlan<typeof value, never>
      )
    ).toThrow(TypeError);

    const copiedWitnessLookalike = {
      kind: "provider.effect-plan" as const,
      acquire: plan.acquire,
      release: plan.release,
    };
    Object.defineProperty(copiedWitnessLookalike, witnessSymbol, witnessDescriptor);
    Object.freeze(copiedWitnessLookalike);
    expect(() =>
      readProviderEffectPlan(
        copiedWitnessLookalike as unknown as ProviderEffectPlan<typeof value, never>
      )
    ).toThrow(TypeError);
    expect(releaseCalls).toBe(0);
  });

  test("fresh-copies and recursively freezes metadata without touching opaque bodies", () => {
    let acquireBodyTouches = 0;
    let acquireCalls = 0;
    let recoveryCalls = 0;
    let releaseBodyTouches = 0;
    let releaseCalls = 0;
    const value = { id: "opaque-value" } as const;
    const acquireTarget = providerFx.tryPromise({
      try: () => {
        acquireCalls += 1;
        return value;
      },
      catch: (_cause) => {
        recoveryCalls += 1;
        return { _tag: "OpaqueFailure" } as const;
      },
    });
    const acquire = new Proxy(acquireTarget, {
      get: (target, property, receiver) => {
        acquireBodyTouches += 1;
        return Reflect.get(target, property, receiver);
      },
      getOwnPropertyDescriptor: (target, property) => {
        acquireBodyTouches += 1;
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      ownKeys: (target) => {
        acquireBodyTouches += 1;
        return Reflect.ownKeys(target);
      },
      preventExtensions: (target) => {
        acquireBodyTouches += 1;
        return Reflect.preventExtensions(target);
      },
    });
    const releaseTarget: ProviderRelease<typeof value> = () => {
      releaseCalls += 1;
      return providerFx.succeed(undefined);
    };
    const release = new Proxy(releaseTarget, {
      apply: (target, thisArgument, argumentsList) => {
        releaseCalls += 1;
        return Reflect.apply(target, thisArgument, argumentsList);
      },
      get: (target, property, receiver) => {
        releaseBodyTouches += 1;
        return Reflect.get(target, property, receiver);
      },
      getOwnPropertyDescriptor: (target, property) => {
        releaseBodyTouches += 1;
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      ownKeys: (target) => {
        releaseBodyTouches += 1;
        return Reflect.ownKeys(target);
      },
      preventExtensions: (target) => {
        releaseBodyTouches += 1;
        return Reflect.preventExtensions(target);
      },
    });
    const acquireRetry = {
      times: 2,
      backoff: "fixed" as const,
      delay: 5,
      ignored: "surplus",
    };
    const acquireTimeout = { duration: 100, ignored: "surplus" };
    const acquirePolicy = {
      retry: acquireRetry,
      timeout: acquireTimeout,
      interruptible: true,
      ignored: "surplus",
    };
    const releasePolicy = { interruptible: false, ignored: "surplus" };
    const policy = { acquire: acquirePolicy, release: releasePolicy, ignored: "surplus" };
    const acquireTelemetry = { attempt: 1, lane: "provider" };
    const releaseTelemetry = { attempt: 2, lane: "provider" };
    const telemetry = {
      acquire: acquireTelemetry,
      release: releaseTelemetry,
      ignored: "surplus",
    };

    const first = providerFx.acquireRelease({ acquire, release, policy, telemetry });
    const second = providerFx.acquireRelease({ acquire, release, policy, telemetry });
    const firstWitness = readProviderEffectPlan(first);
    const secondWitness = readProviderEffectPlan(second);

    expect(acquireCalls).toBe(0);
    expect(recoveryCalls).toBe(0);
    expect(releaseCalls).toBe(0);
    expect(acquireBodyTouches).toBe(0);
    expect(releaseBodyTouches).toBe(0);
    expect(firstWitness.acquire).toBe(acquire);
    expect(firstWitness.release).toBe(release);
    expect(secondWitness.acquire).toBe(acquire);
    expect(secondWitness.release).toBe(release);
    expect(Object.isFrozen(releaseTarget)).toBe(false);

    expect(first).not.toBe(second);
    expect(first.acquire).not.toBe(second.acquire);
    expect(first.release).not.toBe(second.release);
    expect(first.acquire.policy).not.toBe(acquirePolicy);
    expect(first.release.policy).not.toBe(releasePolicy);
    expect(first.acquire.telemetry).not.toBe(acquireTelemetry);
    expect(first.release.telemetry).not.toBe(releaseTelemetry);
    expect(first.acquire.policy).not.toBe(second.acquire.policy);
    expect(first.release.policy).not.toBe(second.release.policy);
    expect(first.acquire.telemetry).not.toBe(second.acquire.telemetry);
    expect(first.release.telemetry).not.toBe(second.release.telemetry);
    expect(firstWitness).not.toBe(secondWitness);
    expect(first.acquire.policy?.retry).not.toBe(acquireRetry);
    expect(first.acquire.policy?.timeout).not.toBe(acquireTimeout);
    expect(Object.keys(first.acquire.policy ?? {})).toEqual(["retry", "timeout", "interruptible"]);
    expect(Object.keys(first.acquire.policy?.retry ?? {})).toEqual(["times", "backoff", "delay"]);
    expect(Object.keys(first.acquire.policy?.timeout ?? {})).toEqual(["duration"]);
    expect(Object.keys(first.release.policy ?? {})).toEqual(["interruptible"]);
    expect(first.acquire.telemetry).toEqual(acquireTelemetry);
    expect(first.release.telemetry).toEqual(releaseTelemetry);
    expectRecursivelyFrozenPublicData(first);
    expectRecursivelyFrozenPublicData(second);
    expect(Object.isFrozen(firstWitness)).toBe(true);
    expect(Object.isFrozen(secondWitness)).toBe(true);

    expect(Object.isFrozen(policy)).toBe(false);
    expect(Object.isFrozen(acquirePolicy)).toBe(false);
    expect(Object.isFrozen(acquireRetry)).toBe(false);
    expect(Object.isFrozen(acquireTimeout)).toBe(false);
    expect(Object.isFrozen(telemetry)).toBe(false);
    expect(Object.isFrozen(acquireTelemetry)).toBe(false);
    acquireRetry.times = 99;
    acquirePolicy.interruptible = false;
    acquireTelemetry.attempt = 99;
    expect(first.acquire.policy?.retry?.times).toBe(2);
    expect(first.acquire.policy?.interruptible).toBe(true);
    expect(first.acquire.telemetry?.attempt).toBe(1);
    expect(acquireBodyTouches).toBe(0);
    expect(releaseBodyTouches).toBe(0);
    expect(releaseCalls).toBe(0);
  });
});

import { Effect as NativeEffect } from "effect";

import {
  Effect,
  type EffectExecutionPolicy,
  type HabitatTimeoutError,
  isHabitatEffect,
} from "../../../definition/src/index";

export function applyExecutionPolicy<A, E, R>(
  effect: NativeEffect.Effect<A, E, R>,
  policy: EffectExecutionPolicy | undefined
): NativeEffect.Effect<A, E | HabitatTimeoutError, R> {
  if (!isHabitatEffect(effect)) throw new TypeError("Execution requires a native Effect value.");
  let result: NativeEffect.Effect<A, E | HabitatTimeoutError, R> = effect;
  if (policy?.retry !== undefined) result = Effect.retry(result, policy.retry);
  if (policy?.timeout !== undefined) result = Effect.timeout(result, policy.timeout.duration);
  if (policy?.interruptible === false) return NativeEffect.uninterruptible(result);
  return policy?.interruptible === true ? NativeEffect.interruptible(result) : result;
}

import type { HabitatEffect } from "./effect";
import type { EffectExecutionPolicy } from "./execution";

export type LocalEffectProgram<A = unknown> =
  | HabitatEffect<A, unknown, unknown>
  | Generator<HabitatEffect<unknown, unknown, unknown>, A, unknown>;
export type LocalProgramOutput<P> =
  P extends HabitatEffect<infer A, unknown, unknown>
    ? A
    : P extends Generator<unknown, infer A, unknown>
      ? A
      : never;
type ProgramYield<P> =
  P extends HabitatEffect<unknown, unknown, unknown>
    ? P
    : P extends Generator<infer Y, unknown, unknown>
      ? Y
      : never;
export type LocalProgramError<P> = [ProgramYield<P>] extends [never]
  ? never
  : ProgramYield<P> extends HabitatEffect<unknown, infer E, unknown>
    ? E
    : never;
export type LocalProgramRequirements<P> = [ProgramYield<P>] extends [never]
  ? never
  : ProgramYield<P> extends HabitatEffect<unknown, unknown, infer R>
    ? R
    : never;

export function freezeLocalExecutionPolicy(
  policy: EffectExecutionPolicy = {}
): EffectExecutionPolicy {
  return Object.freeze({
    ...policy,
    ...(policy.retry === undefined ? {} : { retry: Object.freeze({ ...policy.retry }) }),
    ...(policy.timeout === undefined ? {} : { timeout: Object.freeze({ ...policy.timeout }) }),
  });
}

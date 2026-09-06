import { Effect, type HabitatEffect, isHabitatEffect } from "./effect";
import {
  attachExecutionProjection,
  type EffectExecutionDescriptor,
  type EffectExecutionPolicy,
} from "./execution";
import type { ProcedureExecutionContext } from "./execution-context";
import {
  freezeLocalExecutionPolicy,
  type LocalEffectProgram,
  type LocalProgramError,
  type LocalProgramOutput,
  type LocalProgramRequirements,
} from "./local-effect";
import type { RuntimeResourceMap } from "./provider";

export type WebEffectExecutionContext = ProcedureExecutionContext<
  Request,
  { readonly resources: RuntimeResourceMap }
>;

/** The route supplies occurrence identity; the body remains a cold reusable value. */
export interface WebEffectDescriptor<A extends Response = Response, E = unknown, R = unknown> {
  readonly kind: "web.effect";
  readonly policy: EffectExecutionPolicy;
  readonly effect: (
    context: WebEffectExecutionContext
  ) => HabitatEffect<A, E, R> | Generator<HabitatEffect<unknown, unknown, unknown>, A, unknown>;
}

export function defineWebEffect<P extends LocalEffectProgram<Response>>(input: {
  readonly policy?: EffectExecutionPolicy;
  readonly effect: (context: WebEffectExecutionContext) => P;
}): WebEffectDescriptor<LocalProgramOutput<P>, LocalProgramError<P>, LocalProgramRequirements<P>> {
  const { effect, policy } = input;
  if (typeof effect !== "function") throw new TypeError("A web Effect requires a body.");
  return Object.freeze({
    kind: "web.effect",
    policy: freezeLocalExecutionPolicy(policy),
    effect,
  }) as WebEffectDescriptor<
    LocalProgramOutput<P>,
    LocalProgramError<P>,
    LocalProgramRequirements<P>
  >;
}

/** Private derivation helper: construction does not invoke the retained body. */
export function lowerWebEffectDescriptor<A extends Response, E, R>(input: {
  readonly executionId: string;
  readonly path: string;
  readonly descriptor: WebEffectDescriptor<A, E, R>;
}): EffectExecutionDescriptor<Request, A, E, WebEffectExecutionContext["context"], R> {
  const { descriptor } = input;
  if (descriptor.kind !== "web.effect" || typeof descriptor.effect !== "function")
    throw new TypeError("A web route requires a cold web Effect descriptor.");
  const { effect, policy } = descriptor;
  return attachExecutionProjection(
    {
      kind: "execution.effect",
      executionId: input.executionId,
      boundary: "plugin.web-surface",
      policy,
      run(context: WebEffectExecutionContext): HabitatEffect<A, E, R> {
        return Effect.gen(function* () {
          const program = effect(context);
          if (isHabitatEffect(program)) return yield* program;
          return yield* Effect.gen(() => program);
        }) as HabitatEffect<A, E, R>;
      },
    },
    { kind: "web.route", path: input.path }
  );
}

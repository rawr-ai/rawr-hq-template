import type { HabitatDurationInput, HabitatEffect } from "./effect";
import type { EffectExecutionPolicy } from "./execution";
import type { BoundaryTelemetry, EffectBoundaryContext } from "./execution-context";
import {
  freezeLocalExecutionPolicy,
  type LocalEffectProgram,
  type LocalProgramError,
  type LocalProgramOutput,
  type LocalProgramRequirements,
} from "./local-effect";
import {
  assertNoPluginClassificationFields,
  definePlugin,
  type LanePluginInput,
  makePluginFactory,
  type PluginDefinition,
  type PluginFactory,
} from "./plugin";
import type { RuntimeResourceMap } from "./provider";
import type { ResourceRequirement } from "./resource";
import type { ServiceClients, ServiceUses } from "./service";

export interface DesktopBackgroundExecutionContext<U extends ServiceUses = Record<never, never>> {
  readonly clients: ServiceClients<U>;
  readonly resources: RuntimeResourceMap;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}
export interface DesktopBackgroundDescriptor<
  A = unknown,
  E = unknown,
  R = unknown,
  C = DesktopBackgroundExecutionContext,
> {
  readonly kind: "desktop.background";
  readonly id: string;
  readonly cadence: HabitatDurationInput;
  readonly policy: EffectExecutionPolicy;
  readonly effect: (
    context: C
  ) => HabitatEffect<A, E, R> | Generator<HabitatEffect<unknown, unknown, unknown>, A, unknown>;
}
export function defineDesktopBackground<
  C extends DesktopBackgroundExecutionContext,
  P extends LocalEffectProgram,
>(input: {
  readonly id: string;
  readonly cadence: HabitatDurationInput;
  readonly policy?: EffectExecutionPolicy;
  readonly effect: (context: C) => P;
}): DesktopBackgroundDescriptor<
  LocalProgramOutput<P>,
  LocalProgramError<P>,
  LocalProgramRequirements<P>,
  NoInfer<C>
> {
  return Object.freeze({
    kind: "desktop.background",
    id: input.id,
    cadence: input.cadence,
    policy: freezeLocalExecutionPolicy(input.policy),
    effect: input.effect,
  }) as DesktopBackgroundDescriptor<
    LocalProgramOutput<P>,
    LocalProgramError<P>,
    LocalProgramRequirements<P>,
    C
  >;
}
type CompatibleBackgrounds<
  U extends ServiceUses,
  T extends readonly DesktopBackgroundDescriptor<unknown, unknown, unknown, never>[],
> = {
  readonly [K in keyof T]: T[K] extends DesktopBackgroundDescriptor<
    unknown,
    unknown,
    unknown,
    infer C
  >
    ? [C] extends [never]
      ? T[K]
      : DesktopBackgroundExecutionContext<NoInfer<U>> extends C
        ? T[K]
        : never
    : never;
};
export type DesktopBackgroundPluginInput<
  K extends string = string,
  U extends ServiceUses = ServiceUses,
  T extends readonly DesktopBackgroundDescriptor<
    unknown,
    unknown,
    unknown,
    never
  >[] = readonly DesktopBackgroundDescriptor<unknown, unknown, unknown, never>[],
  Q extends readonly ResourceRequirement[] = readonly [],
> = LanePluginInput<K, U, Q> & { readonly backgrounds: T & CompatibleBackgrounds<U, T> };
export type DesktopBackgroundPluginDefinition<
  K extends string = string,
  U extends ServiceUses = ServiceUses,
  T extends readonly DesktopBackgroundDescriptor<
    unknown,
    unknown,
    unknown,
    never
  >[] = readonly DesktopBackgroundDescriptor<unknown, unknown, unknown, never>[],
  Q extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
> = PluginDefinition<"desktop", "desktop/background", K, U> & {
  readonly backgrounds: T;
  readonly resourceRequirements: Q;
};
export interface DesktopBackgroundPluginBuilder {
  factory<O = void>(): <
    const K extends string,
    const U extends ServiceUses,
    const T extends readonly DesktopBackgroundDescriptor<unknown, unknown, unknown, never>[],
    const Q extends readonly ResourceRequirement[] = readonly [],
  >(
    input: [O] extends [void]
      ? DesktopBackgroundPluginInput<K, U, T, Q>
      : (options: O) => DesktopBackgroundPluginInput<K, U, T, Q>
  ) => PluginFactory<O, DesktopBackgroundPluginDefinition<K, U, T, Q>>;
}
export const defineDesktopBackgroundPlugin: DesktopBackgroundPluginBuilder = Object.freeze({
  factory:
    () =>
    (input: DesktopBackgroundPluginInput | ((options: unknown) => DesktopBackgroundPluginInput)) =>
      makePluginFactory(input, (resolved) => {
        assertNoPluginClassificationFields(resolved);
        const backgrounds = Object.freeze([...resolved.backgrounds]);
        return Object.freeze({
          ...definePlugin({
            id: `desktop.background.${resolved.capability}`,
            role: "desktop",
            surface: "desktop/background",
            capability: resolved.capability,
            ...(resolved.instance === undefined ? {} : { instance: resolved.instance }),
            services: resolved.services,
            resourceRequirements: resolved.resourceRequirements ?? [],
            project: ({ pluginId }) =>
              Object.freeze({
                kind: "plugin.projection",
                facts: Object.freeze({
                  pluginId,
                  lane: "desktop/background",
                  definitions: Object.freeze(backgrounds.map((background) => background.id)),
                }),
              }),
          }),
          backgrounds,
        });
      }),
}) as DesktopBackgroundPluginBuilder;

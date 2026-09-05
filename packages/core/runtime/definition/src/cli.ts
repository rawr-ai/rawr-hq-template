import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { HabitatEffect } from "./effect";
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

export interface CommandExecutionContext<I, U extends ServiceUses = Record<never, never>> {
  readonly input: I;
  readonly clients: ServiceClients<U>;
  readonly resources: RuntimeResourceMap;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}

export interface CommandDescriptor<
  I = unknown,
  A = unknown,
  E = unknown,
  R = unknown,
  C = CommandExecutionContext<I>,
> {
  readonly kind: "cli.command";
  readonly id: string;
  readonly inputSchema: RuntimeSchema<I>;
  /** Exact native contribution; only its selected host interprets this value. */
  readonly source: unknown;
  readonly policy: EffectExecutionPolicy;
  readonly effect: (
    context: C
  ) => HabitatEffect<A, E, R> | Generator<HabitatEffect<unknown, unknown, unknown>, A, unknown>;
}

/** Cold command grammar; parsing, presentation and dispatch stay native host concerns. */
export function defineCommand<
  I,
  C extends CommandExecutionContext<I>,
  P extends LocalEffectProgram,
>(input: {
  readonly id: string;
  readonly input: RuntimeSchema<I>;
  readonly source: unknown;
  readonly policy?: EffectExecutionPolicy;
  readonly effect: (context: C) => P;
}): CommandDescriptor<
  I,
  LocalProgramOutput<P>,
  LocalProgramError<P>,
  LocalProgramRequirements<P>,
  NoInfer<C>
> {
  return Object.freeze({
    kind: "cli.command",
    id: input.id,
    inputSchema: input.input,
    source: input.source,
    policy: freezeLocalExecutionPolicy(input.policy),
    effect: input.effect,
  }) as CommandDescriptor<
    I,
    LocalProgramOutput<P>,
    LocalProgramError<P>,
    LocalProgramRequirements<P>,
    C
  >;
}

type AnyCommand = CommandDescriptor<unknown, unknown, unknown, unknown, never>;
type CompatibleCommands<U extends ServiceUses, T extends readonly AnyCommand[]> = {
  readonly [K in keyof T]: T[K] extends CommandDescriptor<
    infer I,
    unknown,
    unknown,
    unknown,
    infer C
  >
    ? [C] extends [never]
      ? T[K]
      : CommandExecutionContext<I, NoInfer<U>> extends C
        ? T[K]
        : never
    : never;
};

export type CliTopicPluginInput<
  K extends string = string,
  U extends ServiceUses = ServiceUses,
  T extends readonly AnyCommand[] = readonly AnyCommand[],
  Q extends readonly ResourceRequirement[] = readonly [],
> = LanePluginInput<K, U, Q> & { readonly commands: T & CompatibleCommands<U, T> };

export type CliTopicPluginDefinition<
  K extends string = string,
  U extends ServiceUses = ServiceUses,
  T extends readonly AnyCommand[] = readonly AnyCommand[],
  Q extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
> = PluginDefinition<"cli", "cli/commands", K, U> & {
  readonly commands: T;
  readonly resourceRequirements: Q;
};

export interface CliTopicPluginBuilder {
  factory<O = void>(): <
    const K extends string,
    const U extends ServiceUses,
    const T extends readonly AnyCommand[],
    const Q extends readonly ResourceRequirement[] = readonly [],
  >(
    input: [O] extends [void]
      ? CliTopicPluginInput<K, U, T, Q>
      : (options: O) => CliTopicPluginInput<K, U, T, Q>
  ) => PluginFactory<O, CliTopicPluginDefinition<K, U, T, Q>>;
}

export const defineCliTopicPlugin: CliTopicPluginBuilder = Object.freeze({
  factory: () => (input: CliTopicPluginInput | ((options: unknown) => CliTopicPluginInput)) =>
    makePluginFactory(input, (resolved) => {
      assertNoPluginClassificationFields(resolved);
      const commands = Object.freeze([...resolved.commands]);
      return Object.freeze({
        ...definePlugin({
          id: `cli.topic.${resolved.capability}`,
          role: "cli",
          surface: "cli/commands",
          capability: resolved.capability,
          ...(resolved.instance === undefined ? {} : { instance: resolved.instance }),
          services: resolved.services,
          resourceRequirements: resolved.resourceRequirements ?? [],
          project: ({ pluginId }) =>
            Object.freeze({
              kind: "plugin.projection",
              facts: Object.freeze({
                pluginId,
                lane: "cli/commands",
                definitions: Object.freeze(commands.map((command) => command.id)),
              }),
            }),
        }),
        commands,
      });
    }),
}) as CliTopicPluginBuilder;

import type { Static, TSchema } from "typebox";
import { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { HabitatEffect } from "./effect";
import type { EffectExecutionPolicy } from "./execution";
import type { BoundaryTelemetry, EffectBoundaryContext } from "./execution-context";
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

export type LocalEffectProgram =
  | HabitatEffect<unknown, unknown, unknown>
  | Generator<HabitatEffect<unknown, unknown, unknown>, unknown, unknown>;
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

export interface ToolExecutionContext<I, U extends ServiceUses = Record<never, never>> {
  readonly input: I;
  readonly clients: ServiceClients<U>;
  readonly resources: RuntimeResourceMap;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}

export interface ToolDescriptor<
  I = unknown,
  A = unknown,
  E = unknown,
  R = unknown,
  C = ToolExecutionContext<I>,
> {
  readonly kind: "agent.tool";
  readonly id: string;
  readonly description: string;
  readonly inputSchema: RuntimeSchema<I>;
  readonly policy: EffectExecutionPolicy;
  readonly effect: (
    context: C
  ) => HabitatEffect<A, E, R> | Generator<HabitatEffect<unknown, unknown, unknown>, A, unknown>;
}

export function freezeLocalExecutionPolicy(
  policy: EffectExecutionPolicy = {}
): EffectExecutionPolicy {
  return Object.freeze({
    ...policy,
    ...(policy.retry === undefined ? {} : { retry: Object.freeze({ ...policy.retry }) }),
    ...(policy.timeout === undefined ? {} : { timeout: Object.freeze({ ...policy.timeout }) }),
  });
}

export function defineTool<
  const S extends TSchema,
  C extends ToolExecutionContext<Static<S>>,
  P extends LocalEffectProgram,
>(input: {
  readonly id: string;
  readonly description: string;
  readonly input: S;
  readonly policy?: EffectExecutionPolicy;
  readonly effect: (context: C) => P;
}): ToolDescriptor<
  Static<S>,
  LocalProgramOutput<P>,
  LocalProgramError<P>,
  LocalProgramRequirements<P>,
  NoInfer<C>
> {
  return Object.freeze({
    kind: "agent.tool",
    id: input.id,
    description: input.description,
    inputSchema: RuntimeSchema.fromTypeBox(input.input),
    policy: freezeLocalExecutionPolicy(input.policy),
    effect: input.effect,
  }) as ToolDescriptor<
    Static<S>,
    LocalProgramOutput<P>,
    LocalProgramError<P>,
    LocalProgramRequirements<P>,
    C
  >;
}

type CompatibleTools<
  U extends ServiceUses,
  T extends readonly ToolDescriptor<unknown, unknown, unknown, unknown, never>[],
> = {
  readonly [K in keyof T]: T[K] extends ToolDescriptor<infer I, unknown, unknown, unknown, infer C>
    ? [C] extends [never]
      ? T[K]
      : ToolExecutionContext<I, NoInfer<U>> extends C
        ? T[K]
        : never
    : never;
};

export type AgentToolPluginInput<
  K extends string = string,
  U extends ServiceUses = ServiceUses,
  T extends readonly ToolDescriptor<
    unknown,
    unknown,
    unknown,
    unknown,
    never
  >[] = readonly ToolDescriptor<unknown, unknown, unknown, unknown, never>[],
  Q extends readonly ResourceRequirement[] = readonly [],
> = LanePluginInput<K, U, Q> & { readonly tools: T & CompatibleTools<U, T> };
export type AgentToolPluginDefinition<
  K extends string = string,
  U extends ServiceUses = ServiceUses,
  T extends readonly ToolDescriptor<
    unknown,
    unknown,
    unknown,
    unknown,
    never
  >[] = readonly ToolDescriptor<unknown, unknown, unknown, unknown, never>[],
  Q extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
> = PluginDefinition<"agent", "agent/tools", K, U> & {
  readonly tools: T;
  readonly resourceRequirements: Q;
};

export interface AgentToolPluginBuilder {
  factory<O = void>(): <
    const K extends string,
    const U extends ServiceUses,
    const T extends readonly ToolDescriptor<unknown, unknown, unknown, unknown, never>[],
    const Q extends readonly ResourceRequirement[] = readonly [],
  >(
    input: [O] extends [void]
      ? AgentToolPluginInput<K, U, T, Q>
      : (options: O) => AgentToolPluginInput<K, U, T, Q>
  ) => PluginFactory<O, AgentToolPluginDefinition<K, U, T, Q>>;
}

export const defineAgentToolPlugin: AgentToolPluginBuilder = Object.freeze({
  factory: () => (input: AgentToolPluginInput | ((options: unknown) => AgentToolPluginInput)) =>
    makePluginFactory(input, (resolved) => {
      assertNoPluginClassificationFields(resolved);
      const tools = Object.freeze([...resolved.tools]);
      return Object.freeze({
        ...definePlugin({
          id: `agent.tools.${resolved.capability}`,
          role: "agent",
          surface: "agent/tools",
          capability: resolved.capability,
          ...(resolved.instance === undefined ? {} : { instance: resolved.instance }),
          services: resolved.services,
          resourceRequirements: resolved.resourceRequirements ?? [],
          project: ({ pluginId }) =>
            Object.freeze({
              kind: "plugin.projection",
              facts: Object.freeze({
                pluginId,
                lane: "agent/tools",
                definitions: Object.freeze(tools.map((tool) => tool.id)),
              }),
            }),
        }),
        tools,
      });
    }),
}) as AgentToolPluginBuilder;

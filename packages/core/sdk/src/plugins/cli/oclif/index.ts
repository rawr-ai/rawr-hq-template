import type { Command, Interfaces } from "@oclif/core";
import { Type } from "typebox";
import { RuntimeSchema, type RuntimeSchemaContract } from "../../../runtime/schema";
import type { ServiceUses } from "../../../service/index";
import {
  type CommandExecutionContext,
  defineCommand,
  type LocalEffectProgram,
  type LocalProgramOutput,
} from "../effect/index";

const sourceIdentity = Symbol("habitat.oclif-command-source");

export interface OclifParsedInput<
  A extends Interfaces.ArgInput = Interfaces.ArgInput,
  F extends Interfaces.FlagInput = Interfaces.FlagInput,
> {
  readonly args: Interfaces.InferredArgs<A>;
  readonly flags: Interfaces.InferredFlags<F>;
}

export type OclifCommandContext<
  A extends Interfaces.ArgInput = Interfaces.ArgInput,
  F extends Interfaces.FlagInput = Interfaces.FlagInput,
  U extends ServiceUses = Record<never, never>,
> = Omit<CommandExecutionContext<OclifParsedInput<A, F>, U>, "input"> & OclifParsedInput<A, F>;

type NativeMetadata = Pick<
  typeof Command,
  | "aliases"
  | "description"
  | "examples"
  | "hidden"
  | "hiddenAliases"
  | "strict"
  | "summary"
  | "usage"
>;

export interface OclifCommandSource {
  readonly [sourceIdentity]: true;
  readonly args: Interfaces.ArgInput;
  readonly flags: Interfaces.FlagInput;
  readonly metadata: Readonly<Partial<NativeMetadata>>;
  present(value: unknown, command: Command): void | Promise<void>;
}

const parsedInputShape = RuntimeSchema.fromTypeBox(
  Type.Object(
    {
      args: Type.Record(Type.String(), Type.Unknown()),
      flags: Type.Record(Type.String(), Type.Unknown()),
    },
    { additionalProperties: false }
  )
);

/** Native Oclif parsing supplies the value types; this schema admits only its result envelope. */
function parsedInputSchema<A extends Interfaces.ArgInput, F extends Interfaces.FlagInput>() {
  return parsedInputShape as RuntimeSchemaContract<OclifParsedInput<A, F>>;
}

/** One topic-owned Effect body with its native parser definitions and presentation. */
export function createOclifCommand<
  const A extends Interfaces.ArgInput,
  const F extends Interfaces.FlagInput,
  C extends object,
  P extends LocalEffectProgram,
>(
  input: Partial<NativeMetadata> & {
    readonly id: string;
    readonly args: A;
    readonly flags: F;
    readonly policy?: Parameters<typeof defineCommand>[0]["policy"];
    readonly effect: (
      context: Omit<OclifCommandContext<A, F>, "clients"> & { readonly clients: C }
    ) => P;
    readonly present?: (value: LocalProgramOutput<P>, command: Command) => void | Promise<void>;
  }
) {
  const metadata: Partial<NativeMetadata> = {};
  for (const key of [
    "aliases",
    "description",
    "examples",
    "hidden",
    "hiddenAliases",
    "strict",
    "summary",
    "usage",
  ] as const) {
    if (input[key] !== undefined)
      Object.defineProperty(metadata, key, { value: input[key], enumerable: true });
  }
  const present = input.present;
  const source: OclifCommandSource = Object.freeze({
    [sourceIdentity]: true as const,
    args: input.args,
    flags: input.flags,
    metadata: Object.freeze(metadata),
    present(value: unknown, command: Command) {
      // The mounted full ref and exact source pair retain this program's success type.
      return present?.(value as LocalProgramOutput<P>, command);
    },
  });
  type Context = Omit<CommandExecutionContext<OclifParsedInput<A, F>>, "clients"> & {
    readonly clients: C;
  };
  return defineCommand({
    id: input.id,
    input: parsedInputSchema<A, F>(),
    source,
    ...(input.policy === undefined ? {} : { policy: input.policy }),
    effect(context: Context): P {
      const parsed = context.input;
      return input.effect({
        args: parsed.args,
        flags: parsed.flags,
        clients: context.clients,
        resources: context.resources,
        telemetry: context.telemetry,
        execution: context.execution,
      });
    },
  });
}

export function readOclifCommandSource(value: unknown): OclifCommandSource {
  if (
    typeof value !== "object" ||
    value === null ||
    !(sourceIdentity in value) ||
    value[sourceIdentity] !== true
  ) {
    throw new TypeError("CLI discovery requires a native Oclif command source.");
  }
  return value as OclifCommandSource;
}

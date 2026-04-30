import type { EffectBody } from "../../effect";
import type { EffectBoundaryContext, RuntimeResourceAccess } from "../../execution";

export interface CliCommandInput<TArgs = unknown, TFlags = unknown> {
  readonly id: string;
  readonly args?: TArgs;
  readonly flags?: TFlags;
}

export interface CliCommandExecutionContext<TArgs = unknown, TFlags = unknown> {
  readonly args: TArgs;
  readonly flags: TFlags;
  readonly resources: RuntimeResourceAccess;
  readonly execution: EffectBoundaryContext;
}

export interface CliCommandEffectDescriptor<
  TArgs = unknown,
  TFlags = unknown,
  TOutput = unknown,
  TError = never,
> {
  readonly kind: "cli.command-effect";
  readonly commandId: string;
  readonly effect: EffectBody<CliCommandExecutionContext<TArgs, TFlags>, TOutput, TError>;
}

export interface CliCommandBuilder<TArgs = unknown, TFlags = unknown> {
  effect<TOutput, TError = never>(
    fn: EffectBody<CliCommandExecutionContext<TArgs, TFlags>, TOutput, TError>,
  ): CliCommandEffectDescriptor<TArgs, TFlags, TOutput, TError>;
}

export function defineCommand<TArgs = unknown, TFlags = unknown>(
  input: CliCommandInput<TArgs, TFlags>,
): CliCommandInput<TArgs, TFlags> & CliCommandBuilder<TArgs, TFlags> {
  return {
    ...input,
    effect(fn) {
      return {
        kind: "cli.command-effect",
        commandId: input.id,
        effect: fn,
      };
    },
  };
}

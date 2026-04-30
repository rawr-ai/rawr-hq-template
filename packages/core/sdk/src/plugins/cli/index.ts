export interface CliCommandPluginInput {
  readonly capability: string;
  readonly commands: readonly unknown[];
}

export interface CliCommandPluginDefinition {
  readonly kind: "plugin.cli-command";
  readonly capability: string;
  readonly id: string;
  readonly commands: readonly unknown[];
  readonly importSafety: "cold-declaration";
}

export interface CliCommandPluginBuilder {
  <const TInput extends CliCommandPluginInput>(input: TInput): CliCommandPluginDefinition;
  factory(): <const TInput extends CliCommandPluginInput>(input: TInput) => CliCommandPluginDefinition;
}

const builder = ((input: CliCommandPluginInput) => ({
  kind: "plugin.cli-command",
  capability: input.capability,
  id: `cli.command.${input.capability}`,
  commands: input.commands,
  importSafety: "cold-declaration",
})) as CliCommandPluginBuilder;

builder.factory = () => builder;

export const defineCliCommandPlugin = builder;

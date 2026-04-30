export interface WebAppPluginInput {
  readonly capability: string;
  readonly routes?: readonly unknown[];
  readonly assets?: readonly unknown[];
}

export interface WebAppPluginDefinition {
  readonly kind: "plugin.web-app";
  readonly capability: string;
  readonly id: string;
  readonly routes: readonly unknown[];
  readonly assets: readonly unknown[];
  readonly importSafety: "cold-declaration";
}

export interface WebAppPluginBuilder {
  <const TInput extends WebAppPluginInput>(input: TInput): WebAppPluginDefinition;
  factory(): <const TInput extends WebAppPluginInput>(input: TInput) => WebAppPluginDefinition;
}

const builder = ((input: WebAppPluginInput) => ({
  kind: "plugin.web-app",
  capability: input.capability,
  id: `web.app.${input.capability}`,
  routes: input.routes ?? [],
  assets: input.assets ?? [],
  importSafety: "cold-declaration",
})) as WebAppPluginBuilder;

builder.factory = () => builder;

export const defineWebAppPlugin = builder;

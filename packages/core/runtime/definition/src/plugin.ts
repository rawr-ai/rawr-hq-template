import type { AppRole } from "./app";
import type { ResourceRequirement } from "./resource";
import type { ServiceUse } from "./service";

export interface PluginProjectionInput {
  readonly pluginId: string;
}

export interface PluginProjection {
  readonly kind: "plugin.projection";
  readonly facts: Readonly<Record<string, unknown>>;
}

export type PluginProjectionFunction = (input: PluginProjectionInput) => PluginProjection;

export type PluginFactoryArgs<TOptions> = [TOptions] extends [void] ? [] : [options: TOptions];

export interface PluginFactory<
  TOptions = void,
  TDefinition extends PluginDefinition = PluginDefinition,
> {
  (...args: PluginFactoryArgs<TOptions>): TDefinition;
}

export interface PluginDefinition<
  TRole extends AppRole = AppRole,
  TSurface extends string = string,
  TCapability extends string = string,
> {
  readonly kind: "plugin.definition";
  readonly id: string;
  readonly role: TRole;
  readonly surface: TSurface;
  readonly capability: TCapability;
  readonly instance?: string;
  readonly serviceUses: readonly ServiceUse[];
  readonly resourceRequirements: readonly ResourceRequirement[];
  readonly project: PluginProjectionFunction;
}

export function definePlugin<
  const TRole extends AppRole,
  const TSurface extends string,
  const TCapability extends string,
>(
  input: Omit<PluginDefinition<TRole, TSurface, TCapability>, "kind">
): PluginDefinition<TRole, TSurface, TCapability> {
  return Object.freeze({
    ...input,
    kind: "plugin.definition",
    serviceUses: Object.freeze([...input.serviceUses]),
    resourceRequirements: Object.freeze([...input.resourceRequirements]),
  });
}

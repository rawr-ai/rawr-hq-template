import type { PluginDefinition } from "./plugin";
import type { ProviderSelection } from "./profile";

export type AppRole = "server" | "async" | "cli" | "web" | "agent" | "desktop";

export interface AppDefinition<
  TId extends string = string,
  TPlugins extends readonly PluginDefinition[] = readonly PluginDefinition[],
> {
  readonly kind: "app.definition";
  readonly id: TId;
  readonly plugins: TPlugins;
}

export function defineApp<
  const TId extends string,
  const TPlugins extends readonly PluginDefinition[],
>(input: { readonly id: TId; readonly plugins: TPlugins }): AppDefinition<TId, TPlugins> {
  return Object.freeze({
    kind: "app.definition",
    id: input.id,
    plugins: Object.freeze([...input.plugins]) as unknown as TPlugins,
  });
}

export interface ProcessDefinition<
  TId extends string = string,
  TRoles extends readonly AppRole[] = readonly AppRole[],
> {
  readonly id: TId;
  readonly roles: TRoles;
  readonly harness?: string;
}

export type ProcessCatalog<
  TProcesses extends Readonly<Record<string, ProcessDefinition>> = Readonly<
    Record<string, ProcessDefinition>
  >,
> = Readonly<TProcesses>;

type ProcessInput = Readonly<{
  id: string;
  roles: readonly AppRole[];
  harness?: string;
}>;

type ProcessCatalogInput = Readonly<Record<string, ProcessInput>>;

type DefinedProcessCatalog<TInput extends ProcessCatalogInput> = Readonly<{
  [TKey in keyof TInput]: ProcessDefinition<TInput[TKey]["id"], TInput[TKey]["roles"]>;
}>;

export function defineProcessCatalog<const TInput extends ProcessCatalogInput>(
  input: TInput
): DefinedProcessCatalog<TInput> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(input).map(([name, process]) => [
        name,
        Object.freeze({
          id: process.id,
          roles: Object.freeze([...process.roles]),
          ...(process.harness === undefined ? {} : { harness: process.harness }),
        }),
      ])
    )
  ) as DefinedProcessCatalog<TInput>;
}

export type RuntimeConfigSource =
  | { readonly kind: "env"; readonly prefix?: string }
  | { readonly kind: "file"; readonly path: string; readonly optional?: boolean };

export interface RuntimeProfile<
  TId extends string = string,
  TProviders extends readonly ProviderSelection[] = readonly ProviderSelection[],
> {
  readonly kind: "runtime.profile";
  readonly id: TId;
  readonly providers: TProviders;
  readonly configSources: readonly RuntimeConfigSource[];
  readonly processDefaults?: Readonly<Record<string, unknown>>;
}

export function defineRuntimeProfile<
  const TId extends string,
  const TProviders extends readonly ProviderSelection[],
>(input: {
  readonly id: TId;
  readonly providers: TProviders;
  readonly configSources?: readonly RuntimeConfigSource[];
  readonly processDefaults?: Readonly<Record<string, unknown>>;
}): RuntimeProfile<TId, TProviders> {
  return Object.freeze({
    kind: "runtime.profile",
    id: input.id,
    providers: Object.freeze([...input.providers]) as unknown as TProviders,
    configSources: Object.freeze([...(input.configSources ?? [])]),
    ...(input.processDefaults === undefined
      ? {}
      : { processDefaults: Object.freeze({ ...input.processDefaults }) }),
  });
}

export interface RuntimeLaunchIdentity {
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly deploymentId: string;
  readonly sourceRevision: string;
}

export function runtimeLaunchIdentity(input: RuntimeLaunchIdentity): RuntimeLaunchIdentity {
  return Object.freeze({ ...input });
}

export interface Entrypoint<
  TApp extends AppDefinition = AppDefinition,
  TProfile extends RuntimeProfile = RuntimeProfile,
  TProcess extends ProcessDefinition = ProcessDefinition,
> {
  readonly kind: "app.entrypoint";
  readonly id: string;
  readonly app: TApp;
  readonly profile: TProfile;
  readonly process: TProcess;
  readonly identity: RuntimeLaunchIdentity;
}

export function defineEntrypoint<
  const TApp extends AppDefinition,
  const TProfile extends RuntimeProfile,
  const TProcess extends ProcessDefinition,
>(
  input: Omit<Entrypoint<TApp, TProfile, TProcess>, "kind" | "identity"> & {
    readonly identity: RuntimeLaunchIdentity;
  }
): Entrypoint<TApp, TProfile, TProcess> {
  return Object.freeze({
    kind: "app.entrypoint",
    ...input,
    identity: runtimeLaunchIdentity(input.identity),
  });
}

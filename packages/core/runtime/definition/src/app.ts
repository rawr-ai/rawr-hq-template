import type { PluginDefinition } from "./plugin";
import type { RuntimeProfile } from "./profile";
import type { ResourceRequirement } from "./resource";

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
  readonly resourceRequirements?: readonly ResourceRequirement[];
}

export type ProcessCatalog<
  TProcesses extends Readonly<Record<string, ProcessDefinition>> = Readonly<
    Record<string, ProcessDefinition>
  >,
> = Readonly<TProcesses>;

type ProcessCatalogInput = Readonly<
  Record<
    string,
    Readonly<{
      id: string;
      roles: readonly AppRole[];
      harness?: string;
      resourceRequirements?: readonly ResourceRequirement[];
    }>
  >
>;

type DefinedProcessCatalog<TInput extends ProcessCatalogInput> = Readonly<{
  [TKey in keyof TInput]: ProcessDefinition<TInput[TKey]["id"], TInput[TKey]["roles"]> & {
    readonly resourceRequirements: readonly ResourceRequirement[];
  };
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
          resourceRequirements: Object.freeze([...(process.resourceRequirements ?? [])]),
          ...(process.harness === undefined ? {} : { harness: process.harness }),
        }),
      ])
    )
  ) as DefinedProcessCatalog<TInput>;
}

export interface RuntimeLaunchIdentity {
  readonly app: string;
  readonly process: string;
  readonly entrypoint: string;
  readonly deployment: string;
  readonly source: string;
}

export function runtimeLaunchIdentity(input: RuntimeLaunchIdentity): RuntimeLaunchIdentity {
  return Object.freeze({
    app: input.app,
    process: input.process,
    entrypoint: input.entrypoint,
    deployment: input.deployment,
    source: input.source,
  });
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
  if (
    input.identity.app !== input.app.id ||
    input.identity.process !== input.process.id ||
    input.identity.entrypoint !== input.id
  ) {
    throw new TypeError("Entrypoint selection does not agree with launch identity.");
  }

  return Object.freeze({
    kind: "app.entrypoint",
    ...input,
    identity: runtimeLaunchIdentity(input.identity),
  });
}

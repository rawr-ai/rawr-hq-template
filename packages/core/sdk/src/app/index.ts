import type { RuntimeProfile } from "../runtime/profiles";
import type { AppRole } from "../runtime/resources";

export interface AppDefinition<
  TId extends string = string,
  TPlugins extends readonly unknown[] = readonly unknown[],
> {
  readonly kind: "rawr.app";
  readonly id: TId;
  readonly plugins: TPlugins;
  readonly profiles?: readonly RuntimeProfile[];
}

export interface StartAppOptions<TProfile extends RuntimeProfile = RuntimeProfile> {
  readonly entrypointId: string;
  readonly profile: TProfile;
  readonly roles: readonly AppRole[];
  readonly processId?: string;
}

export interface StartedApp<
  TApp extends AppDefinition = AppDefinition,
  TOptions extends StartAppOptions = StartAppOptions,
> {
  readonly kind: "started-app";
  readonly app: TApp;
  readonly options: TOptions;
  stop(): Promise<void>;
}

export function defineApp<
  const TId extends string,
  const TPlugins extends readonly unknown[],
>(input: {
  readonly id: TId;
  readonly plugins: TPlugins;
  readonly profiles?: readonly RuntimeProfile[];
}): AppDefinition<TId, TPlugins> {
  return {
    kind: "rawr.app",
    id: input.id,
    plugins: input.plugins,
    profiles: input.profiles,
  };
}

export async function startApp<
  const TApp extends AppDefinition,
  const TOptions extends StartAppOptions,
>(
  app: TApp,
  options: TOptions,
): Promise<StartedApp<TApp, TOptions>> {
  return {
    kind: "started-app",
    app,
    options,
    async stop() {},
  };
}

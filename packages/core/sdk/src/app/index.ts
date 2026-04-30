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
  readonly start?: (context: AppStartContext<TProfile>) => unknown | Promise<unknown>;
  readonly stop?: (
    value: unknown,
    context: AppStartContext<TProfile>,
  ) => void | Promise<void>;
}

export interface AppStartContext<TProfile extends RuntimeProfile = RuntimeProfile> {
  readonly app: AppDefinition;
  readonly entrypointId: string;
  readonly profile: TProfile;
  readonly roles: readonly AppRole[];
  readonly processId?: string;
}

export interface StartedApp<
  TApp extends AppDefinition = AppDefinition,
  TOptions = StartAppOptions,
  TValue = unknown,
> {
  readonly kind: "started-app";
  readonly app: TApp;
  readonly options: TOptions;
  readonly value: TValue | undefined;
  stop(): Promise<void>;
}

type StartedAppValue<TOptions> =
  TOptions extends { readonly start: (...args: readonly any[]) => infer TValue }
    ? Awaited<TValue>
    : undefined;

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
  const TProfile extends RuntimeProfile,
  const TOptions extends StartAppOptions<TProfile>,
>(
  app: TApp,
  options: TOptions,
): Promise<StartedApp<TApp, TOptions, StartedAppValue<TOptions>>> {
  if (options.roles.length === 0) {
    throw new Error(`startApp(${options.entrypointId}) requires at least one role`);
  }
  const context: AppStartContext<TProfile> = {
    app,
    entrypointId: options.entrypointId,
    profile: options.profile,
    roles: options.roles,
    processId: options.processId,
  };
  let started = false;
  const value = options.start
    ? ((await options.start(context)) as StartedAppValue<TOptions>)
    : (undefined as StartedAppValue<TOptions>);
  started = options.start !== undefined;
  return {
    kind: "started-app",
    app,
    options,
    value,
    async stop() {
      if (!started) return;
      started = false;
      await options.stop?.(value, context);
    },
  };
}

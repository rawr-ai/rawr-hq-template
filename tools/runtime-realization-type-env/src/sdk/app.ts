import type { RuntimeProfile } from "./runtime/profiles";

export interface RawrAppDefinition {
  readonly kind: "rawr.app";
  readonly id: string;
  readonly profile: RuntimeProfile;
  readonly plugins: readonly unknown[];
}

export function defineApp<const TApp extends RawrAppDefinition>(app: TApp): TApp {
  return app;
}

export function startApp<const TApp extends RawrAppDefinition>(app: TApp): {
  readonly kind: "started-app";
  readonly app: TApp;
} {
  return {
    kind: "started-app",
    app,
  };
}

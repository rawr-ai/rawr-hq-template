export type RuntimeConfigSource =
  | { readonly kind: "env"; readonly prefix?: string }
  | {
      readonly kind: "dotenv";
      readonly path?: string;
      readonly optional?: boolean;
    }
  | {
      readonly kind: "file";
      readonly path: string;
      readonly optional?: boolean;
    }
  | { readonly kind: "memory" }
  | { readonly kind: "test" };

export interface RuntimeProfile<
  TId extends string = string,
  TProviders extends readonly unknown[] = readonly unknown[],
> {
  readonly kind: "runtime.profile";
  readonly id: TId;
  readonly providers: TProviders;
  readonly configSources: readonly RuntimeConfigSource[];
  readonly processDefaults?: Readonly<Record<string, unknown>>;
  readonly harnesses?: readonly string[];
}

export function defineRuntimeProfile<
  const TId extends string,
  const TProviders extends readonly unknown[],
>(input: {
  readonly id: TId;
  readonly providers: TProviders;
  readonly configSources?: readonly RuntimeConfigSource[];
  readonly processDefaults?: Readonly<Record<string, unknown>>;
  readonly harnesses?: readonly string[];
}): RuntimeProfile<TId, TProviders> {
  return Object.freeze({
    kind: "runtime.profile",
    id: input.id,
    providers: Object.freeze([...input.providers]) as unknown as TProviders,
    configSources: Object.freeze(
      (input.configSources ?? []).map((source) => Object.freeze({ ...source }))
    ),
    ...(input.processDefaults === undefined
      ? {}
      : { processDefaults: Object.freeze({ ...input.processDefaults }) }),
    ...(input.harnesses === undefined ? {} : { harnesses: Object.freeze([...input.harnesses]) }),
  });
}

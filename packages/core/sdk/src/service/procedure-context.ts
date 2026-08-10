type KeysOfUnion<T> = T extends unknown ? keyof T : never;

/** Stable service context supplied at the runtime boundary. */
export interface ServiceBoundaryContext<TDeps, TScope, TConfig, TInvocation, TProvided> {
  readonly deps: TDeps;
  readonly scope: TScope;
  readonly config: TConfig;
  readonly invocation: TInvocation;
  readonly provided: TProvided;
}

type ServiceBoundaryLane = keyof ServiceBoundaryContext<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;

/** A service-internal module projection disjoint from every boundary-owned lane. */
export type ServiceModuleContextProjection<TProjection extends object> =
  Extract<ServiceBoundaryLane, KeysOfUnion<TProjection>> extends never ? TProjection : never;

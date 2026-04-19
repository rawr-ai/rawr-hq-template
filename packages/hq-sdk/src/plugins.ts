/**
 * @fileoverview Pre-Effect service binding seam for plugin and app projections.
 *
 * @remarks
 * Projections own concrete process resources today, but the service boundary
 * shape must already match the future runtime subsystem: process/role binding
 * produces construction-time `{ deps, scope, config }` only. Per-call
 * invocation remains on the oRPC client call surface, and service middleware
 * owns `provided`.
 */

export type ProcessView = Readonly<{
  /**
   * Stable process-side identity for this binding context.
   *
   * Examples: `plugin-session-tools`, `plugin-plugins`, `server`.
   */
  processId: string;
  workspaceRef?: string;
  repoRoot?: string;
}>;

export type RoleView = Readonly<{
  /**
   * Stable role/capability identity inside the process.
   *
   * Examples: `session-intelligence`, `agent-config-sync`, `hq-ops`.
   */
  roleId: string;
  capability?: string;
}>;

export type ServiceBoundary = Readonly<{
  deps: object;
  scope: object;
  config: object;
}>;

export type ServiceBindingContext<
  TProcess extends ProcessView = ProcessView,
  TRole extends RoleView = RoleView,
> = Readonly<{
  process: TProcess;
  role: TRole;
}>;

type BindingValue<TValue, TContext> = TValue | ((context: TContext) => TValue);

export type ServiceBinding<
  TBoundary extends ServiceBoundary,
  TProcess extends ProcessView = ProcessView,
  TRole extends RoleView = RoleView,
> = Readonly<{
  /**
   * Human-stable identity for diagnostics and explicit memoization keys.
   */
  bindingId: string;
  deps: BindingValue<TBoundary["deps"], ServiceBindingContext<TProcess, TRole>>;
  scope: BindingValue<TBoundary["scope"], ServiceBindingContext<TProcess, TRole>>;
  config: BindingValue<TBoundary["config"], ServiceBindingContext<TProcess, TRole>>;
  /**
   * Return a key when the projection wants a process/role scoped client cache.
   * Returning `null` or `undefined` creates a fresh client for the call.
   */
  cacheKey?: (context: ServiceBindingContext<TProcess, TRole>) => string | null | undefined;
}>;

export type BoundService<
  TClient,
  TProcess extends ProcessView = ProcessView,
  TRole extends RoleView = RoleView,
> = Readonly<{
  resolve(context: ServiceBindingContext<TProcess, TRole>): TClient;
}>;

/**
 * Bind a service package client factory to a projection-owned resource plan.
 *
 * @remarks
 * This is intentionally a narrow seam. It hides only the lowering from
 * process/role context to service construction bags; it does not hide oRPC
 * procedure invocation options or seed service execution-time providers.
 */
export function bindService<
  TBoundary extends ServiceBoundary,
  TClient,
  TProcess extends ProcessView = ProcessView,
  TRole extends RoleView = RoleView,
>(
  createClient: (boundary: TBoundary) => TClient,
  binding: ServiceBinding<TBoundary, TProcess, TRole>,
): BoundService<TClient, TProcess, TRole> {
  const clientsByKey = new Map<string, TClient>();

  return {
    resolve(context) {
      const key = binding.cacheKey?.(context);
      if (key) {
        const existing = clientsByKey.get(key);
        if (existing) return existing;
      }

      const boundary = {
        deps: resolveBindingValue(binding.deps, context),
        scope: resolveBindingValue(binding.scope, context),
        config: resolveBindingValue(binding.config, context),
      } as TBoundary;
      const client = createClient(boundary);

      if (key) clientsByKey.set(key, client);
      return client;
    },
  };
}

function resolveBindingValue<TValue, TContext>(
  value: BindingValue<TValue, TContext>,
  context: TContext,
): TValue {
  return typeof value === "function" ? (value as (context: TContext) => TValue)(context) : value;
}
